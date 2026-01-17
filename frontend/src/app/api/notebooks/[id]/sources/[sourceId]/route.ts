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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sourceId: string }> }
) {
  try {
    const { id: notebookId, sourceId } = await params;
    const user = await verifyAccess(request, notebookId);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get source to check file path
    const { data: source } = await supabase
      .from('sources')
      .select('file_path')
      .eq('id', sourceId)
      .eq('notebook_id', notebookId)
      .single();

    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    // Delete from storage if file exists
    if (source.file_path) {
      await supabase.storage.from('sources').remove([source.file_path]);
    }

    // Delete record
    const { error } = await supabase
      .from('sources')
      .delete()
      .eq('id', sourceId)
      .eq('notebook_id', notebookId);

    if (error) {
      return NextResponse.json({ error: 'Failed to delete source' }, { status: 400 });
    }

    return NextResponse.json({ data: { deleted: true, id: sourceId } });
  } catch (error) {
    console.error('Delete source error:', error);
    return NextResponse.json({ error: 'Failed to delete source' }, { status: 500 });
  }
}
