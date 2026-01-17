'use client';

import { motion } from 'framer-motion';
import {
  Mic,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Download,
  FileText,
  Clock,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';

interface AudioOverview {
  id: string;
  format: string;
  status: string;
  script?: string;
  audio_url?: string;
  duration_seconds?: number;
  created_at: string;
}

interface AudioPlayerProps {
  audio: AudioOverview | null;
  isGenerating?: boolean;
  onClose?: () => void;
}

export function AudioPlayer({ audio, isGenerating }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [showScript, setShowScript] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Handle real audio playback
  useEffect(() => {
    if (audio?.audio_url && audioRef.current) {
      if (isPlaying) {
        audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, audio?.audio_url]);

  // Handle volume changes for real audio
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  // Compute duration: use state for real audio, computed value for simulated
  const fakeDuration = audio?.duration_seconds || 300; // 5 min default
  const effectiveDuration = audio?.audio_url ? duration : fakeDuration;

  // Simulated playback for when no actual audio file
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && !audio?.audio_url) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= fakeDuration) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, audio?.audio_url, fakeDuration]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatNames: Record<string, string> = {
    deep_dive: 'Deep Dive',
    brief: 'Brief Summary',
    critique: 'Critical Analysis',
    debate: 'Debate Format',
  };

  // Generating state
  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-orange-500/20 to-red-500/20"
        >
          <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
        </motion.div>
        <h3 className="mb-2 text-lg font-semibold text-[var(--text-primary)]">Generating Audio</h3>
        <p className="max-w-sm text-center text-sm text-[var(--text-tertiary)]">
          Creating podcast-style audio from your sources. This may take a few minutes...
        </p>
        <div className="mt-4 flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
          <Clock className="h-3.5 w-3.5" />
          Estimated: 2-3 minutes
        </div>
      </div>
    );
  }

  // No audio state
  if (!audio) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--bg-tertiary)]">
          <Mic className="h-8 w-8 text-[var(--text-tertiary)]" />
        </div>
        <h3 className="mb-2 text-lg font-medium text-[var(--text-primary)]">No Audio Generated</h3>
        <p className="text-center text-sm text-[var(--text-tertiary)]">
          Generate an audio overview to listen to your sources as a podcast.
        </p>
      </div>
    );
  }

  const progress = effectiveDuration > 0 ? (currentTime / effectiveDuration) * 100 : 0;
  const isDemoMode = !audio.audio_url;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20">
            <Mic className="h-6 w-6 text-orange-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              {formatNames[audio.format] || 'Audio Overview'}
            </h2>
            <p className="text-sm text-[var(--text-tertiary)]">
              {new Date(audio.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {isDemoMode && (
          <div className="flex items-start gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
            <p className="text-xs text-blue-400">
              Script generated. Audio playback is simulated - actual TTS synthesis coming soon.
            </p>
          </div>
        )}
      </div>

      {/* Waveform / Album Art Area */}
      <div className="relative mb-6 rounded-2xl border border-[rgba(255,255,255,0.1)] bg-gradient-to-br from-orange-500/10 to-red-500/10 p-8">
        {/* Fake waveform visualization */}
        <div className="flex h-24 items-center justify-center gap-1">
          {Array.from({ length: 40 }).map((_, i) => {
            const height = 20 + Math.sin(i * 0.5 + currentTime * 0.1) * 30 + Math.sin(i * 1.7) * 10;
            const isActive = (i / 40) * 100 <= progress;
            return (
              <motion.div
                key={i}
                animate={{ height: isPlaying ? height : 20 + Math.sin(i * 0.5) * 15 }}
                transition={{ duration: 0.1 }}
                className={`w-1 rounded-full ${isActive ? 'bg-orange-500' : 'bg-[var(--bg-surface)]'}`}
              />
            );
          })}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <Slider
          value={[progress]}
          max={100}
          step={0.1}
          onValueChange={(value) => {
            const newTime = (value[0] / 100) * effectiveDuration;
            setCurrentTime(newTime);
            // Seek in real audio if available
            if (audioRef.current && audio?.audio_url) {
              audioRef.current.currentTime = newTime;
            }
          }}
          className="w-full"
        />
        <div className="mt-2 flex justify-between text-xs text-[var(--text-tertiary)]">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(effectiveDuration)}</span>
        </div>
      </div>

      {/* Playback Controls */}
      <div className="mb-6 flex items-center justify-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            const newTime = Math.max(0, currentTime - 15);
            setCurrentTime(newTime);
            if (audioRef.current && audio?.audio_url) {
              audioRef.current.currentTime = newTime;
            }
          }}
          className="h-10 w-10 rounded-full text-[var(--text-secondary)]"
        >
          <SkipBack className="h-5 w-5" />
        </Button>

        <Button
          onClick={() => setIsPlaying(!isPlaying)}
          className="h-14 w-14 rounded-full bg-orange-500 text-white hover:bg-orange-500/90"
        >
          {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="ml-1 h-6 w-6" />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            const newTime = Math.min(effectiveDuration, currentTime + 15);
            setCurrentTime(newTime);
            if (audioRef.current && audio?.audio_url) {
              audioRef.current.currentTime = newTime;
            }
          }}
          className="h-10 w-10 rounded-full text-[var(--text-secondary)]"
        >
          <SkipForward className="h-5 w-5" />
        </Button>
      </div>

      {/* Volume Control */}
      <div className="mb-6 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMuted(!isMuted)}
          className="h-8 w-8 text-[var(--text-tertiary)]"
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
          className="w-24"
        />
        <span className="w-8 text-xs text-[var(--text-tertiary)]">{isMuted ? 0 : volume}%</span>
      </div>

      {/* Script Section */}
      <div className="min-h-0 flex-1">
        <button
          onClick={() => setShowScript(!showScript)}
          className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <FileText className="h-4 w-4" />
          Script
          <span className="text-[var(--text-tertiary)]">({showScript ? 'hide' : 'show'})</span>
        </button>

        {showScript && audio.script && (
          <ScrollArea className="h-48 flex-1 rounded-xl border border-[rgba(255,255,255,0.1)] bg-[var(--bg-tertiary)]">
            <div className="p-4">
              <pre className="font-sans text-sm leading-relaxed whitespace-pre-wrap text-[var(--text-secondary)]">
                {audio.script}
              </pre>
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Download Button */}
      {audio.audio_url && (
        <Button
          variant="outline"
          className="mt-4 w-full rounded-xl border-[rgba(255,255,255,0.1)]"
          onClick={async () => {
            try {
              const response = await fetch(audio.audio_url!);
              const blob = await response.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${formatNames[audio.format] || 'audio-overview'}-${new Date(audio.created_at).toISOString().slice(0, 10)}.mp3`;
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);
            } catch (error) {
              console.error('Download failed:', error);
            }
          }}
        >
          <Download className="mr-2 h-4 w-4" />
          Download Audio
        </Button>
      )}

      {/* Hidden audio element for real playback */}
      {audio.audio_url && (
        <audio
          ref={audioRef}
          src={audio.audio_url}
          onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
          onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
          onEnded={() => setIsPlaying(false)}
        />
      )}
    </div>
  );
}
