import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET - Fetch all chat sessions for a notebook
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: notebookId } = await params;

    // Get auth header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has access to notebook
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
    } = await supabase.auth.getUser(token);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get notebook to verify ownership
    const { data: notebook } = await supabase
      .from('notebooks')
      .select('id')
      .eq('id', notebookId)
      .eq('user_id', user.id)
      .single();

    if (!notebook) {
      return NextResponse.json({ error: 'Notebook not found' }, { status: 404 });
    }

    // Fetch chat sessions with message count
    const { data: sessions, error } = await supabase
      .from('chat_sessions')
      .select(
        `
        id,
        title,
        created_at,
        updated_at,
        chat_messages (count)
      `
      )
      .eq('notebook_id', notebookId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch sessions:', error);
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
    }

    // Transform data to include message count
    const transformedSessions =
      sessions?.map((session) => ({
        id: session.id,
        title: session.title,
        created_at: session.created_at,
        updated_at: session.updated_at,
        message_count: (session.chat_messages as { count: number }[])?.[0]?.count || 0,
      })) || [];

    return NextResponse.json({ data: transformedSessions });
  } catch (error) {
    console.error('Sessions error:', error);
    return NextResponse.json({ error: 'Failed to fetch chat sessions' }, { status: 500 });
  }
}

// DELETE - Delete a chat session
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: notebookId } = await params;
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Get auth header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has access to notebook
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
    } = await supabase.auth.getUser(token);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify notebook ownership
    const { data: notebook } = await supabase
      .from('notebooks')
      .select('id')
      .eq('id', notebookId)
      .eq('user_id', user.id)
      .single();

    if (!notebook) {
      return NextResponse.json({ error: 'Notebook not found' }, { status: 404 });
    }

    // Delete messages first (due to FK constraint)
    await supabase.from('chat_messages').delete().eq('session_id', sessionId);

    // Delete session
    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('notebook_id', notebookId);

    if (error) {
      console.error('Failed to delete session:', error);
      return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete session error:', error);
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
  }
}
