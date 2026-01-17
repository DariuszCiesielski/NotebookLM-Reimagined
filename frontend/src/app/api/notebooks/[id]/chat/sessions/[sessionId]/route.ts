import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8000';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET - Fetch messages for a specific chat session
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { id: notebookId, sessionId } = await params;

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

    // Verify session belongs to notebook
    const { data: session } = await supabase
      .from('chat_sessions')
      .select('id, title')
      .eq('id', sessionId)
      .eq('notebook_id', notebookId)
      .single();

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Fetch messages for the session
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to fetch messages:', error);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        session,
        messages: messages || [],
      },
    });
  } catch (error) {
    console.error('Session messages error:', error);
    return NextResponse.json({ error: 'Failed to fetch session messages' }, { status: 500 });
  }
}

// PATCH - Rename a chat session
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { id: notebookId, sessionId } = await params;
    const body = await request.json();
    const { title } = body;

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Get auth header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user
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

    // Update session title
    const { data: session, error } = await supabase
      .from('chat_sessions')
      .update({ title: title.trim() })
      .eq('id', sessionId)
      .eq('notebook_id', notebookId)
      .select()
      .single();

    if (error || !session) {
      console.error('Failed to rename session:', error);
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({ data: session });
  } catch (error) {
    console.error('Rename session error:', error);
    return NextResponse.json({ error: 'Failed to rename session' }, { status: 500 });
  }
}

// DELETE - Delete a chat session
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { id: notebookId, sessionId } = await params;

    // Get auth header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user
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

    // Delete messages first (cascade)
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

    return NextResponse.json({ data: { deleted: true, id: sessionId } });
  } catch (error) {
    console.error('Delete session error:', error);
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
  }
}
