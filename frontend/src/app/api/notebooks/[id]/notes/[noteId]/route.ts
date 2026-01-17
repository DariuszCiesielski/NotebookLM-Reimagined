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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const { id: notebookId, noteId } = await params;
    const user = await verifyAccess(request, notebookId);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: note } = await supabase
      .from('notes')
      .select('*')
      .eq('id', noteId)
      .eq('notebook_id', notebookId)
      .single();

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    return NextResponse.json({ data: note });
  } catch (error) {
    console.error('Get note error:', error);
    return NextResponse.json({ error: 'Failed to get note' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const { id: notebookId, noteId } = await params;
    const user = await verifyAccess(request, notebookId);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.content !== undefined) updateData.content = body.content;
    if (body.tags !== undefined) updateData.tags = body.tags;
    if (body.is_pinned !== undefined) updateData.is_pinned = body.is_pinned;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    updateData.updated_at = new Date().toISOString();

    const { data: note, error } = await supabase
      .from('notes')
      .update(updateData)
      .eq('id', noteId)
      .eq('notebook_id', notebookId)
      .select()
      .single();

    if (error || !note) {
      return NextResponse.json({ error: 'Failed to update note' }, { status: 400 });
    }

    return NextResponse.json({ data: note });
  } catch (error) {
    console.error('Update note error:', error);
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const { id: notebookId, noteId } = await params;
    const user = await verifyAccess(request, notebookId);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', noteId)
      .eq('notebook_id', notebookId);

    if (error) {
      return NextResponse.json({ error: 'Failed to delete note' }, { status: 400 });
    }

    return NextResponse.json({ data: { deleted: true, id: noteId } });
  } catch (error) {
    console.error('Delete note error:', error);
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
  }
}
