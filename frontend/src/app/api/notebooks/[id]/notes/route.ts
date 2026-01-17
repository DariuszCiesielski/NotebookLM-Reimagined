import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

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

    const { data: notes } = await supabase
      .from('notes')
      .select('*')
      .eq('notebook_id', notebookId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    return NextResponse.json({ data: notes || [] });
  } catch (error) {
    console.error('List notes error:', error);
    return NextResponse.json({ error: 'Failed to list notes' }, { status: 500 });
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
    const { title, content, tags } = body;

    const { data: note, error } = await supabase
      .from('notes')
      .insert({
        notebook_id: notebookId,
        type: 'written',
        title: title || 'Untitled Note',
        content: content || '',
        tags: tags || [],
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to create note' }, { status: 400 });
    }

    return NextResponse.json({ data: note });
  } catch (error) {
    console.error('Create note error:', error);
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
  }
}
