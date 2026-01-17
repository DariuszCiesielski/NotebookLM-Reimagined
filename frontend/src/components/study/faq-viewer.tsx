'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  HelpCircle,
  ChevronDown,
  Copy,
  Check,
  Search,
  X,
  Download,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { exportFAQToExcel, exportFAQToPDF, generateFilename } from '@/lib/export-utils';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQViewerProps {
  items: FAQItem[];
  onClose?: () => void;
}

export function FAQViewer({ items, onClose }: FAQViewerProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Export handlers
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      await exportFAQToExcel(items, generateFilename('faq'));
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      await exportFAQToPDF(items, 'Frequently Asked Questions', generateFilename('faq'));
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const filteredItems = items.filter(
    (item) =>
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const copyAnswer = async (index: number, answer: string) => {
    await navigator.clipboard.writeText(answer);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (!items || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <HelpCircle className="mb-4 h-12 w-12 text-[var(--text-tertiary)]" />
        <p className="text-[var(--text-secondary)]">No FAQ items available</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20">
              <HelpCircle className="h-6 w-6 text-teal-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                Frequently Asked Questions
              </h2>
              <p className="text-sm text-[var(--text-tertiary)]">
                {items.length} questions from your sources
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                disabled={isExporting}
                className="text-[var(--text-secondary)]"
              >
                <Download className="mr-1.5 h-4 w-4" />
                {isExporting ? 'Exporting...' : 'Export'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
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

        {/* Search */}
        <div className="relative">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <Input
            placeholder="Search questions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 rounded-xl border-[rgba(255,255,255,0.1)] bg-[var(--bg-tertiary)] pl-10 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* FAQ List */}
      <div className="flex-1 space-y-3 overflow-y-auto">
        {filteredItems.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-[var(--text-tertiary)]">No matching questions found</p>
          </div>
        ) : (
          filteredItems.map((item, idx) => {
            const originalIndex = items.indexOf(item);
            const isExpanded = expandedIndex === originalIndex;

            return (
              <motion.div
                key={originalIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`overflow-hidden rounded-xl border transition-colors ${
                  isExpanded
                    ? 'border-[var(--accent-primary)]/30 bg-gradient-to-br from-[var(--bg-tertiary)] to-[var(--bg-surface)]'
                    : 'border-[rgba(255,255,255,0.1)] bg-[var(--bg-secondary)] hover:border-[rgba(255,255,255,0.2)]'
                } `}
              >
                {/* Question Header */}
                <button
                  onClick={() => setExpandedIndex(isExpanded ? null : originalIndex)}
                  className="flex w-full items-start gap-4 p-4 text-left"
                >
                  <div
                    className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
                      isExpanded
                        ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]'
                        : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]'
                    } `}
                  >
                    <span className="text-sm font-bold">Q</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`leading-relaxed font-medium ${isExpanded ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'} `}
                    >
                      {item.question}
                    </p>
                  </div>
                  <ChevronDown
                    className={`mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--text-tertiary)] transition-transform ${isExpanded ? 'rotate-180' : ''} `}
                  />
                </button>

                {/* Answer Content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4">
                        <div className="flex gap-4">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--accent-secondary)]/20">
                            <span className="text-sm font-bold text-[var(--accent-secondary)]">
                              A
                            </span>
                          </div>
                          <div className="flex-1 space-y-3">
                            <p className="leading-relaxed text-[var(--text-secondary)]">
                              {item.answer}
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyAnswer(originalIndex, item.answer);
                              }}
                              className="-ml-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                            >
                              {copiedIndex === originalIndex ? (
                                <>
                                  <Check className="mr-1.5 h-3.5 w-3.5 text-[var(--success)]" />
                                  Copied!
                                </>
                              ) : (
                                <>
                                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                                  Copy answer
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Quick Jump */}
      {items.length > 5 && !searchQuery && (
        <div className="mt-4 border-t border-[rgba(255,255,255,0.1)] pt-4">
          <p className="mb-2 text-xs text-[var(--text-tertiary)]">Quick jump</p>
          <div className="flex flex-wrap gap-1.5">
            {items.slice(0, 8).map((_, idx) => (
              <button
                key={idx}
                onClick={() => setExpandedIndex(idx)}
                className={`h-7 w-7 rounded-lg text-xs font-medium transition-colors ${
                  expandedIndex === idx
                    ? 'bg-[var(--accent-primary)] text-white'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                } `}
              >
                {idx + 1}
              </button>
            ))}
            {items.length > 8 && (
              <span className="flex items-center px-2 text-xs text-[var(--text-tertiary)]">
                +{items.length - 8} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Expand All / Collapse All */}
      <div className="mt-4 flex justify-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpandedIndex(0)}
          className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
        >
          Collapse All
        </Button>
      </div>
    </div>
  );
}
