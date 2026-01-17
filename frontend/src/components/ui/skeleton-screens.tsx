'use client';

import { motion } from 'framer-motion';

import { cn } from '@/lib/utils';

// Base skeleton with shimmer animation
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('animate-pulse rounded-lg bg-[var(--bg-tertiary)]', className)} {...props} />
  );
}

// Notebook page skeleton - shows immediately while data loads
export function NotebookPageSkeleton() {
  return (
    <div className="flex min-h-screen bg-[var(--bg-primary)]">
      {/* Left panel - Sources */}
      <div className="w-80 space-y-4 border-r border-[rgba(255,255,255,0.06)] p-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-6 w-32" />
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg bg-[var(--bg-secondary)] p-3"
            >
              <Skeleton className="h-4 w-4 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Center panel - Chat */}
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-4 flex-1 space-y-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                'max-w-[80%] rounded-2xl p-4',
                i % 2 === 0 ? 'ml-auto bg-[var(--accent-primary)]/20' : 'bg-[var(--bg-secondary)]'
              )}
            >
              <Skeleton className="mb-2 h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
        <Skeleton className="h-14 w-full rounded-2xl" />
      </div>

      {/* Right panel - Studio */}
      <div className="w-80 space-y-4 border-l border-[rgba(255,255,255,0.06)] p-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl bg-[var(--bg-secondary)] p-4">
            <div className="mb-3 flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div className="flex-1">
                <Skeleton className="mb-1 h-5 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Dashboard skeleton for notebook cards
export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-8">
      <div className="mx-auto max-w-6xl">
        <Skeleton className="mb-8 h-10 w-48" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[var(--bg-secondary)] p-6"
            >
              <Skeleton className="mb-3 h-6 w-3/4" />
              <Skeleton className="mb-2 h-4 w-full" />
              <Skeleton className="mb-4 h-4 w-2/3" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// History page skeleton - content only (no wrapper for embedding)
export function HistoryPageSkeleton() {
  return (
    <motion.div
      key="skeleton"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-4"
    >
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <div className="flex-1">
              <Skeleton className="mb-2 h-5 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </motion.div>
  );
}

// Chat panel skeleton
export function ChatPanelSkeleton() {
  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-4 flex-1 space-y-4 overflow-hidden">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              'max-w-[80%] rounded-2xl p-4',
              i % 2 === 0 ? 'ml-auto bg-[var(--accent-primary)]/10' : 'bg-[var(--bg-secondary)]'
            )}
          >
            <Skeleton className="mb-2 h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
      <Skeleton className="h-14 w-full rounded-2xl" />
    </div>
  );
}

// Sources panel skeleton
export function SourcesPanelSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-10 w-full rounded-lg" />
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg bg-[var(--bg-secondary)] p-3">
            <Skeleton className="h-4 w-4 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Studio panel skeleton
export function StudioPanelSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl bg-[var(--bg-secondary)] p-4">
          <div className="mb-3 flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="flex-1">
              <Skeleton className="mb-1 h-5 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-6 w-6" />
          </div>
        </div>
      ))}
    </div>
  );
}

export { Skeleton };
