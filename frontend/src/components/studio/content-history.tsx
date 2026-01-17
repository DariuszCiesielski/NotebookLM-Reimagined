'use client';

import { History, RefreshCw, Filter, Loader2 } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { createClient } from '@/lib/supabase';

import { HistoryCard } from './history-card';

import type { HistoryItem, HistoryItemType } from '@/app/api/notebooks/[id]/history/route';


interface ContentHistoryProps {
  notebookId: string;
  onSelectItem: (item: HistoryItem) => void;
}

const typeLabels: Record<HistoryItemType, string> = {
  audio: 'Audio',
  video: 'Video',
  research: 'Research',
  data_table: 'Data Table',
  report: 'Report',
  slide_deck: 'Slides',
  infographic: 'Infographic',
  flashcards: 'Flashcards',
  quiz: 'Quiz',
  study_guide: 'Study Guide',
  faq: 'FAQ',
  mind_map: 'Mind Map',
  note: 'Notes',
};

export function ContentHistory({ notebookId, onSelectItem }: ContentHistoryProps) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterTypes, setFilterTypes] = useState<HistoryItemType[]>([]);

  const fetchHistory = useCallback(
    async (refresh = false) => {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          setError('Not authenticated');
          return;
        }

        const params = new URLSearchParams({
          limit: '50',
          offset: '0',
        });

        if (filterTypes.length > 0) {
          params.set('types', filterTypes.join(','));
        }

        const response = await fetch(`/api/notebooks/${notebookId}/history?${params}`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch history');
        }

        const result = await response.json();
        setItems(result.data || []);
        setTotal(result.total || 0);
      } catch (err) {
        console.error('Fetch history error:', err);
        setError('Failed to load history');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [notebookId, filterTypes]
  );

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const toggleFilter = (type: HistoryItemType) => {
    setFilterTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const clearFilters = () => {
    setFilterTypes([]);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--text-tertiary)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="mb-2 text-sm text-[var(--text-tertiary)]">{error}</p>
        <Button variant="ghost" size="sm" onClick={() => fetchHistory()} className="text-xs">
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header with filter and refresh */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--text-tertiary)]">
          {filterTypes.length > 0 ? `Showing ${items.length} of ${total} items` : `${total} items`}
        </span>
        <div className="flex items-center gap-1">
          {/* Filter dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`h-7 w-7 ${filterTypes.length > 0 ? 'text-[var(--accent-primary)]' : 'text-[var(--text-tertiary)]'}`}
              >
                <Filter className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {(Object.keys(typeLabels) as HistoryItemType[]).map((type) => (
                <DropdownMenuCheckboxItem
                  key={type}
                  checked={filterTypes.includes(type)}
                  onCheckedChange={() => toggleFilter(type)}
                >
                  {typeLabels[type]}
                </DropdownMenuCheckboxItem>
              ))}
              {filterTypes.length > 0 && (
                <DropdownMenuCheckboxItem
                  checked={false}
                  onCheckedChange={clearFilters}
                  className="text-[var(--text-tertiary)]"
                >
                  Clear filters
                </DropdownMenuCheckboxItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Refresh button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fetchHistory(true)}
            disabled={isRefreshing}
            className="h-7 w-7 text-[var(--text-tertiary)]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Content list */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <History className="mb-2 h-8 w-8 text-[var(--text-tertiary)] opacity-50" />
          <p className="text-sm text-[var(--text-tertiary)]">
            {filterTypes.length > 0 ? 'No items match your filters' : 'No generated content yet'}
          </p>
          <p className="mt-1 text-xs text-[var(--text-tertiary)] opacity-70">
            Generate audio, video, study materials, or creative outputs to see them here
          </p>
        </div>
      ) : (
        <ScrollArea className="h-[320px]">
          <div className="space-y-2 pr-2">
            {items.map((item) => (
              <HistoryCard
                key={`${item.type}-${item.id}`}
                id={item.id}
                type={item.type}
                title={item.title}
                preview={item.preview}
                status={item.status}
                created_at={item.created_at}
                onClick={() => onSelectItem(item)}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

export { type HistoryItem };
