'use client';

import { motion } from 'framer-motion';
import {
  FileText,
  ChevronRight,
  BookOpen,
  List,
  Bookmark,
  Copy,
  Check,
  Download,
} from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { exportStudyGuideToPDF, generateFilename } from '@/lib/export-utils';

interface StudyGuideSection {
  heading: string;
  content: string;
}

interface StudyGuide {
  title: string;
  sections: StudyGuideSection[];
}

interface StudyGuideViewerProps {
  guide: StudyGuide;
  onClose?: () => void;
}

// Parse inline markdown (bold, italic, code)
function parseInlineMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const remaining = text;
  let key = 0;

  // Pattern to match **bold**, *italic*, `code`, and plain text
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
    }

    const matched = match[0];
    if (matched.startsWith('**') && matched.endsWith('**')) {
      // Bold
      parts.push(
        <strong key={key++} className="font-semibold text-[var(--text-primary)]">
          {matched.slice(2, -2)}
        </strong>
      );
    } else if (matched.startsWith('*') && matched.endsWith('*')) {
      // Italic
      parts.push(
        <em key={key++} className="italic">
          {matched.slice(1, -1)}
        </em>
      );
    } else if (matched.startsWith('`') && matched.endsWith('`')) {
      // Inline code
      parts.push(
        <code
          key={key++}
          className="rounded bg-[var(--bg-surface)] px-1.5 py-0.5 font-mono text-sm text-[var(--accent-primary)]"
        >
          {matched.slice(1, -1)}
        </code>
      );
    }

    lastIndex = pattern.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(<span key={key++}>{text.slice(lastIndex)}</span>);
  }

  return parts.length > 0 ? parts : [<span key={0}>{text}</span>];
}

export function StudyGuideViewer({ guide, onClose }: StudyGuideViewerProps) {
  const [activeSection, setActiveSection] = useState(0);
  const [showTOC, setShowTOC] = useState(true);
  const [copied, setCopied] = useState(false);
  const [bookmarkedSections, setBookmarkedSections] = useState<Set<number>>(new Set());
  const [isExporting, setIsExporting] = useState(false);

  // Export handler
  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      await exportStudyGuideToPDF(guide, generateFilename('study-guide'));
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const toggleBookmark = (idx: number) => {
    const newBookmarks = new Set(bookmarkedSections);
    if (newBookmarks.has(idx)) {
      newBookmarks.delete(idx);
    } else {
      newBookmarks.add(idx);
    }
    setBookmarkedSections(newBookmarks);
  };

  const copyGuide = async () => {
    const text = `# ${guide.title}\n\n${guide.sections.map((s) => `## ${s.heading}\n\n${s.content}`).join('\n\n')}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!guide || !guide.sections || guide.sections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="mb-4 h-12 w-12 text-[var(--text-tertiary)]" />
        <p className="text-[var(--text-secondary)]">No study guide available</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/20">
              <FileText className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">{guide.title}</h2>
              <p className="text-sm text-[var(--text-tertiary)]">
                {guide.sections.length} sections
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={copyGuide}
              className="text-[var(--text-secondary)]"
            >
              {copied ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportPDF}
              disabled={isExporting}
              className="text-[var(--text-secondary)]"
            >
              <Download className="mr-1.5 h-4 w-4" />
              {isExporting ? 'Exporting...' : 'PDF'}
            </Button>
          </div>
        </div>

        {/* Table of Contents Toggle */}
        <button
          onClick={() => setShowTOC(!showTOC)}
          className="flex items-center gap-2 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
        >
          <List className="h-4 w-4" />
          Table of Contents
          <ChevronRight className={`h-4 w-4 transition-transform ${showTOC ? 'rotate-90' : ''}`} />
        </button>
      </div>

      {/* Table of Contents */}
      {showTOC && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="mb-6 overflow-hidden"
        >
          <div className="rounded-xl border border-[rgba(255,255,255,0.1)] bg-[var(--bg-tertiary)] p-4">
            <div className="space-y-1">
              {guide.sections.map((section, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setActiveSection(idx);
                    setShowTOC(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                    activeSection === idx
                      ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
                  } `}
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--bg-surface)] text-xs font-medium">
                    {idx + 1}
                  </span>
                  <span className="flex-1 truncate text-sm">{section.heading}</span>
                  {bookmarkedSections.has(idx) && (
                    <Bookmark className="h-4 w-4 fill-[var(--warning)] text-[var(--warning)]" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Section Navigation Pills */}
      <div className="scrollbar-hide mb-4 flex gap-2 overflow-x-auto pb-2">
        {guide.sections.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setActiveSection(idx)}
            className={`h-8 w-8 flex-shrink-0 rounded-lg text-sm font-medium transition-all ${
              activeSection === idx
                ? 'bg-[var(--accent-primary)] text-white'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
            } `}
          >
            {idx + 1}
          </button>
        ))}
      </div>

      {/* Section Content */}
      <ScrollArea className="-mx-1 flex-1 px-1">
        <motion.div
          key={activeSection}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="rounded-2xl border border-[rgba(255,255,255,0.1)] bg-gradient-to-br from-[var(--bg-tertiary)] to-[var(--bg-surface)] p-6">
            {/* Section Header */}
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-primary)]/20 text-sm font-bold text-[var(--accent-primary)]">
                  {activeSection + 1}
                </span>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  {guide.sections[activeSection]?.heading}
                </h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleBookmark(activeSection)}
                className={`h-8 w-8 ${bookmarkedSections.has(activeSection) ? 'text-[var(--warning)]' : 'text-[var(--text-tertiary)]'}`}
              >
                <Bookmark
                  className={`h-4 w-4 ${bookmarkedSections.has(activeSection) ? 'fill-current' : ''}`}
                />
              </Button>
            </div>

            {/* Section Content */}
            <div className="prose prose-invert prose-sm max-w-none">
              <div className="leading-relaxed text-[var(--text-secondary)]">
                {guide.sections[activeSection]?.content.split('\n').map((paragraph, idx) => {
                  // Format numbered lists
                  if (/^\d+\.\s/.test(paragraph)) {
                    return (
                      <div key={idx} className="my-2 flex gap-3">
                        <span className="flex-shrink-0 font-medium text-[var(--accent-primary)]">
                          {paragraph.match(/^\d+/)?.[0]}.
                        </span>
                        <span>{parseInlineMarkdown(paragraph.replace(/^\d+\.\s/, ''))}</span>
                      </div>
                    );
                  }
                  // Format bullet points
                  if (/^[-•]\s/.test(paragraph)) {
                    return (
                      <div key={idx} className="my-2 ml-4 flex gap-3">
                        <span className="flex-shrink-0 text-[var(--accent-secondary)]">•</span>
                        <span>{parseInlineMarkdown(paragraph.replace(/^[-•]\s/, ''))}</span>
                      </div>
                    );
                  }
                  // Regular paragraph
                  if (paragraph.trim()) {
                    return (
                      <p key={idx} className="my-3">
                        {parseInlineMarkdown(paragraph)}
                      </p>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          </div>
        </motion.div>
      </ScrollArea>

      {/* Navigation Footer */}
      <div className="mt-6 flex items-center justify-between border-t border-[rgba(255,255,255,0.1)] pt-4">
        <Button
          variant="outline"
          disabled={activeSection === 0}
          onClick={() => setActiveSection(activeSection - 1)}
          className="rounded-xl border-[rgba(255,255,255,0.1)]"
        >
          Previous
        </Button>

        <span className="text-sm text-[var(--text-tertiary)]">
          {activeSection + 1} / {guide.sections.length}
        </span>

        <Button
          variant="outline"
          disabled={activeSection === guide.sections.length - 1}
          onClick={() => setActiveSection(activeSection + 1)}
          className="rounded-xl border-[rgba(255,255,255,0.1)]"
        >
          Next
        </Button>
      </div>

      {/* Bookmarks Summary */}
      {bookmarkedSections.size > 0 && (
        <div className="mt-4 rounded-xl border border-[var(--warning)]/30 bg-[var(--warning)]/10 p-3">
          <div className="flex items-center gap-2 text-sm">
            <Bookmark className="h-4 w-4 fill-[var(--warning)] text-[var(--warning)]" />
            <span className="text-[var(--warning)]">
              {bookmarkedSections.size} section{bookmarkedSections.size > 1 ? 's' : ''} bookmarked
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
