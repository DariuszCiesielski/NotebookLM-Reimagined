import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

import {
  generateVideoAndWait,
  VIDEO_STYLES,
  isAtlasCloudConfigured,
  VideoStyle,
  VIDEO_COST_PER_SECOND,
} from '@/lib/atlascloud';
import { isGeminiConfigured, generateContent } from '@/lib/gemini';

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

    const { data: videos } = await supabase
      .from('video_overviews')
      .select('*')
      .eq('notebook_id', notebookId)
      .order('created_at', { ascending: false });

    return NextResponse.json({ data: videos || [] });
  } catch (error) {
    console.error('List videos error:', error);
    return NextResponse.json({ error: 'Failed to list videos' }, { status: 500 });
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
    const { style, source_ids } = body;

    // Check if Gemini and AtlasCloud are configured
    if (!isGeminiConfigured()) {
      return NextResponse.json(
        {
          error:
            'Gemini API not configured. Please set GOOGLE_API_KEY in your environment variables.',
        },
        { status: 503 }
      );
    }

    if (!isAtlasCloudConfigured()) {
      return NextResponse.json(
        {
          error:
            'AtlasCloud API not configured. Please set ATLASCLOUD_API_KEY in your environment variables.',
        },
        { status: 503 }
      );
    }

    // Get sources
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

    // Limit content to prevent token overflow
    const truncatedContent = sourceContent.slice(0, 10000);

    // Get style settings
    const validStyle = (style as VideoStyle) || 'explainer';
    const styleConfig = VIDEO_STYLES[validStyle] || VIDEO_STYLES.explainer;

    let totalCost = 0;

    try {
      // Step 1: Generate a video prompt from the content using Gemini
      console.log('[VIDEO] Generating video prompt with Gemini...');

      const promptResult = await generateContent(
        `Based on the following content, create a single concise video generation prompt (2-3 sentences max) that describes a compelling visual scene to represent the main theme or concept.

The video should be ${styleConfig.name.toLowerCase()} style: ${styleConfig.promptStyle}.

Content:
${truncatedContent}

Generate ONLY the video prompt, nothing else. Make it vivid and visually descriptive.`,
        'gemini-2.0-flash'
      );

      const videoPrompt = promptResult.text.trim();
      totalCost += 0.001; // Approximate cost for prompt generation

      console.log('[VIDEO] Generated prompt:', videoPrompt);

      // Step 2: Generate video using AtlasCloud Wan 2.5
      console.log('[VIDEO] Starting AtlasCloud video generation...');

      const videoResult = await generateVideoAndWait({
        prompt: videoPrompt,
        duration: styleConfig.duration,
        size: '1280*720',
        negativePrompt: styleConfig.negativePrompt,
        enablePromptExpansion: true,
      });

      console.log('[VIDEO] Video generated:', videoResult.videoUrl);
      totalCost += videoResult.cost;

      // Download video and upload to Supabase Storage for CORS-friendly playback
      let finalVideoUrl = videoResult.videoUrl;
      try {
        console.log('[VIDEO] Downloading video from AtlasCloud...');
        const videoResponse = await fetch(videoResult.videoUrl);
        if (videoResponse.ok) {
          const videoBuffer = await videoResponse.arrayBuffer();
          const videoFileName = `${notebookId}/${Date.now()}.mp4`;

          const { error: uploadError } = await supabase.storage
            .from('video')
            .upload(videoFileName, videoBuffer, {
              contentType: 'video/mp4',
              upsert: true,
            });

          if (!uploadError) {
            const { data: urlData } = supabase.storage.from('video').getPublicUrl(videoFileName);
            finalVideoUrl = urlData.publicUrl;
            console.log('[VIDEO] Uploaded to Supabase:', finalVideoUrl);
          } else {
            console.error('[VIDEO] Upload error:', uploadError);
          }
        }
      } catch (downloadError) {
        console.error('[VIDEO] Download/upload error:', downloadError);
        // Fall back to original URL
      }

      // Create video record with actual video URL
      const { data: video, error } = await supabase
        .from('video_overviews')
        .insert({
          notebook_id: notebookId,
          style: validStyle,
          status: 'completed',
          progress_percent: 100,
          source_ids: sources.map((s) => s.id),
          script: `Video Prompt: ${videoPrompt}\n\nStyle: ${styleConfig.name}\nDuration: ${styleConfig.duration} seconds`,
          video_file_path: finalVideoUrl, // Now using Supabase URL
          duration_seconds: videoResult.duration,
          model_used: 'alibaba/wan-2.5/text-to-video-fast',
          cost_usd: totalCost,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        return NextResponse.json({ error: 'Failed to save video overview' }, { status: 400 });
      }

      return NextResponse.json({ data: video });
    } catch (error) {
      console.error('Video generation error:', error);
      return NextResponse.json(
        {
          error: `Failed to generate video: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Create video error:', error);
    return NextResponse.json({ error: 'Failed to create video' }, { status: 500 });
  }
}
