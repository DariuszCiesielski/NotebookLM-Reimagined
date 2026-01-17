import { createClient } from '@supabase/supabase-js';
import JSZip from 'jszip';
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
    .select('*')
    .eq('id', notebookId)
    .eq('user_id', user.id)
    .single();

  if (!notebook) return null;

  return { user, notebook };
}

interface ExportOptions {
  includeSources?: boolean;
  includeChats?: boolean;
  includeNotes?: boolean;
  includeGenerated?: boolean;
}

async function gatherExportData(notebookId: string, options: ExportOptions) {
  const {
    includeSources = true,
    includeChats = true,
    includeNotes = true,
    includeGenerated = true,
  } = options;

  const exportData: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    export_version: '1.0',
  };

  // Sources
  if (includeSources) {
    const { data: sources } = await supabase
      .from('sources')
      .select('*')
      .eq('notebook_id', notebookId)
      .order('created_at', { ascending: true });
    exportData.sources = sources || [];
  }

  // Chat sessions with messages
  if (includeChats) {
    const { data: sessions } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('notebook_id', notebookId)
      .order('created_at', { ascending: true });

    if (sessions) {
      for (const session of sessions) {
        const { data: messages } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('session_id', session.id)
          .order('created_at', { ascending: true });
        session.messages = messages || [];
      }
    }
    exportData.chat_sessions = sessions || [];
  }

  // Notes
  if (includeNotes) {
    const { data: notes } = await supabase
      .from('notes')
      .select('*')
      .eq('notebook_id', notebookId)
      .order('created_at', { ascending: true });
    exportData.notes = notes || [];
  }

  // Generated content
  if (includeGenerated) {
    // Audio overviews
    const { data: audio } = await supabase
      .from('audio_overviews')
      .select('*')
      .eq('notebook_id', notebookId);
    exportData.audio_overviews = audio || [];

    // Video overviews
    const { data: video } = await supabase
      .from('video_overviews')
      .select('*')
      .eq('notebook_id', notebookId);
    exportData.video_overviews = video || [];

    // Study materials
    const { data: studyMaterials } = await supabase
      .from('study_materials')
      .select('*')
      .eq('notebook_id', notebookId);
    exportData.study_materials = studyMaterials || [];

    // Studio outputs
    const { data: studioOutputs } = await supabase
      .from('studio_outputs')
      .select('*')
      .eq('notebook_id', notebookId);
    exportData.studio_outputs = studioOutputs || [];

    // Research tasks
    const { data: research } = await supabase
      .from('research_tasks')
      .select('*')
      .eq('notebook_id', notebookId);
    exportData.research_tasks = research || [];
  }

  return exportData;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: notebookId } = await params;
    const authResult = await verifyAccess(request, notebookId);

    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user, notebook } = authResult;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    const includeSources = searchParams.get('includeSources') !== 'false';
    const includeChats = searchParams.get('includeChats') !== 'false';
    const includeNotes = searchParams.get('includeNotes') !== 'false';
    const includeGenerated = searchParams.get('includeGenerated') !== 'false';

    const exportData = await gatherExportData(notebookId, {
      includeSources,
      includeChats,
      includeNotes,
      includeGenerated,
    });

    // Add notebook metadata
    exportData.notebook = {
      id: notebook.id,
      name: notebook.name,
      description: notebook.description,
      emoji: notebook.emoji,
      settings: notebook.settings,
      created_at: notebook.created_at,
    };

    if (format === 'json') {
      return NextResponse.json({ data: exportData });
    }

    // ZIP format
    if (format === 'zip') {
      const zip = new JSZip();
      const safeName = notebook.name.replace(/[^a-zA-Z0-9 _-]/g, '_');
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const folderName = `notebook-export-${safeName}-${dateStr}`;

      // Add README
      const readme = `# ${notebook.name} Export

Exported from NotebookLM Reimagined on ${new Date().toISOString()}

## Contents

- \`notebook.json\` - Notebook metadata
- \`sources/\` - Source documents and metadata
- \`chats/\` - Chat sessions and messages
- \`notes/\` - User notes
- \`generated/\` - AI-generated content

## Re-importing

This export can be used as a backup or for migration.
`;
      zip.file(`${folderName}/README.md`, readme);

      // Notebook metadata
      zip.file(`${folderName}/notebook.json`, JSON.stringify(exportData.notebook, null, 2));

      // Sources
      if (includeSources && Array.isArray(exportData.sources)) {
        const sourcesIndex: unknown[] = [];

        for (const source of exportData.sources as Record<string, unknown>[]) {
          const sourceInfo: Record<string, unknown> = {
            id: source.id,
            name: source.name,
            type: source.type,
            status: source.status,
            created_at: source.created_at,
            metadata: source.metadata,
            source_guide: source.source_guide,
          };
          sourcesIndex.push(sourceInfo);

          // Try to download file from storage
          if (source.file_path) {
            try {
              const { data: fileData } = await supabase.storage
                .from('sources')
                .download(source.file_path as string);

              if (fileData) {
                const filename = (source.original_filename as string) || (source.name as string);
                const arrayBuffer = await fileData.arrayBuffer();
                zip.file(`${folderName}/sources/files/${filename}`, arrayBuffer);
                sourceInfo.exported_file = `files/${filename}`;
              }
            } catch (e) {
              sourceInfo.export_error = 'Failed to download file';
            }
          }

          // For text sources, save content
          if (source.type === 'text' && source.metadata) {
            const metadata = source.metadata as Record<string, unknown>;
            if (metadata.content) {
              const filename = `${source.id}.txt`;
              zip.file(`${folderName}/sources/text/${filename}`, metadata.content as string);
              sourceInfo.exported_file = `text/${filename}`;
            }
          }
        }

        zip.file(`${folderName}/sources/index.json`, JSON.stringify(sourcesIndex, null, 2));
      }

      // Chats
      if (includeChats && Array.isArray(exportData.chat_sessions)) {
        const sessionsIndex: unknown[] = [];

        for (const session of exportData.chat_sessions as Record<string, unknown>[]) {
          const sessionInfo = {
            id: session.id,
            title: session.title,
            created_at: session.created_at,
            message_count: Array.isArray(session.messages) ? session.messages.length : 0,
          };
          sessionsIndex.push(sessionInfo);

          zip.file(
            `${folderName}/chats/session-${session.id}.json`,
            JSON.stringify(session, null, 2)
          );
        }

        zip.file(`${folderName}/chats/index.json`, JSON.stringify(sessionsIndex, null, 2));
      }

      // Notes
      if (includeNotes && Array.isArray(exportData.notes)) {
        zip.file(`${folderName}/notes/index.json`, JSON.stringify(exportData.notes, null, 2));
      }

      // Generated content
      if (includeGenerated) {
        const generatedIndex: Record<string, unknown[]> = {
          audio_overviews: [],
          video_overviews: [],
          study_materials: [],
          studio_outputs: [],
          research_tasks: [],
        };

        // Audio
        if (Array.isArray(exportData.audio_overviews)) {
          for (const audio of exportData.audio_overviews as Record<string, unknown>[]) {
            const audioInfo: Record<string, unknown> = {
              id: audio.id,
              format: audio.format,
              status: audio.status,
              created_at: audio.created_at,
            };
            generatedIndex.audio_overviews.push(audioInfo);

            if (audio.script) {
              zip.file(
                `${folderName}/generated/audio/${audio.id}_script.json`,
                JSON.stringify(audio.script, null, 2)
              );
            }

            // Try to download audio file
            if (audio.audio_file_path) {
              try {
                const { data: audioData } = await supabase.storage
                  .from('audio')
                  .download(audio.audio_file_path as string);

                if (audioData) {
                  const arrayBuffer = await audioData.arrayBuffer();
                  zip.file(`${folderName}/generated/audio/${audio.id}.mp3`, arrayBuffer);
                  audioInfo.exported_file = `${audio.id}.mp3`;
                }
              } catch (e) {
                // Ignore download errors
              }
            }
          }
        }

        // Video
        if (Array.isArray(exportData.video_overviews)) {
          for (const video of exportData.video_overviews as Record<string, unknown>[]) {
            const videoInfo = {
              id: video.id,
              style: video.style,
              status: video.status,
              created_at: video.created_at,
            };
            generatedIndex.video_overviews.push(videoInfo);

            if (video.script) {
              zip.file(
                `${folderName}/generated/video/${video.id}_script.json`,
                JSON.stringify(video.script, null, 2)
              );
            }
          }
        }

        // Study materials
        if (Array.isArray(exportData.study_materials)) {
          for (const material of exportData.study_materials as Record<string, unknown>[]) {
            generatedIndex.study_materials.push({
              id: material.id,
              type: material.type,
              created_at: material.created_at,
            });

            zip.file(
              `${folderName}/generated/study-materials/${material.type}_${material.id}.json`,
              JSON.stringify(material, null, 2)
            );
          }
        }

        // Studio outputs
        if (Array.isArray(exportData.studio_outputs)) {
          for (const output of exportData.studio_outputs as Record<string, unknown>[]) {
            generatedIndex.studio_outputs.push({
              id: output.id,
              type: output.type,
              title: output.title,
              created_at: output.created_at,
            });

            zip.file(
              `${folderName}/generated/studio/${output.type}_${output.id}.json`,
              JSON.stringify(output, null, 2)
            );
          }
        }

        // Research tasks
        if (Array.isArray(exportData.research_tasks)) {
          for (const research of exportData.research_tasks as Record<string, unknown>[]) {
            generatedIndex.research_tasks.push({
              id: research.id,
              query: research.query,
              status: research.status,
              created_at: research.created_at,
            });

            zip.file(
              `${folderName}/generated/research/${research.id}.json`,
              JSON.stringify(research, null, 2)
            );
          }
        }

        zip.file(`${folderName}/generated/index.json`, JSON.stringify(generatedIndex, null, 2));
      }

      // Generate ZIP
      const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' });

      return new NextResponse(zipBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${folderName}.zip"`,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Failed to export notebook' }, { status: 500 });
  }
}
