'use client';

import { motion } from 'framer-motion';
import {
  Video,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Download,
  FileText,
  Clock,
  Loader2,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';

interface VideoOverview {
  id: string;
  style: string;
  status: string;
  script?: string;
  video_url?: string;
  thumbnail_url?: string;
  duration_seconds?: number;
  created_at: string;
}

interface VideoPlayerProps {
  video: VideoOverview | null;
  isGenerating?: boolean;
  onClose?: () => void;
}

export function VideoPlayer({ video, isGenerating, onClose }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [showScript, setShowScript] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const styleNames: Record<string, string> = {
    documentary: 'Documentary (10s)',
    explainer: 'Explainer (5s)',
    presentation: 'Presentation (5s)',
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle real video playback
  useEffect(() => {
    if (video?.video_url && videoRef.current) {
      if (isPlaying) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, video?.video_url]);

  // Handle volume changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  // Set initial duration from video data
  useEffect(() => {
    if (video?.duration_seconds) {
      setDuration(video.duration_seconds);
    }
  }, [video?.duration_seconds]);

  // Generating state
  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20"
        >
          <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
        </motion.div>
        <h3 className="mb-2 text-lg font-semibold text-[var(--text-primary)]">Generating Video</h3>
        <p className="max-w-sm text-center text-sm text-[var(--text-tertiary)]">
          Creating visual explainer from your sources. This may take several minutes...
        </p>
        <div className="mt-4 flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
          <Clock className="h-3.5 w-3.5" />
          Estimated: 5-10 minutes
        </div>
      </div>
    );
  }

  // No video state
  if (!video) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--bg-tertiary)]">
          <Video className="h-8 w-8 text-[var(--text-tertiary)]" />
        </div>
        <h3 className="mb-2 text-lg font-medium text-[var(--text-primary)]">No Video Generated</h3>
        <p className="text-center text-sm text-[var(--text-tertiary)]">
          Generate a video overview to visualize your sources.
        </p>
      </div>
    );
  }

  const videoDuration = duration || video.duration_seconds || 120;
  const progress = videoDuration > 0 ? (currentTime / videoDuration) * 100 : 0;

  const handleSeek = (value: number[]) => {
    const newTime = (value[0] / 100) * videoDuration;
    setCurrentTime(newTime);
    if (videoRef.current && video.video_url) {
      videoRef.current.currentTime = newTime;
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20">
            <Video className="h-6 w-6 text-purple-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              {styleNames[video.style] || 'Video Overview'}
            </h2>
            <p className="text-sm text-[var(--text-tertiary)]">
              {new Date(video.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Real Video Player - only show if we have actual video */}
      {video.video_url ? (
        <>
          <div className="relative mb-6 aspect-video overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[var(--bg-tertiary)]">
            <video
              ref={videoRef}
              src={video.video_url}
              className="h-full w-full bg-black object-contain"
              onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
              onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
              onEnded={() => setIsPlaying(false)}
              onError={(e) => console.error('Video error:', e)}
              playsInline
              controls
            />

            {/* Play/Pause Overlay */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity hover:opacity-100"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90">
                {isPlaying ? (
                  <Pause className="h-8 w-8 text-[var(--bg-primary)]" />
                ) : (
                  <Play className="ml-1 h-8 w-8 text-[var(--bg-primary)]" />
                )}
              </div>
            </button>

            {/* Duration Badge */}
            <div className="absolute right-4 bottom-4 rounded bg-black/70 px-2 py-1 text-xs text-white">
              {formatTime(videoDuration)}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <Slider
              value={[progress]}
              max={100}
              step={0.1}
              onValueChange={handleSeek}
              className="w-full"
            />
            <div className="mt-2 flex justify-between text-xs text-[var(--text-tertiary)]">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(videoDuration)}</span>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setIsPlaying(!isPlaying)}
                className="h-10 w-10 rounded-full bg-purple-500 text-white hover:bg-purple-500/90"
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMuted(!isMuted)}
                className="h-9 w-9 text-[var(--text-tertiary)]"
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>

              <Slider
                value={[isMuted ? 0 : volume]}
                max={100}
                onValueChange={(value) => {
                  setVolume(value[0]);
                  setIsMuted(value[0] === 0);
                }}
                className="w-20"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                className="h-9 w-9 text-[var(--text-tertiary)]"
              >
                <Maximize className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.open(video.video_url, '_blank')}
                className="h-9 w-9 text-[var(--text-tertiary)]"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      ) : (
        /* Script-only mode - video generation may have failed */
        <div className="mb-6 rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-pink-500/5 p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20">
              <FileText className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                Video Prompt Generated
              </p>
              <p className="text-xs text-[var(--text-tertiary)]">
                Video rendering may still be processing
              </p>
            </div>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            The video prompt is ready below. If the video doesn&apos;t appear, try generating again.
          </p>
        </div>
      )}

      {/* Script Section - always visible for script-only mode */}
      <div className="min-h-0 flex-1">
        <button
          onClick={() => setShowScript(!showScript)}
          className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <FileText className="h-4 w-4" />
          Video Script
          <span className="text-[var(--text-tertiary)]">({showScript ? 'hide' : 'show'})</span>
        </button>

        {showScript && video.script && (
          <ScrollArea className="h-64 flex-1 rounded-xl border border-[rgba(255,255,255,0.1)] bg-[var(--bg-tertiary)]">
            <div className="p-4">
              <pre className="font-sans text-sm leading-relaxed whitespace-pre-wrap text-[var(--text-secondary)]">
                {video.script}
              </pre>
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
