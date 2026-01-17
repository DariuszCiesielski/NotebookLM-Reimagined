'use client';

import {
  Mic,
  Video,
  Search,
  Table2,
  FileText,
  Presentation,
  Image,
  Layers,
  HelpCircle,
  BookOpen,
  MessageCircleQuestion,
  Network,
  StickyNote,
  Clock,
  Loader2,
} from 'lucide-react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import type { HistoryItemType } from '@/app/api/notebooks/[id]/history/route';

// Format relative time
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export interface HistoryCardProps {
  id: string;
  type: HistoryItemType;
  title: string;
  preview: Record<string, unknown>;
  status: string;
  created_at: string;
  onClick?: () => void;
}

// Type-specific configuration
const typeConfig: Record<
  HistoryItemType,
  {
    icon: React.ElementType;
    label: string;
    gradient: string;
    badgeColor: string;
  }
> = {
  audio: {
    icon: Mic,
    label: 'Audio',
    gradient: 'from-orange-500/20 to-amber-500/20',
    badgeColor: 'bg-orange-500/20 text-orange-400',
  },
  video: {
    icon: Video,
    label: 'Video',
    gradient: 'from-purple-500/20 to-violet-500/20',
    badgeColor: 'bg-purple-500/20 text-purple-400',
  },
  research: {
    icon: Search,
    label: 'Research',
    gradient: 'from-blue-500/20 to-cyan-500/20',
    badgeColor: 'bg-blue-500/20 text-blue-400',
  },
  data_table: {
    icon: Table2,
    label: 'Table',
    gradient: 'from-emerald-500/20 to-green-500/20',
    badgeColor: 'bg-emerald-500/20 text-emerald-400',
  },
  report: {
    icon: FileText,
    label: 'Report',
    gradient: 'from-blue-500/20 to-indigo-500/20',
    badgeColor: 'bg-blue-500/20 text-blue-400',
  },
  slide_deck: {
    icon: Presentation,
    label: 'Slides',
    gradient: 'from-violet-500/20 to-purple-500/20',
    badgeColor: 'bg-violet-500/20 text-violet-400',
  },
  infographic: {
    icon: Image,
    label: 'Infographic',
    gradient: 'from-rose-500/20 to-pink-500/20',
    badgeColor: 'bg-rose-500/20 text-rose-400',
  },
  flashcards: {
    icon: Layers,
    label: 'Flashcards',
    gradient: 'from-blue-500/20 to-sky-500/20',
    badgeColor: 'bg-blue-500/20 text-blue-400',
  },
  quiz: {
    icon: HelpCircle,
    label: 'Quiz',
    gradient: 'from-purple-500/20 to-fuchsia-500/20',
    badgeColor: 'bg-purple-500/20 text-purple-400',
  },
  study_guide: {
    icon: BookOpen,
    label: 'Study Guide',
    gradient: 'from-orange-500/20 to-yellow-500/20',
    badgeColor: 'bg-orange-500/20 text-orange-400',
  },
  faq: {
    icon: MessageCircleQuestion,
    label: 'FAQ',
    gradient: 'from-teal-500/20 to-emerald-500/20',
    badgeColor: 'bg-teal-500/20 text-teal-400',
  },
  mind_map: {
    icon: Network,
    label: 'Mind Map',
    gradient: 'from-cyan-500/20 to-blue-500/20',
    badgeColor: 'bg-cyan-500/20 text-cyan-400',
  },
  note: {
    icon: StickyNote,
    label: 'Note',
    gradient: 'from-amber-500/20 to-yellow-500/20',
    badgeColor: 'bg-amber-500/20 text-amber-400',
  },
};

function getPreviewText(type: HistoryItemType, preview: Record<string, unknown>): string {
  switch (type) {
    case 'audio':
      const duration = preview.duration_seconds as number;
      return duration
        ? `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')} duration`
        : 'Audio overview';
    case 'video':
      const videoDuration = preview.duration_seconds as number;
      return videoDuration ? `${videoDuration}s • ${preview.style || 'video'}` : 'Video overview';
    case 'research':
      return (preview.query as string) || 'Research report';
    case 'data_table':
      return `${preview.row_count || 0} rows × ${preview.column_count || 0} columns`;
    case 'report':
      return `${preview.report_type || 'Report'} • ${preview.section_count || 0} sections`;
    case 'slide_deck':
      return `${preview.slide_count || 0} slides`;
    case 'infographic':
      return `${preview.image_count || 0} images`;
    case 'flashcards':
      return `${preview.card_count || 0} cards`;
    case 'quiz':
      return `${preview.question_count || 0} questions`;
    case 'study_guide':
      return `${preview.section_count || 0} sections`;
    case 'faq':
      return `${preview.item_count || 0} items`;
    case 'mind_map':
      return `${preview.node_count || 0} nodes`;
    case 'note':
      return (preview.content_preview as string)?.slice(0, 60) || 'Note';
    default:
      return '';
  }
}

export function HistoryCard({
  id,
  type,
  title,
  preview,
  status,
  created_at,
  onClick,
}: HistoryCardProps) {
  const config = typeConfig[type] || typeConfig.note;
  const Icon = config.icon;
  const previewText = getPreviewText(type, preview);
  const isProcessing = status === 'processing';
  const timeAgo = formatTimeAgo(created_at);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            'w-full rounded-lg border border-[rgba(255,255,255,0.06)] p-3 text-left',
            'bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)]',
            'group transition-all duration-200',
            'focus:ring-2 focus:ring-[var(--accent-primary)]/50 focus:outline-none'
          )}
        >
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div
              className={cn(
                'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg',
                `bg-gradient-to-br ${config.gradient}`
              )}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin text-[var(--text-secondary)]" />
              ) : (
                <Icon className="h-4 w-4 text-[var(--text-secondary)]" />
              )}
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="mb-0.5 flex items-center gap-2">
                <span className="truncate text-sm font-medium text-[var(--text-primary)]">
                  {title}
                </span>
                <span
                  className={cn(
                    'flex-shrink-0 rounded-full px-1.5 py-0.5 text-[10px]',
                    config.badgeColor
                  )}
                >
                  {config.label}
                </span>
              </div>
              <p className="truncate text-xs text-[var(--text-tertiary)]">{previewText}</p>
            </div>

            {/* Timestamp */}
            <div className="flex flex-shrink-0 items-center gap-1 text-[10px] text-[var(--text-tertiary)]">
              <Clock className="h-3 w-3" />
              <span className="whitespace-nowrap">{timeAgo}</span>
            </div>
          </div>
        </button>
      </TooltipTrigger>
      <TooltipContent side="left" className="max-w-xs">
        <p className="text-xs font-medium">{title}</p>
        <p className="text-muted-foreground mt-1 text-xs">{previewText}</p>
      </TooltipContent>
    </Tooltip>
  );
}
