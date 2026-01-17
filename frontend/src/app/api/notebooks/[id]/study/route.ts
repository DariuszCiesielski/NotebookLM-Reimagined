import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

import {
  generateFlashcards,
  generateQuiz,
  generateStudyGuide,
  generateFAQ,
  generateMindMap,
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

// Map API types to database types
function mapTypeToDbType(type: string): string {
  const mapping: Record<string, string> = {
    flashcards: 'flashcards',
    quiz: 'quiz',
    'study-guide': 'study_guide',
    faq: 'faq',
    'mind-map': 'mind_map',
  };
  return mapping[type] || type;
}

// GET: Fetch existing study materials for a notebook
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
      .from('study_materials')
      .select('*')
      .eq('notebook_id', notebookId)
      .order('created_at', { ascending: false });

    if (type) {
      query = query.eq('type', mapTypeToDbType(type));
    }

    const { data: materials, error } = await query;

    if (error) {
      console.error('Fetch study materials error:', error);
      return NextResponse.json({ error: 'Failed to fetch study materials' }, { status: 500 });
    }

    return NextResponse.json({ data: materials || [] });
  } catch (error) {
    console.error('Get study materials error:', error);
    return NextResponse.json({ error: 'Failed to get study materials' }, { status: 500 });
  }
}

// POST: Generate and save study materials
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
      count,
      regenerate,
      difficulty,
      focus_area,
      custom_instructions,
      question_types,
    } = body;

    const dbType = mapTypeToDbType(type);

    // Build context with config options
    let contextPrefix = '';
    if (difficulty) {
      contextPrefix += `Difficulty level: ${difficulty}. `;
    }
    if (focus_area) {
      contextPrefix += `Focus on: ${focus_area}. `;
    }
    if (custom_instructions) {
      contextPrefix += `Additional instructions: ${custom_instructions}. `;
    }

    // Get source content - always regenerate fresh
    const { content, sources } = await getSourceContent(notebookId, source_ids);

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

    // Limit content to prevent token overflow (roughly 100k chars = ~25k tokens)
    // Prepend context prefix with config options
    const fullContent = contextPrefix ? `[Configuration: ${contextPrefix}]\n\n${content}` : content;
    const truncatedContent = fullContent.slice(0, 100000);
    const sourceIdArray = sources.map((s) => s.id);

    if (type === 'flashcards') {
      try {
        const flashcards = await generateFlashcards(truncatedContent, count || 10);

        // Add IDs to flashcards
        const flashcardsWithIds = flashcards.map((fc, idx) => ({
          id: `fc-${idx + 1}`,
          ...fc,
        }));

        const resultData = {
          flashcards: flashcardsWithIds,
          source_count: sources.length,
        };

        // Save to database
        const { data: saved, error: saveError } = await supabase
          .from('study_materials')
          .insert({
            notebook_id: notebookId,
            type: 'flashcards',
            data: resultData,
            source_ids: sourceIdArray,
            model_used: 'gemini-2.0-flash-exp',
            cost_usd: 0.001,
          })
          .select()
          .single();

        if (saveError) {
          console.error('Save flashcards error:', saveError);
        }

        return NextResponse.json({
          data: resultData,
          material_id: saved?.id,
          usage: { model_used: 'gemini-2.0-flash-exp', cost_usd: 0.001 },
        });
      } catch (error) {
        console.error('Flashcard generation error:', error);
        return NextResponse.json(
          {
            error: 'Failed to generate flashcards. Please try again.',
          },
          { status: 500 }
        );
      }
    }

    if (type === 'quiz') {
      try {
        const questions = await generateQuiz(truncatedContent, count || 5);

        // Add IDs to questions
        const questionsWithIds = questions.map((q, idx) => ({
          id: `q-${idx + 1}`,
          ...q,
        }));

        const resultData = {
          questions: questionsWithIds,
          source_count: sources.length,
        };

        // Save to database
        const { data: saved, error: saveError } = await supabase
          .from('study_materials')
          .insert({
            notebook_id: notebookId,
            type: 'quiz',
            data: resultData,
            source_ids: sourceIdArray,
            model_used: 'gemini-2.0-flash-exp',
            cost_usd: 0.001,
          })
          .select()
          .single();

        if (saveError) {
          console.error('Save quiz error:', saveError);
        }

        return NextResponse.json({
          data: resultData,
          material_id: saved?.id,
          usage: { model_used: 'gemini-2.0-flash-exp', cost_usd: 0.001 },
        });
      } catch (error) {
        console.error('Quiz generation error:', error);
        return NextResponse.json(
          {
            error: 'Failed to generate quiz. Please try again.',
          },
          { status: 500 }
        );
      }
    }

    if (type === 'study-guide') {
      try {
        const guide = await generateStudyGuide(truncatedContent);

        const resultData = {
          ...guide,
          source_count: sources.length,
        };

        // Save to database
        const { data: saved, error: saveError } = await supabase
          .from('study_materials')
          .insert({
            notebook_id: notebookId,
            type: 'study_guide',
            data: resultData,
            source_ids: sourceIdArray,
            model_used: 'gemini-2.0-flash-exp',
            cost_usd: 0.002,
          })
          .select()
          .single();

        if (saveError) {
          console.error('Save study guide error:', saveError);
        }

        return NextResponse.json({
          data: resultData,
          material_id: saved?.id,
          usage: { model_used: 'gemini-2.0-flash-exp', cost_usd: 0.002 },
        });
      } catch (error) {
        console.error('Study guide generation error:', error);
        return NextResponse.json(
          {
            error: 'Failed to generate study guide. Please try again.',
          },
          { status: 500 }
        );
      }
    }

    if (type === 'faq') {
      try {
        const faq = await generateFAQ(truncatedContent, count || 8);

        const resultData = {
          faq,
          source_count: sources.length,
        };

        // Save to database
        const { data: saved, error: saveError } = await supabase
          .from('study_materials')
          .insert({
            notebook_id: notebookId,
            type: 'faq',
            data: resultData,
            source_ids: sourceIdArray,
            model_used: 'gemini-2.0-flash-exp',
            cost_usd: 0.001,
          })
          .select()
          .single();

        if (saveError) {
          console.error('Save FAQ error:', saveError);
        }

        return NextResponse.json({
          data: resultData,
          material_id: saved?.id,
          usage: { model_used: 'gemini-2.0-flash-exp', cost_usd: 0.001 },
        });
      } catch (error) {
        console.error('FAQ generation error:', error);
        return NextResponse.json(
          {
            error: 'Failed to generate FAQ. Please try again.',
          },
          { status: 500 }
        );
      }
    }

    if (type === 'mind-map') {
      try {
        const mindMap = await generateMindMap(truncatedContent);

        const resultData = {
          ...mindMap,
          source_count: sources.length,
        };

        // Save to database
        const { data: saved, error: saveError } = await supabase
          .from('study_materials')
          .insert({
            notebook_id: notebookId,
            type: 'mind_map',
            data: resultData,
            source_ids: sourceIdArray,
            model_used: 'gemini-2.0-flash-exp',
            cost_usd: 0.001,
          })
          .select()
          .single();

        if (saveError) {
          console.error('Save mind map error:', saveError);
        }

        return NextResponse.json({
          data: resultData,
          material_id: saved?.id,
          usage: { model_used: 'gemini-2.0-flash-exp', cost_usd: 0.001 },
        });
      } catch (error) {
        console.error('Mind map generation error:', error);
        return NextResponse.json(
          {
            error: 'Failed to generate mind map. Please try again.',
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ error: 'Invalid study type' }, { status: 400 });
  } catch (error) {
    console.error('Generate study materials error:', error);
    return NextResponse.json({ error: 'Failed to generate study materials' }, { status: 500 });
  }
}
