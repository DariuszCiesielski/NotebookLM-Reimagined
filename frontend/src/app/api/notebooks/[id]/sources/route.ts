import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { processSourceContent } from '@/lib/rag';

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

    const { data: sources } = await supabase
      .from('sources')
      .select('*')
      .eq('notebook_id', notebookId)
      .order('created_at', { ascending: false });

    return NextResponse.json({ data: sources || [] });
  } catch (error) {
    console.error('List sources error:', error);
    return NextResponse.json({ error: 'Failed to list sources' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: notebookId } = await params;
    const user = await verifyAccess(request, notebookId);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const type = formData.get('type') as string;

    if (type === 'text') {
      const name = formData.get('name') as string;
      const content = formData.get('content') as string;

      const { data: source, error } = await supabase
        .from('sources')
        .insert({
          notebook_id: notebookId,
          type: 'text',
          name: name || 'Pasted Text',
          status: 'ready',
          metadata: { content: content?.slice(0, 100000) },
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: 'Failed to create source' }, { status: 400 });
      }

      // Process with RAG in background (non-blocking)
      processSourceContent(source.id, content).catch(console.error);

      return NextResponse.json({ data: source });
    }

    if (type === 'url') {
      const url = formData.get('url') as string;
      const name = formData.get('name') as string;

      const { data: source, error } = await supabase
        .from('sources')
        .insert({
          notebook_id: notebookId,
          type: 'url',
          name: name || url?.slice(0, 100),
          status: 'ready',
          metadata: { url },
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: 'Failed to create source' }, { status: 400 });
      }

      return NextResponse.json({ data: source });
    }

    if (type === 'youtube') {
      const url = formData.get('url') as string;
      const name = formData.get('name') as string;

      let videoId = null;
      if (url.includes('youtube.com/watch?v=')) {
        videoId = url.split('v=')[1]?.split('&')[0];
      } else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0];
      }

      const { data: source, error } = await supabase
        .from('sources')
        .insert({
          notebook_id: notebookId,
          type: 'youtube',
          name: name || `YouTube: ${videoId || url}`,
          status: 'ready',
          metadata: { url, video_id: videoId },
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: 'Failed to create source' }, { status: 400 });
      }

      return NextResponse.json({ data: source });
    }

    // File upload
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = file.name;
    const ext = filename.split('.').pop()?.toLowerCase() || 'txt';
    const storagePath = `${user.id}/${notebookId}/${Date.now()}_${filename}`;

    const { error: uploadError } = await supabase.storage
      .from('sources')
      .upload(storagePath, buffer, {
        contentType: file.type || 'application/octet-stream',
      });

    if (uploadError) {
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 400 });
    }

    const typeMap: Record<string, string> = {
      pdf: 'pdf',
      docx: 'docx',
      doc: 'docx',
      txt: 'txt',
      md: 'txt',
    };

    const { data: source, error } = await supabase
      .from('sources')
      .insert({
        notebook_id: notebookId,
        type: typeMap[ext] || 'txt',
        name: filename,
        status: 'ready',
        file_path: storagePath,
        original_filename: filename,
        mime_type: file.type,
        file_size_bytes: buffer.length,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to create source' }, { status: 400 });
    }

    return NextResponse.json({ data: source });
  } catch (error) {
    console.error('Create source error:', error);
    return NextResponse.json({ error: 'Failed to create source' }, { status: 500 });
  }
}
