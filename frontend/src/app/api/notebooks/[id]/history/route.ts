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

export type HistoryItemType =
  | 'audio'
  | 'video'
  | 'research'
  | 'data_table'
  | 'report'
  | 'slide_deck'
  | 'infographic'
  | 'flashcards'
  | 'quiz'
  | 'study_guide'
  | 'faq'
  | 'mind_map'
  | 'note';

export interface HistoryItem {
  id: string;
  type: HistoryItemType;
  title: string;
  preview: Record<string, unknown>;
  status: string;
  created_at: string;
  source_ids?: string[];
  content?: Record<string, unknown>;
}

// GET: Fetch unified history for a notebook
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: notebookId } = await params;
    const user = await verifyAccess(request, notebookId);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const typesParam = searchParams.get('types');
    const filterTypes = typesParam ? typesParam.split(',') : null;

    // Fetch all content types in parallel
    const [audioResult, videoResult, researchResult, studioResult, studyResult, notesResult] =
      await Promise.all([
        supabase
          .from('audio_overviews')
          .select('id, format, status, duration_seconds, created_at, source_ids, script')
          .eq('notebook_id', notebookId)
          .order('created_at', { ascending: false }),

        supabase
          .from('video_overviews')
          .select(
            'id, style, status, duration_seconds, created_at, source_ids, script, thumbnail_url'
          )
          .eq('notebook_id', notebookId)
          .order('created_at', { ascending: false }),

        supabase
          .from('research_tasks')
          .select('id, query, mode, status, created_at, sources_found_count, report_content')
          .eq('notebook_id', notebookId)
          .order('created_at', { ascending: false }),

        supabase
          .from('studio_outputs')
          .select('id, type, title, status, created_at, source_ids, content')
          .eq('notebook_id', notebookId)
          .order('created_at', { ascending: false }),

        supabase
          .from('study_materials')
          .select('id, type, data, created_at, source_ids')
          .eq('notebook_id', notebookId)
          .order('created_at', { ascending: false }),

        supabase
          .from('notes')
          .select('id, title, content, type, created_at, is_pinned, tags')
          .eq('notebook_id', notebookId)
          .order('created_at', { ascending: false }),
      ]);

    // Transform results to unified format
    const historyItems: HistoryItem[] = [];

    // Audio overviews
    if (audioResult.data && (!filterTypes || filterTypes.includes('audio'))) {
      for (const audio of audioResult.data) {
        historyItems.push({
          id: audio.id,
          type: 'audio',
          title: `${audio.format?.replace('_', ' ') || 'Audio'} Overview`,
          preview: {
            format: audio.format,
            duration_seconds: audio.duration_seconds,
            script_preview: audio.script?.slice(0, 100),
          },
          status: audio.status || 'completed',
          created_at: audio.created_at,
          source_ids: audio.source_ids,
        });
      }
    }

    // Video overviews
    if (videoResult.data && (!filterTypes || filterTypes.includes('video'))) {
      for (const video of videoResult.data) {
        historyItems.push({
          id: video.id,
          type: 'video',
          title: `${video.style?.replace('_', ' ') || 'Video'} Overview`,
          preview: {
            style: video.style,
            duration_seconds: video.duration_seconds,
            thumbnail_url: video.thumbnail_url,
            script_preview: video.script?.slice(0, 100),
          },
          status: video.status || 'completed',
          created_at: video.created_at,
          source_ids: video.source_ids,
        });
      }
    }

    // Research tasks
    if (researchResult.data && (!filterTypes || filterTypes.includes('research'))) {
      for (const research of researchResult.data) {
        historyItems.push({
          id: research.id,
          type: 'research',
          title: research.query?.slice(0, 60) || 'Research Report',
          preview: {
            query: research.query,
            mode: research.mode,
            sources_found_count: research.sources_found_count,
            content_preview: research.report_content?.slice(0, 150),
          },
          status: research.status || 'completed',
          created_at: research.created_at,
        });
      }
    }

    // Studio outputs (data_table, report, slide_deck, infographic)
    if (studioResult.data) {
      for (const output of studioResult.data) {
        const outputType = output.type as HistoryItemType;
        if (filterTypes && !filterTypes.includes(outputType)) continue;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const content = output.content as Record<string, any> | null;
        let preview: Record<string, unknown> = {};

        switch (outputType) {
          case 'data_table':
            preview = {
              row_count: content?.rows?.length || 0,
              column_count: content?.columns?.length || 0,
              description: content?.description?.slice(0, 100),
            };
            break;
          case 'report':
            preview = {
              report_type: content?.report_type,
              section_count: content?.sections?.length || 0,
              summary_preview: content?.executive_summary?.slice(0, 100),
            };
            break;
          case 'slide_deck':
            preview = {
              slide_count: content?.slides?.length || 0,
              theme: content?.theme_suggestion,
              subtitle: content?.subtitle,
            };
            break;
          case 'infographic':
            preview = {
              image_count: content?.images?.length || 0,
              concepts: content?.concepts?.slice(0, 3),
              has_images: !!content?.images?.length,
            };
            break;
        }

        historyItems.push({
          id: output.id,
          type: outputType,
          title: output.title || `${outputType.replace('_', ' ')}`,
          preview,
          status: output.status || 'completed',
          created_at: output.created_at,
          source_ids: output.source_ids,
          content: content || undefined,
        });
      }
    }

    // Study materials (flashcards, quiz, study_guide, faq, mind_map)
    if (studyResult.data) {
      for (const material of studyResult.data) {
        const materialType = material.type as HistoryItemType;
        if (filterTypes && !filterTypes.includes(materialType)) continue;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = material.data as Record<string, any> | null;
        let preview: Record<string, unknown> = {};
        let title = '';

        switch (materialType) {
          case 'flashcards':
            preview = {
              card_count: data?.flashcards?.length || 0,
              first_card: data?.flashcards?.[0]?.front?.slice(0, 50),
            };
            title = `Flashcards (${data?.flashcards?.length || 0} cards)`;
            break;
          case 'quiz':
            preview = {
              question_count: data?.questions?.length || 0,
              first_question: data?.questions?.[0]?.question?.slice(0, 50),
            };
            title = `Quiz (${data?.questions?.length || 0} questions)`;
            break;
          case 'study_guide':
            preview = {
              section_count: data?.sections?.length || 0,
              guide_title: data?.title,
            };
            title = data?.title || 'Study Guide';
            break;
          case 'faq':
            preview = {
              item_count: data?.faq?.length || 0,
              first_question: data?.faq?.[0]?.question?.slice(0, 50),
            };
            title = `FAQ (${data?.faq?.length || 0} items)`;
            break;
          case 'mind_map':
            preview = {
              node_count: data?.nodes?.length || 0,
              map_title: data?.title,
            };
            title = data?.title || 'Mind Map';
            break;
        }

        historyItems.push({
          id: material.id,
          type: materialType,
          title,
          preview,
          status: 'completed',
          created_at: material.created_at,
          source_ids: material.source_ids,
          content: data || undefined,
        });
      }
    }

    // Notes
    if (notesResult.data && (!filterTypes || filterTypes.includes('note'))) {
      for (const note of notesResult.data) {
        historyItems.push({
          id: note.id,
          type: 'note',
          title: note.title || 'Untitled Note',
          preview: {
            content_preview: note.content?.slice(0, 100),
            note_type: note.type,
            is_pinned: note.is_pinned,
            tags: note.tags,
          },
          status: 'completed',
          created_at: note.created_at,
        });
      }
    }

    // Sort all items by created_at DESC
    historyItems.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Apply pagination
    const total = historyItems.length;
    const paginatedItems = historyItems.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    return NextResponse.json({
      data: paginatedItems,
      total,
      hasMore,
      offset,
      limit,
    });
  } catch (error) {
    console.error('Get history error:', error);
    return NextResponse.json({ error: 'Failed to get history' }, { status: 500 });
  }
}
