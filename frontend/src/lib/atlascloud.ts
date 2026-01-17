// AtlasCloud Video Generation Client (Wan 2.5)

const ATLASCLOUD_BASE_URL = 'https://api.atlascloud.ai';
const MODEL_ID = 'alibaba/wan-2.5/text-to-video-fast';

// Cost per second for Wan 2.5 (~$0.02/second)
export const VIDEO_COST_PER_SECOND = 0.02;

interface GenerateVideoOptions {
  prompt: string;
  duration?: 5 | 10;
  size?: '1280*720' | '720*1280' | '1920*1080' | '1080*1920';
  negativePrompt?: string;
  enablePromptExpansion?: boolean;
  seed?: number;
}

interface GenerateResponse {
  requestId: string;
  status: string;
}

interface StatusResponse {
  status: 'created' | 'processing' | 'completed' | 'succeeded' | 'failed';
  outputs: Array<string | { url: string }>;
  hasNsfwContents?: boolean[];
  error?: string;
}

export function isAtlasCloudConfigured(): boolean {
  return !!process.env.ATLASCLOUD_API_KEY;
}

/**
 * Start video generation with AtlasCloud Wan 2.5
 */
export async function generateVideo(options: GenerateVideoOptions): Promise<GenerateResponse> {
  const apiKey = process.env.ATLASCLOUD_API_KEY;

  if (!apiKey) {
    throw new Error('AtlasCloud API key not configured');
  }

  const payload = {
    model: MODEL_ID,
    prompt: options.prompt,
    size: options.size || '1280*720',
    duration: options.duration || 5,
    enable_prompt_expansion: options.enablePromptExpansion ?? true,
    seed: options.seed ?? -1,
    ...(options.negativePrompt && { negative_prompt: options.negativePrompt }),
  };

  const response = await fetch(`${ATLASCLOUD_BASE_URL}/api/v1/model/generateVideo`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AtlasCloud API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  const requestId = result?.data?.id;

  if (!requestId) {
    throw new Error(`No request ID in response: ${JSON.stringify(result)}`);
  }

  return {
    requestId,
    status: 'processing',
  };
}

/**
 * Check the status of a video generation request
 */
export async function checkVideoStatus(requestId: string): Promise<StatusResponse> {
  const apiKey = process.env.ATLASCLOUD_API_KEY;

  if (!apiKey) {
    throw new Error('AtlasCloud API key not configured');
  }

  const response = await fetch(`${ATLASCLOUD_BASE_URL}/api/v1/model/result/${requestId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`AtlasCloud status check error: ${response.status}`);
  }

  const result = await response.json();
  const data = result?.data || {};

  return {
    status: data.status || 'unknown',
    outputs: data.outputs || [],
    hasNsfwContents: data.has_nsfw_contents,
    error: data.error,
  };
}

/**
 * Wait for video generation to complete
 */
export async function waitForVideoCompletion(
  requestId: string,
  maxWaitSeconds: number = 300,
  pollInterval: number = 3000
): Promise<string> {
  const startTime = Date.now();
  const maxWaitMs = maxWaitSeconds * 1000;

  while (Date.now() - startTime < maxWaitMs) {
    const status = await checkVideoStatus(requestId);

    if (status.status === 'completed' || status.status === 'succeeded') {
      if (status.outputs && status.outputs.length > 0) {
        // Extract URL from outputs (could be string or object with url)
        const output = status.outputs[0];
        const videoUrl = typeof output === 'string' ? output : output.url;
        if (videoUrl) {
          return videoUrl;
        }
      }
      throw new Error('Video completed but no output URL found');
    }

    if (status.status === 'failed') {
      throw new Error(`Video generation failed: ${status.error || 'Unknown error'}`);
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new Error(`Video generation timed out after ${maxWaitSeconds} seconds`);
}

/**
 * Generate video and wait for completion
 */
export async function generateVideoAndWait(options: GenerateVideoOptions): Promise<{
  videoUrl: string;
  duration: number;
  cost: number;
}> {
  const { requestId } = await generateVideo(options);
  const videoUrl = await waitForVideoCompletion(requestId);
  const duration = options.duration || 5;

  return {
    videoUrl,
    duration,
    cost: duration * VIDEO_COST_PER_SECOND,
  };
}

// Style configurations for video generation
export const VIDEO_STYLES = {
  documentary: {
    name: 'Documentary',
    description: 'Cinematic documentary style',
    duration: 10 as const,
    promptStyle:
      'cinematic documentary footage, professional cinematography, dramatic lighting, smooth camera movements, 4K quality',
    negativePrompt: 'text, watermark, logo, low quality, blurry, distorted',
  },
  explainer: {
    name: 'Explainer',
    description: 'Educational explainer with graphics',
    duration: 5 as const,
    promptStyle:
      'educational visualization, clean modern graphics, infographic style, smooth animations, professional presentation',
    negativePrompt: 'text, watermark, logo, cluttered, messy, low quality',
  },
  presentation: {
    name: 'Presentation',
    description: 'Business presentation style',
    duration: 5 as const,
    promptStyle:
      'professional business presentation, clean corporate aesthetic, modern office environment, polished visuals',
    negativePrompt: 'text, watermark, logo, unprofessional, casual, low quality',
  },
} as const;

export type VideoStyle = keyof typeof VIDEO_STYLES;
