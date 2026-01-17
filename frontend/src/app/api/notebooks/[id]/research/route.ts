import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

import { generateResearchReport, isGeminiConfigured } from '@/lib/gemini';

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

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: notebookId } = await params;
    const user = await verifyAccess(request, notebookId);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: tasks } = await supabase
      .from('research_tasks')
      .select('*')
      .eq('notebook_id', notebookId)
      .order('created_at', { ascending: false });

    return NextResponse.json({ data: tasks || [] });
  } catch (error) {
    console.error('List research tasks error:', error);
    return NextResponse.json({ error: 'Failed to list research tasks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: notebookId } = await params;
    const user = await verifyAccess(request, notebookId);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { query, mode } = body;

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
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

    const validMode = (mode as 'fast' | 'deep') || 'fast';

    try {
      // Generate real research report using Gemini
      const { report_content, sources_found_count, sources_analyzed_count, citations } =
        await generateResearchReport(query, validMode);

      // Create research task record
      const { data: task, error } = await supabase
        .from('research_tasks')
        .insert({
          notebook_id: notebookId,
          query,
          mode: validMode,
          status: 'completed',
          progress_message: 'Research complete',
          sources_found_count,
          sources_analyzed_count,
          report_content,
          report_citations: citations,
          model_used: validMode === 'deep' ? 'gemini-1.5-pro' : 'gemini-2.0-flash-exp',
          cost_usd: validMode === 'deep' ? 0.01 : 0.003,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        return NextResponse.json({ error: 'Failed to save research task' }, { status: 400 });
      }

      return NextResponse.json({ data: task });
    } catch (error) {
      console.error('Research generation error:', error);
      return NextResponse.json(
        {
          error: 'Failed to generate research report. Please try again.',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Create research task error:', error);
    return NextResponse.json({ error: 'Failed to create research task' }, { status: 500 });
  }
}
