'use client';

import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useRef } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface FeaturedNotebook {
  id: string;
  emoji: string;
  name: string;
  sourceCount: number;
  description?: string | null;
  gradient?: string;
}

interface FeaturedCarouselProps {
  notebooks: FeaturedNotebook[];
  onOpen: (id: string) => void;
}

const gradients = [
  'from-purple-600/20 to-pink-600/20',
  'from-blue-600/20 to-cyan-600/20',
  'from-orange-600/20 to-red-600/20',
  'from-green-600/20 to-teal-600/20',
];

export function FeaturedCarousel({ notebooks, onOpen }: FeaturedCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 340; // Card width + gap
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (notebooks.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.1)] bg-gradient-to-br from-[var(--accent-primary)]/10 to-[var(--accent-secondary)]/10 p-8">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--bg-tertiary)]">
            <Sparkles className="h-8 w-8 text-[var(--accent-primary)]" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-[var(--text-primary)]">
            No Featured Notebooks
          </h3>
          <p className="max-w-sm text-sm text-[var(--text-secondary)]">
            Star your favorite notebooks to see them featured here for quick access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Section Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[var(--accent-primary)]" />
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Featured</h2>
          <Badge className="border-0 bg-[var(--accent-primary)]/20 text-xs text-[var(--accent-primary)]">
            {notebooks.length}
          </Badge>
        </div>

        {notebooks.length > 2 && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => scroll('left')}
              className="h-8 w-8 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => scroll('right')}
              className="h-8 w-8 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Carousel */}
      <div
        ref={scrollRef}
        className="scrollbar-hide flex gap-4 overflow-x-auto scroll-smooth pb-2"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {notebooks.map((notebook, index) => (
          <motion.div
            key={notebook.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onOpen(notebook.id)}
            className={`w-80 flex-shrink-0 cursor-pointer rounded-2xl bg-gradient-to-br p-5 ${gradients[index % gradients.length]} border border-[rgba(255,255,255,0.1)] transition-all duration-200 hover:border-[rgba(255,255,255,0.2)] hover:shadow-lg`}
            style={{ scrollSnapAlign: 'start' }}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--bg-primary)]/50 text-3xl backdrop-blur-sm">
                {notebook.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-base font-semibold text-[var(--text-primary)]">
                  {notebook.name}
                </h3>
                <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
                  {notebook.sourceCount} source{notebook.sourceCount !== 1 ? 's' : ''}
                </p>
                {notebook.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-[var(--text-tertiary)]">
                    {notebook.description}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Hide scrollbar but keep functionality */}
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
