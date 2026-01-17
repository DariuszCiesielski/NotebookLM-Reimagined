'use client';

import { motion } from 'framer-motion';
import { MoreHorizontal, Trash2, Edit2, Copy, Star } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NotebookCardProps {
  id: string;
  emoji: string;
  name: string;
  sourceCount: number;
  description?: string | null;
  lastEdited?: string;
  isFeatured?: boolean;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onRename?: (id: string) => void;
  onToggleFeatured?: (id: string) => void;
}

export function NotebookCard({
  id,
  emoji,
  name,
  sourceCount,
  description,
  lastEdited,
  isFeatured,
  onOpen,
  onDelete,
  onDuplicate,
  onRename,
  onToggleFeatured,
}: NotebookCardProps) {
  const CardContent = () => (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="group relative cursor-pointer rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[var(--bg-secondary)] p-5 transition-all duration-200 hover:border-[rgba(255,255,255,0.15)] hover:shadow-lg"
      onClick={() => onOpen(id)}
    >
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--bg-tertiary)] text-2xl">
            {emoji}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-[var(--text-primary)]">{name}</h3>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="text-sm text-[var(--text-tertiary)]">
                {sourceCount} source{sourceCount !== 1 ? 's' : ''}
              </span>
              {isFeatured && (
                <Badge className="h-5 border-0 bg-[var(--accent-primary)]/20 py-0 text-xs text-[var(--accent-primary)]">
                  Featured
                </Badge>
              )}
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <MoreHorizontal className="h-4 w-4 text-[var(--text-secondary)]" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-48 border-[rgba(255,255,255,0.1)] bg-[var(--bg-secondary)]"
          >
            {onRename && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onRename(id);
                }}
                className="cursor-pointer"
              >
                <Edit2 className="mr-2 h-4 w-4" />
                Rename
              </DropdownMenuItem>
            )}
            {onDuplicate && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate(id);
                }}
                className="cursor-pointer"
              >
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
            )}
            {onToggleFeatured && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFeatured(id);
                }}
                className="cursor-pointer"
              >
                <Star
                  className={`mr-2 h-4 w-4 ${isFeatured ? 'fill-[var(--accent-primary)] text-[var(--accent-primary)]' : ''}`}
                />
                {isFeatured ? 'Remove from Featured' : 'Add to Featured'}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator className="bg-[rgba(255,255,255,0.1)]" />
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDelete(id);
              }}
              className="cursor-pointer text-[var(--error)] focus:text-[var(--error)]"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Description */}
      {description && (
        <p className="mb-4 line-clamp-2 text-sm text-[var(--text-secondary)]">{description}</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)]">
        <span>{lastEdited ? `Edited ${lastEdited}` : 'Never edited'}</span>
      </div>
    </motion.div>
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <CardContent />
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48 border-[rgba(255,255,255,0.1)] bg-[var(--bg-secondary)]">
        <ContextMenuItem onClick={() => onOpen(id)} className="cursor-pointer">
          Open Notebook
        </ContextMenuItem>
        {onRename && (
          <ContextMenuItem onClick={() => onRename(id)} className="cursor-pointer">
            <Edit2 className="mr-2 h-4 w-4" />
            Rename
          </ContextMenuItem>
        )}
        {onDuplicate && (
          <ContextMenuItem onClick={() => onDuplicate(id)} className="cursor-pointer">
            <Copy className="mr-2 h-4 w-4" />
            Duplicate
          </ContextMenuItem>
        )}
        {onToggleFeatured && (
          <ContextMenuItem onClick={() => onToggleFeatured(id)} className="cursor-pointer">
            <Star
              className={`mr-2 h-4 w-4 ${isFeatured ? 'fill-[var(--accent-primary)] text-[var(--accent-primary)]' : ''}`}
            />
            {isFeatured ? 'Remove from Featured' : 'Add to Featured'}
          </ContextMenuItem>
        )}
        <ContextMenuSeparator className="bg-[rgba(255,255,255,0.1)]" />
        <ContextMenuItem
          onClick={() => onDelete(id)}
          className="cursor-pointer text-[var(--error)] focus:text-[var(--error)]"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

export function CreateNotebookCard({ onClick }: { onClick: () => void }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="relative flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[rgba(255,255,255,0.15)] bg-[var(--bg-secondary)] p-5 transition-all duration-200 hover:border-[var(--accent-primary)]/50 hover:bg-[var(--bg-tertiary)]/30"
    >
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--bg-tertiary)]">
        <span className="text-3xl">+</span>
      </div>
      <h3 className="text-base font-semibold text-[var(--text-primary)]">Create New</h3>
      <p className="mt-1 text-sm text-[var(--text-tertiary)]">Start a new research notebook</p>
    </motion.div>
  );
}
