import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

import {
  generateDataTable,
  generateReport,
  generateSlideDeck,
  generateInfographic,
  generateInfographicImages,
  isGeminiConfigured,
} from '@/lib/gemini';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function verifyAccess(request: NextRequest, notebookId: string) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;

  const token = authHeader.replace('Bearer ', '');
  const {
    data: { user },
  } = await supabase.auth.getUser(token);

  if (!user) return null;

  const { data: notebook } = await supabase
    .from('notebooks')
    .select('id')
    .eq('id', notebookId)
    .eq('user_id', user.id)
    .single();

  if (!notebook) return null;

  return user;
}

async function getSourceContent(notebookId: string, sourceIds?: string[]) {
  let query = supabase
    .from('sources')
    .select('*')
    .eq('notebook_id', notebookId)
    .eq('status', 'ready');

  if (sourceIds && sourceIds.length > 0) {
    query = query.in('id', sourceIds);
  }

  const { data: sources } = await query;

  if (!sources || sources.length === 0) {
    return { content: '', sources: [] };
  }

  // Combine all source content
  const content = sources
    .map((s) => {
      const parts: string[] = [];

      // Add source name as header
      parts.push(`## ${s.name}`);

      // Add text content if available
      if (s.type === 'text' && s.metadata?.content) {
        parts.push(s.metadata.content);
      }

      // Add source guide summary if available
      if (s.source_guide?.summary) {
        parts.push(`Summary: ${s.source_guide.summary}`);
      }

      // Add key topics if available
      if (s.source_guide?.key_topics && s.source_guide.key_topics.length > 0) {
        parts.push(`Key Topics: ${s.source_guide.key_topics.join(', ')}`);
      }

      return parts.join('\n\n');
    })
    .join('\n\n---\n\n');

  return { content, sources };
}

// GET: Fetch existing studio outputs for a notebook
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: notebookId } = await params;
    const user = await verifyAccess(request, notebookId);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check for specific type query param
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    let query = supabase
      .from('studio_outputs')
      .select('*')
      .eq('notebook_id', notebookId)
      .order('created_at', { ascending: false });

    if (type) {
      query = query.eq('type', type);
    }

    const { data: outputs, error } = await query;

    if (error) {
      console.error('Fetch studio outputs error:', error);
      return NextResponse.json({ error: 'Failed to fetch studio outputs' }, { status: 500 });
    }

    return NextResponse.json({ data: outputs || [] });
  } catch (error) {
    console.error('Get studio outputs error:', error);
    return NextResponse.json({ error: 'Failed to get studio outputs' }, { status: 500 });
  }
}

// POST: Generate and save studio outputs
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: notebookId } = await params;
    const user = await verifyAccess(request, notebookId);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      type,
      source_ids,
      report_type,
      custom_instructions,
      focus_area,
      tone,
      slide_count,
      style,
      // Infographic-specific
      image_count,
      image_style,
    } = body;

    // Get source content
    const { content, sources } = await getSourceContent(notebookId, source_ids);
    const actualSourceIds = sources.map((s) => s.id);

    if (!content) {
      return NextResponse.json({ error: 'No source content available' }, { status: 400 });
    }

    // Check if Gemini is configured
    if (!isGeminiConfigured()) {
      return NextResponse.json(
        {
          error:
            'Gemini API not configured. Please set GOOGLE_API_KEY in your environment variables.',
        },
        { status: 503 }
      );
    }

    // Build enhanced instructions from config
    let enhancedInstructions = custom_instructions || '';
    if (focus_area) {
      enhancedInstructions = `Focus on: ${focus_area}. ${enhancedInstructions}`;
    }
    if (tone) {
      enhancedInstructions = `Tone: ${tone}. ${enhancedInstructions}`;
    }
    if (style) {
      enhancedInstructions = `Style: ${style}. ${enhancedInstructions}`;
    }
    if (slide_count && type === 'slide_deck') {
      enhancedInstructions = `Create exactly ${slide_count} slides. ${enhancedInstructions}`;
    }

    // Limit content to prevent token overflow
    const truncatedContent = content.slice(0, 100000);

    // Create initial record with pending status
    const { data: outputRecord, error: insertError } = await supabase
      .from('studio_outputs')
      .insert({
        notebook_id: notebookId,
        type,
        status: 'processing',
        title: `${type.replace('_', ' ')} - ${new Date().toLocaleDateString()}`,
        source_ids: actualSourceIds,
        custom_instructions: enhancedInstructions || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert studio output error:', insertError);
      return NextResponse.json({ error: 'Failed to create studio output record' }, { status: 500 });
    }

    // Generate the output based on type
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let resultContent: any = {};
      let modelUsed = 'gemini-2.0-flash-exp';
      let costUsd = 0.01;

      if (type === 'data_table') {
        resultContent = await generateDataTable(
          truncatedContent,
          enhancedInstructions || undefined
        );
        costUsd = 0.005;
      } else if (type === 'report') {
        resultContent = await generateReport(
          truncatedContent,
          report_type || 'briefing_doc',
          enhancedInstructions || undefined
        );
        costUsd = 0.01;
      } else if (type === 'slide_deck') {
        resultContent = await generateSlideDeck(
          truncatedContent,
          enhancedInstructions || undefined
        );
        costUsd = 0.02;
      } else if (type === 'infographic') {
        // Generate infographic images using Nano Banana Pro (Gemini 3 Pro Image)
        const count = image_count || 4;
        const imgStyle = image_style || 'infographic';
        const colorTheme = style || 'modern';

        resultContent = await generateInfographicImages(
          truncatedContent,
          count,
          imgStyle,
          colorTheme
        );
        modelUsed = 'gemini-3-pro-image-preview';
        costUsd = count * 0.04; // ~$0.04 per image for Nano Banana Pro
      } else {
        // Update record to failed
        await supabase
          .from('studio_outputs')
          .update({ status: 'failed', error_message: 'Invalid output type' })
          .eq('id', outputRecord.id);

        return NextResponse.json({ error: 'Invalid output type' }, { status: 400 });
      }

      // Update the record with the generated content
      const { error: updateError } = await supabase
        .from('studio_outputs')
        .update({
          status: 'completed',
          content: resultContent,
          model_used: modelUsed,
          cost_usd: costUsd,
          completed_at: new Date().toISOString(),
        })
        .eq('id', outputRecord.id);

      if (updateError) {
        console.error('Update studio output error:', updateError);
      }

      return NextResponse.json({
        data: resultContent,
        output_id: outputRecord.id,
        usage: { model_used: modelUsed, cost_usd: costUsd },
      });
    } catch (error) {
      console.error(`${type} generation error:`, error);

      // Update record to failed
      await supabase
        .from('studio_outputs')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Generation failed',
        })
        .eq('id', outputRecord.id);

      return NextResponse.json(
        {
          error: `Failed to generate ${type.replace('_', ' ')}. Please try again.`,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Generate studio output error:', error);
    return NextResponse.json({ error: 'Failed to generate studio output' }, { status: 500 });
  }
}
