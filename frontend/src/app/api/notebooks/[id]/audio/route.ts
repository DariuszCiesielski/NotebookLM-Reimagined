import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

import { generateAudioScript, generateTTSAudio, pcmToWav, isGeminiConfigured } from '@/lib/gemini';

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

    const { data: audioOverviews } = await supabase
      .from('audio_overviews')
      .select('*')
      .eq('notebook_id', notebookId)
      .order('created_at', { ascending: false });

    // Map audio_file_path to audio_url for frontend compatibility
    const mappedAudio = (audioOverviews || []).map((audio) => ({
      ...audio,
      audio_url: audio.audio_file_path,
    }));

    return NextResponse.json({ data: mappedAudio });
  } catch (error) {
    console.error('List audio error:', error);
    return NextResponse.json({ error: 'Failed to list audio' }, { status: 500 });
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
    const { format, source_ids, custom_instructions } = body;

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

    // Get sources content
    let query = supabase
      .from('sources')
      .select('*')
      .eq('notebook_id', notebookId)
      .eq('status', 'ready');

    if (source_ids && source_ids.length > 0) {
      query = query.in('id', source_ids);
    }

    const { data: sources } = await query;

    if (!sources || sources.length === 0) {
      return NextResponse.json({ error: 'No sources available' }, { status: 400 });
    }

    // Combine source content
    const sourceContent = sources
      .map((s) => {
        const parts: string[] = [];
        parts.push(`## ${s.name}`);

        if (s.type === 'text' && s.metadata?.content) {
          parts.push(s.metadata.content);
        }

        if (s.source_guide?.summary) {
          parts.push(`Summary: ${s.source_guide.summary}`);
        }

        if (s.source_guide?.key_topics && s.source_guide.key_topics.length > 0) {
          parts.push(`Key Topics: ${s.source_guide.key_topics.join(', ')}`);
        }

        return parts.join('\n\n');
      })
      .join('\n\n---\n\n');

    // Add custom instructions if provided
    const fullContent = custom_instructions
      ? `${sourceContent}\n\n[Additional Instructions: ${custom_instructions}]`
      : sourceContent;

    // Limit content to prevent token overflow
    const truncatedContent = fullContent.slice(0, 100000);

    // Generate real script using Gemini
    const validFormat = (format as 'deep_dive' | 'brief' | 'critique' | 'debate') || 'deep_dive';

    try {
      // Step 1: Generate the script
      const script = await generateAudioScript(truncatedContent, validFormat);

      // Step 2: Generate TTS audio from the script
      let audioUrl: string | undefined;
      let durationSeconds = 0;

      try {
        // For longer scripts, we may need to chunk them
        // TTS has limits on input length, so we'll use a portion for now
        const scriptForTTS = script.slice(0, 3000); // Limit for TTS
        console.log('[AUDIO] Starting TTS generation, script length:', scriptForTTS.length);

        const { audioData, mimeType } = await generateTTSAudio(scriptForTTS);
        console.log('[AUDIO] TTS success, audio data length:', audioData.length, 'mime:', mimeType);

        // Decode base64 audio data
        const audioBuffer = Buffer.from(audioData, 'base64');

        // Determine file extension and content type based on mimeType from Gemini
        let fileExtension = 'mp3';
        let contentType = 'audio/mpeg';

        if (mimeType.includes('wav') || mimeType.includes('pcm')) {
          // If it's PCM/WAV, convert to WAV format
          const wavBuffer = pcmToWav(audioBuffer);
          fileExtension = 'wav';
          contentType = 'audio/wav';

          // Upload WAV to Supabase Storage
          const audioFileName = `audio_${notebookId}_${Date.now()}.${fileExtension}`;
          const { error: uploadError } = await supabase.storage
            .from('audio')
            .upload(audioFileName, wavBuffer, {
              contentType,
              upsert: true,
            });

          if (uploadError) {
            console.error('Audio upload error:', uploadError);
          } else {
            const { data: urlData } = supabase.storage.from('audio').getPublicUrl(audioFileName);
            audioUrl = urlData.publicUrl;
            const bytesPerSecond = 24000 * 2 * 1;
            durationSeconds = Math.round(audioBuffer.length / bytesPerSecond);
          }
        } else {
          // For MP3, OGG, or other formats - use directly
          if (mimeType.includes('mp3') || mimeType.includes('mpeg')) {
            fileExtension = 'mp3';
            contentType = 'audio/mpeg';
          } else if (mimeType.includes('ogg')) {
            fileExtension = 'ogg';
            contentType = 'audio/ogg';
          }

          // Upload directly to Supabase Storage
          const audioFileName = `audio_${notebookId}_${Date.now()}.${fileExtension}`;
          const { error: uploadError } = await supabase.storage
            .from('audio')
            .upload(audioFileName, audioBuffer, {
              contentType,
              upsert: true,
            });

          if (uploadError) {
            console.error('Audio upload error:', uploadError);
          } else {
            const { data: urlData } = supabase.storage.from('audio').getPublicUrl(audioFileName);
            audioUrl = urlData.publicUrl;
            // Estimate duration for non-PCM formats (rough estimate: 1KB = ~0.5 seconds for MP3)
            durationSeconds = Math.round(audioBuffer.length / 2000);
          }
        }

        console.log('[AUDIO] Audio uploaded, URL:', audioUrl, 'duration:', durationSeconds, 'seconds');
      } catch (ttsError) {
        console.error('[AUDIO] TTS generation error (continuing with script only):', ttsError);
        console.error(
          '[AUDIO] Error details:',
          JSON.stringify(ttsError, Object.getOwnPropertyNames(ttsError))
        );
        // Continue without audio - we still have the script
        const wordCount = script.split(/\s+/).length;
        durationSeconds = Math.round((wordCount / 150) * 60);
      }

      // Create audio record
      const { data: audio, error } = await supabase
        .from('audio_overviews')
        .insert({
          notebook_id: notebookId,
          format: validFormat,
          status: 'completed',
          progress_percent: 100,
          custom_instructions,
          source_ids: sources.map((s) => s.id),
          script,
          audio_file_path: audioUrl,
          duration_seconds: durationSeconds,
          model_used: 'gemini-2.0-flash-exp',
          cost_usd: audioUrl ? 0.01 : 0.005,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        return NextResponse.json({ error: 'Failed to save audio overview' }, { status: 400 });
      }

      // Map audio_file_path to audio_url for frontend compatibility
      return NextResponse.json({ data: { ...audio, audio_url: audio.audio_file_path } });
    } catch (error) {
      console.error('Script generation error:', error);
      return NextResponse.json(
        {
          error: 'Failed to generate audio. Please try again.',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Create audio error:', error);
    return NextResponse.json({ error: 'Failed to create audio' }, { status: 500 });
  }
}
