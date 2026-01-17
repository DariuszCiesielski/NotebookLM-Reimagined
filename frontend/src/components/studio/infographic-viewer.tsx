'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Image as ImageIcon,
  Download,
  ZoomIn,
  X,
  ChevronLeft,
  ChevronRight,
  Grid,
  Maximize2,
  Info,
} from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface InfographicImage {
  title: string;
  prompt: string;
  imageData: string;
  mimeType: string;
}

interface InfographicData {
  images: InfographicImage[];
  concepts: string[];
}

interface InfographicViewerProps {
  data: InfographicData;
  onClose?: () => void;
}

export function InfographicViewer({ data, onClose }: InfographicViewerProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'carousel'>('grid');
  const [carouselIndex, setCarouselIndex] = useState(0);

  const downloadImage = (image: InfographicImage, index: number) => {
    const link = document.createElement('a');
    link.href = `data:${image.mimeType};base64,${image.imageData}`;
    link.download = `infographic-${index + 1}-${image.title.toLowerCase().replace(/\s+/g, '-')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAll = () => {
    data.images.forEach((image, index) => {
      setTimeout(() => downloadImage(image, index), index * 500);
    });
  };

  const nextImage = () => {
    setCarouselIndex((prev) => (prev + 1) % data.images.length);
  };

  const prevImage = () => {
    setCarouselIndex((prev) => (prev - 1 + data.images.length) % data.images.length);
  };

  if (!data || !data.images || data.images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <ImageIcon className="mb-4 h-12 w-12 text-[var(--text-tertiary)]" />
        <p className="text-[var(--text-secondary)]">No infographic images available</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500/20 to-pink-500/20">
            <ImageIcon className="h-6 w-6 text-rose-500" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Infographic Images</h2>
            <p className="text-sm text-[var(--text-tertiary)]">
              {data.images.length} images generated
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex overflow-hidden rounded-lg border border-[rgba(255,255,255,0.1)]">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'}`}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('carousel')}
              className={`p-2 ${viewMode === 'carousel' ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'}`}
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadAll}
            className="border-[rgba(255,255,255,0.1)] text-[var(--text-secondary)]"
          >
            <Download className="mr-1.5 h-4 w-4" />
            Download All
          </Button>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <ScrollArea className="flex-1">
          <div className="grid grid-cols-2 gap-4 pb-4">
            {data.images.map((image, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group relative overflow-hidden rounded-xl border border-[rgba(255,255,255,0.1)] bg-[var(--bg-tertiary)]"
              >
                {/* Image */}
                <div className="relative aspect-square">
                  <img
                    src={`data:${image.mimeType};base64,${image.imageData}`}
                    alt={image.title}
                    className="h-full w-full object-cover"
                  />
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-10 w-10 rounded-full bg-white/10 text-white hover:bg-white/20"
                      onClick={() => setSelectedIndex(index)}
                    >
                      <ZoomIn className="h-5 w-5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-10 w-10 rounded-full bg-white/10 text-white hover:bg-white/20"
                      onClick={() => downloadImage(image, index)}
                    >
                      <Download className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
                {/* Title */}
                <div className="p-3">
                  <div className="flex items-center justify-between">
                    <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                      {image.title}
                    </p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">
                          <Info className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <p className="text-xs">{image.prompt}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Carousel View */}
      {viewMode === 'carousel' && (
        <div className="flex flex-1 flex-col">
          <div className="relative flex-1 overflow-hidden rounded-xl border border-[rgba(255,255,255,0.1)] bg-[var(--bg-tertiary)]">
            <AnimatePresence mode="wait">
              <motion.img
                key={carouselIndex}
                src={`data:${data.images[carouselIndex].mimeType};base64,${data.images[carouselIndex].imageData}`}
                alt={data.images[carouselIndex].title}
                className="h-full w-full object-contain"
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.3 }}
              />
            </AnimatePresence>
            {/* Navigation arrows */}
            <button
              onClick={prevImage}
              className="absolute top-1/2 left-4 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={nextImage}
              className="absolute top-1/2 right-4 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
            {/* Download button */}
            <Button
              size="icon"
              variant="ghost"
              className="absolute right-4 bottom-4 h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70"
              onClick={() => downloadImage(data.images[carouselIndex], carouselIndex)}
            >
              <Download className="h-5 w-5" />
            </Button>
          </div>
          {/* Info bar */}
          <div className="mt-4 rounded-xl border border-[rgba(255,255,255,0.1)] bg-[var(--bg-tertiary)] p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                {data.images[carouselIndex].title}
              </h3>
              <span className="text-sm text-[var(--text-tertiary)]">
                {carouselIndex + 1} / {data.images.length}
              </span>
            </div>
            <p className="line-clamp-2 text-sm text-[var(--text-secondary)]">
              {data.images[carouselIndex].prompt}
            </p>
          </div>
          {/* Thumbnail strip */}
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
            {data.images.map((image, index) => (
              <button
                key={index}
                onClick={() => setCarouselIndex(index)}
                className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                  index === carouselIndex
                    ? 'border-[var(--accent-primary)]'
                    : 'border-transparent hover:border-[rgba(255,255,255,0.2)]'
                }`}
              >
                <img
                  src={`data:${image.mimeType};base64,${image.imageData}`}
                  alt={image.title}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
            onClick={() => setSelectedIndex(null)}
          >
            <button
              className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              onClick={() => setSelectedIndex(null)}
            >
              <X className="h-6 w-6" />
            </button>
            <button
              className="absolute right-4 bottom-4 flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-white hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation();
                downloadImage(data.images[selectedIndex], selectedIndex);
              }}
            >
              <Download className="h-5 w-5" />
              Download
            </button>
            <motion.img
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              src={`data:${data.images[selectedIndex].mimeType};base64,${data.images[selectedIndex].imageData}`}
              alt={data.images[selectedIndex].title}
              className="max-h-[90vh] max-w-[90vw] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-4 left-4 max-w-md">
              <h3 className="mb-1 text-lg font-semibold text-white">
                {data.images[selectedIndex].title}
              </h3>
              <p className="line-clamp-2 text-sm text-white/70">
                {data.images[selectedIndex].prompt}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
