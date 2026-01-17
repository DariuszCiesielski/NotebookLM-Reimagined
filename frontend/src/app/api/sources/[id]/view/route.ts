import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET: Get a signed URL to view/download a source file
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: sourceId } = await params;

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

    // Get the source and verify ownership through notebook
    const { data: source, error: sourceError } = await supabase
      .from('sources')
      .select(
        `
        id,
        file_path,
        name,
        mime_type,
        notebook:notebooks!inner(user_id)
      `
      )
      .eq('id', sourceId)
      .single();

    if (sourceError || !source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    // Check if user owns the notebook
    const notebookData = source.notebook as unknown as { user_id: string } | { user_id: string }[];
    const notebook = Array.isArray(notebookData) ? notebookData[0] : notebookData;
    if (!notebook || notebook.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!source.file_path) {
      return NextResponse.json({ error: 'Source has no file' }, { status: 400 });
    }

    // Generate a signed URL (valid for 1 hour)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('sources')
      .createSignedUrl(source.file_path, 3600); // 1 hour expiry

    if (signedUrlError || !signedUrlData) {
      console.error('Failed to create signed URL:', signedUrlError);
      return NextResponse.json({ error: 'Failed to generate view URL' }, { status: 500 });
    }

    return NextResponse.json({
      url: signedUrlData.signedUrl,
      name: source.name,
      mime_type: source.mime_type,
    });
  } catch (error) {
    console.error('View source error:', error);
    return NextResponse.json({ error: 'Failed to get source URL' }, { status: 500 });
  }
}
