'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Shuffle,
  Check,
  X,
  BookOpen,
  Keyboard,
  Download,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import {
  exportFlashcardsToExcel,
  exportFlashcardsToPDF,
  generateFilename,
} from '@/lib/export-utils';

interface Flashcard {
  id: string;
  front: string;
  back: string;
}

interface FlashcardViewerProps {
  flashcards: Flashcard[];
  onClose?: () => void;
}

export function FlashcardViewer({ flashcards, onClose }: FlashcardViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCards, setKnownCards] = useState<Set<string>>(new Set());
  const [unknownCards, setUnknownCards] = useState<Set<string>>(new Set());
  const [showControls, setShowControls] = useState(true);
  const [shuffledCards, setShuffledCards] = useState<Flashcard[]>(flashcards);
  const [isExporting, setIsExporting] = useState(false);

  // Export handlers
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      await exportFlashcardsToExcel(
        flashcards.map((c) => ({ front: c.front, back: c.back })),
        generateFilename('flashcards')
      );
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      await exportFlashcardsToPDF(
        flashcards.map((c) => ({ front: c.front, back: c.back })),
        'Flashcards',
        generateFilename('flashcards')
      );
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const currentCard = shuffledCards[currentIndex];
  const progress = ((currentIndex + 1) / shuffledCards.length) * 100;

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case ' ':
        case 'Enter':
          e.preventDefault();
          setIsFlipped(!isFlipped);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
            setIsFlipped(false);
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (currentIndex < shuffledCards.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setIsFlipped(false);
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          markKnown();
          break;
        case 'ArrowDown':
          e.preventDefault();
          markUnknown();
          break;
        case 'r':
          e.preventDefault();
          resetDeck();
          break;
        case 's':
          e.preventDefault();
          shuffleDeck();
          break;
      }
    },
    [currentIndex, isFlipped, shuffledCards.length]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const nextCard = () => {
    if (currentIndex < shuffledCards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const prevCard = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const markKnown = () => {
    if (currentCard) {
      const newKnown = new Set(knownCards);
      newKnown.add(currentCard.id);
      setKnownCards(newKnown);
      unknownCards.delete(currentCard.id);
      setUnknownCards(new Set(unknownCards));
      nextCard();
    }
  };

  const markUnknown = () => {
    if (currentCard) {
      const newUnknown = new Set(unknownCards);
      newUnknown.add(currentCard.id);
      setUnknownCards(newUnknown);
      knownCards.delete(currentCard.id);
      setKnownCards(new Set(knownCards));
      nextCard();
    }
  };

  const resetDeck = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setKnownCards(new Set());
    setUnknownCards(new Set());
    setShuffledCards(flashcards);
  };

  const shuffleDeck = () => {
    const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
    setShuffledCards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const reviewUnknown = () => {
    const unknownFlashcards = flashcards.filter((c) => unknownCards.has(c.id));
    if (unknownFlashcards.length > 0) {
      setShuffledCards(unknownFlashcards);
      setCurrentIndex(0);
      setIsFlipped(false);
    }
  };

  // Check if we're done
  const isDone =
    currentIndex === shuffledCards.length - 1 &&
    (knownCards.has(currentCard?.id) || unknownCards.has(currentCard?.id));

  if (shuffledCards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <BookOpen className="mb-4 h-12 w-12 text-[var(--text-tertiary)]" />
        <p className="text-[var(--text-secondary)]">No flashcards available</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Progress Header */}
      <div className="mb-6 space-y-3">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="whitespace-nowrap text-[var(--text-tertiary)]">
            Card {currentIndex + 1} of {shuffledCards.length}
          </span>
          <div className="flex flex-shrink-0 items-center gap-3 text-xs">
            <span className="flex items-center gap-1 whitespace-nowrap text-[var(--success)]">
              <Check className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{knownCards.size}</span>
            </span>
            <span className="flex items-center gap-1 whitespace-nowrap text-[var(--error)]">
              <X className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{unknownCards.size}</span>
            </span>
          </div>
        </div>
        <Progress value={progress} className="h-2 bg-[var(--bg-tertiary)]" />
      </div>

      {/* Flashcard */}
      <div className="perspective-1000 flex min-h-[280px] flex-1 items-center justify-center">
        <motion.div
          className="relative w-full max-w-md cursor-pointer"
          onClick={() => setIsFlipped(!isFlipped)}
          style={{ transformStyle: 'preserve-3d' }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={`${currentCard?.id}-${isFlipped}`}
              initial={{ rotateY: isFlipped ? -90 : 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: isFlipped ? 90 : -90, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className={`min-h-[250px] rounded-2xl border-2 p-8 transition-colors ${
                isFlipped
                  ? 'border-[var(--accent-primary)]/30 bg-gradient-to-br from-[var(--accent-primary)]/10 to-[var(--accent-secondary)]/10'
                  : 'border-[rgba(255,255,255,0.1)] bg-gradient-to-br from-[var(--bg-tertiary)] to-[var(--bg-surface)]'
              } flex flex-col justify-center shadow-xl hover:shadow-2xl`}
            >
              {/* Card Label */}
              <div className="absolute top-4 left-4">
                <span
                  className={`rounded-md px-2 py-1 text-xs font-semibold tracking-wider uppercase ${
                    isFlipped
                      ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]'
                      : 'bg-[var(--bg-surface)] text-[var(--text-tertiary)]'
                  } `}
                >
                  {isFlipped ? 'Answer' : 'Question'}
                </span>
              </div>

              {/* Card Content */}
              <div className="mt-4 text-center">
                <p className="text-xl leading-relaxed font-medium text-[var(--text-primary)]">
                  {isFlipped ? currentCard?.back : currentCard?.front}
                </p>
              </div>

              {/* Tap Hint */}
              <div className="absolute right-0 bottom-4 left-0 text-center">
                <span className="text-xs text-[var(--text-tertiary)]">
                  {isFlipped ? 'Tap to see question' : 'Tap to reveal answer'}
                </span>
              </div>

              {/* Card Number Badge */}
              <div className="absolute top-4 right-4">
                <span className="font-mono text-xs text-[var(--text-tertiary)]">
                  #{currentIndex + 1}
                </span>
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Action Buttons - Show after flip */}
      <AnimatePresence>
        {isFlipped && !isDone && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="my-6 flex justify-center gap-3"
          >
            <Button
              onClick={(e) => {
                e.stopPropagation();
                markUnknown();
              }}
              className="h-12 max-w-[140px] flex-1 rounded-xl border border-[var(--error)]/30 bg-[var(--error)]/10 text-[var(--error)] hover:bg-[var(--error)]/20"
            >
              <X className="mr-2 h-5 w-5" />
              Study Again
            </Button>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                markKnown();
              }}
              className="h-12 max-w-[140px] flex-1 rounded-xl border border-[var(--success)]/30 bg-[var(--success)]/10 text-[var(--success)] hover:bg-[var(--success)]/20"
            >
              <Check className="mr-2 h-5 w-5" />
              Got It!
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className="mt-4 flex items-center justify-between gap-4">
        <Button
          variant="outline"
          size="icon"
          disabled={currentIndex === 0}
          onClick={prevCard}
          className="h-11 w-11 rounded-xl border-[rgba(255,255,255,0.1)] disabled:opacity-30"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        {/* Card Position Dots */}
        <div className="flex max-w-[200px] gap-1.5 overflow-x-auto py-2">
          {shuffledCards.map((card, idx) => (
            <button
              key={card.id}
              onClick={() => {
                setCurrentIndex(idx);
                setIsFlipped(false);
              }}
              className={`h-2 w-2 flex-shrink-0 rounded-full transition-all ${
                idx === currentIndex
                  ? 'w-6 bg-[var(--accent-primary)]'
                  : knownCards.has(card.id)
                    ? 'bg-[var(--success)]'
                    : unknownCards.has(card.id)
                      ? 'bg-[var(--error)]'
                      : 'bg-[var(--bg-surface)] hover:bg-[var(--text-tertiary)]'
              } `}
            />
          ))}
        </div>

        <Button
          variant="outline"
          size="icon"
          disabled={currentIndex === shuffledCards.length - 1}
          onClick={nextCard}
          className="h-11 w-11 rounded-xl border-[rgba(255,255,255,0.1)] disabled:opacity-30"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Control Bar */}
      <div className="mt-6 flex items-center justify-between border-t border-[rgba(255,255,255,0.1)] pt-4">
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={shuffleDeck}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <Shuffle className="mr-1.5 h-4 w-4" />
            Shuffle
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetDeck}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <RotateCcw className="mr-1.5 h-4 w-4" />
            Reset
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                disabled={isExporting}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <Download className="mr-1.5 h-4 w-4" />
                {isExporting ? 'Exporting...' : 'Export'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="border-[rgba(255,255,255,0.1)] bg-[var(--bg-secondary)]"
            >
              <DropdownMenuItem onClick={handleExportExcel} className="cursor-pointer">
                <FileSpreadsheet className="mr-2 h-4 w-4 text-green-500" />
                Download as Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer">
                <FileText className="mr-2 h-4 w-4 text-red-500" />
                Download as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {unknownCards.size > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={reviewUnknown}
            className="border-[var(--error)]/30 text-[var(--error)] hover:bg-[var(--error)]/10"
          >
            Review {unknownCards.size} cards
          </Button>
        )}
      </div>

      {/* Keyboard Shortcuts */}
      <button
        onClick={() => setShowControls(!showControls)}
        className="mt-4 flex items-center justify-center gap-2 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
      >
        <Keyboard className="h-3.5 w-3.5" />
        Keyboard shortcuts
      </button>

      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[var(--text-tertiary)]">
              <div className="flex items-center gap-2">
                <kbd className="rounded bg-[var(--bg-surface)] px-1.5 py-0.5 font-mono">Space</kbd>
                <span>Flip card</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="rounded bg-[var(--bg-surface)] px-1.5 py-0.5 font-mono">
                  &larr; &rarr;
                </kbd>
                <span>Navigate</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="rounded bg-[var(--bg-surface)] px-1.5 py-0.5 font-mono">&uarr;</kbd>
                <span>Mark known</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="rounded bg-[var(--bg-surface)] px-1.5 py-0.5 font-mono">&darr;</kbd>
                <span>Mark unknown</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Completion Screen */}
      <AnimatePresence>
        {isDone && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-[var(--bg-primary)]/95 backdrop-blur-sm"
          >
            <div className="p-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--success)]/20">
                <Check className="h-8 w-8 text-[var(--success)]" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-[var(--text-primary)]">
                Deck Complete!
              </h3>
              <p className="mb-6 text-[var(--text-secondary)]">
                You reviewed {shuffledCards.length} cards
              </p>
              <div className="mb-6 flex justify-center gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-[var(--success)]">{knownCards.size}</p>
                  <p className="text-xs text-[var(--text-tertiary)]">Known</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-[var(--error)]">{unknownCards.size}</p>
                  <p className="text-xs text-[var(--text-tertiary)]">To Review</p>
                </div>
              </div>
              <div className="flex justify-center gap-3">
                <Button onClick={resetDeck} variant="outline" className="rounded-xl">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Start Over
                </Button>
                {unknownCards.size > 0 && (
                  <Button onClick={reviewUnknown} className="rounded-xl bg-[var(--accent-primary)]">
                    Review Unknown
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
