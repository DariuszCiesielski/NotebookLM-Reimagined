'use client';

import { motion } from 'framer-motion';
import {
  Search,
  ExternalLink,
  Copy,
  Check,
  Clock,
  Loader2,
  FileText,
  Globe,
  AlertCircle,
  BookOpen,
  Download,
} from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { downloadAsPDF, generateFilename } from '@/lib/export-utils';

interface ResearchCitation {
  title: string;
  url: string;
}

interface ResearchTask {
  id: string;
  query: string;
  mode: string;
  status: string;
  progress_message?: string;
  sources_found_count?: number;
  sources_analyzed_count?: number;
  report_content?: string;
  report_citations?: ResearchCitation[];
  created_at: string;
  completed_at?: string;
}

interface ResearchReportProps {
  research: ResearchTask | null;
  isResearching?: boolean;
  onClose?: () => void;
}

export function ResearchReport({ research, isResearching, onClose }: ResearchReportProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'report' | 'sources'>('report');
  const [isExporting, setIsExporting] = useState(false);

  const copyReport = async () => {
    if (research?.report_content) {
      await navigator.clipboard.writeText(research.report_content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadPDF = async () => {
    if (!research?.report_content) return;
    setIsExporting(true);
    try {
      // Parse the markdown content into sections
      const lines = research.report_content.split('\n');
      const sections: { heading: string; content: string }[] = [];
      let currentSection = { heading: '', content: '' };

      for (const line of lines) {
        if (line.startsWith('# ') || line.startsWith('## ')) {
          if (currentSection.heading || currentSection.content) {
            sections.push(currentSection);
          }
          currentSection = {
            heading: line.replace(/^#+ /, ''),
            content: '',
          };
        } else if (line.trim()) {
          currentSection.content += line.replace(/\*\*/g, '').replace(/\*/g, '') + '\n';
        }
      }
      if (currentSection.heading || currentSection.content) {
        sections.push(currentSection);
      }

      await downloadAsPDF(
        {
          title: `Research: ${research.query}`,
          subtitle: `${research.sources_analyzed_count || 0} sources analyzed • ${research.mode === 'deep' ? 'Deep' : 'Fast'} mode`,
          sections:
            sections.length > 0
              ? sections
              : [{ heading: 'Report', content: research.report_content }],
        },
        generateFilename('research-report')
      );
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Researching state
  if (isResearching) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
          >
            <Search className="h-10 w-10 text-blue-500" />
          </motion.div>
        </motion.div>
        <h3 className="mb-2 text-lg font-semibold text-[var(--text-primary)]">Researching...</h3>
        <p className="mb-4 max-w-sm text-center text-sm text-[var(--text-tertiary)]">
          Autonomously searching and analyzing web sources to answer your query.
        </p>

        {/* Progress Steps */}
        <div className="w-full max-w-xs space-y-2">
          {[
            'Searching web sources',
            'Analyzing content',
            'Synthesizing findings',
            'Generating report',
          ].map((step, idx) => (
            <div key={step} className="flex items-center gap-3">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${idx < 2 ? 'bg-[var(--success)]/20 text-[var(--success)]' : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]'} `}
              >
                {idx < 2 ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
              </div>
              <span
                className={`text-sm ${idx < 2 ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}`}
              >
                {step}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // No research state
  if (!research) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--bg-tertiary)]">
          <Search className="h-8 w-8 text-[var(--text-tertiary)]" />
        </div>
        <h3 className="mb-2 text-lg font-medium text-[var(--text-primary)]">No Research Yet</h3>
        <p className="text-center text-sm text-[var(--text-tertiary)]">
          Enter a query and start deep research to explore any topic.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-6">
        <div className="mb-3 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
              <Search className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Research Report</h2>
              <p className="text-sm text-[var(--text-tertiary)]">
                {new Date(research.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={copyReport}
            className="text-[var(--text-secondary)]"
          >
            {copied ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </div>

        {/* Query */}
        <div className="rounded-xl border border-[rgba(255,255,255,0.1)] bg-[var(--bg-tertiary)] p-3">
          <p className="mb-1 text-xs text-[var(--text-tertiary)]">Research Query</p>
          <p className="text-sm font-medium text-[var(--text-primary)]">{research.query}</p>
        </div>

        {/* Stats */}
        <div className="mt-4 flex gap-4">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-[var(--text-tertiary)]" />
            <span className="text-sm text-[var(--text-secondary)]">
              {research.sources_found_count || 0} sources found
            </span>
          </div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[var(--text-tertiary)]" />
            <span className="text-sm text-[var(--text-secondary)]">
              {research.sources_analyzed_count || 0} analyzed
            </span>
          </div>
          <Badge className="border-0 bg-[var(--bg-tertiary)] text-xs text-[var(--text-secondary)]">
            {research.mode === 'deep' ? 'Deep' : 'Fast'} mode
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setActiveTab('report')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'report'
              ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          } `}
        >
          <FileText className="mr-1.5 inline-block h-4 w-4" />
          Report
        </button>
        <button
          onClick={() => setActiveTab('sources')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'sources'
              ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          } `}
        >
          <Globe className="mr-1.5 inline-block h-4 w-4" />
          Sources ({research.report_citations?.length || 0})
        </button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {activeTab === 'report' ? (
          <div className="pr-4">
            {/* Render markdown-like content */}
            {research.report_content?.split('\n').map((line, idx) => {
              // H1 headers
              if (line.startsWith('# ')) {
                return (
                  <h1 key={idx} className="mt-6 mb-3 text-xl font-bold text-[var(--text-primary)]">
                    {line.replace(/^# /, '')}
                  </h1>
                );
              }
              // H2 headers
              if (line.startsWith('## ')) {
                return (
                  <h2
                    key={idx}
                    className="mt-5 mb-2 text-lg font-semibold text-[var(--accent-primary)]"
                  >
                    {line.replace(/^## /, '')}
                  </h2>
                );
              }
              // Numbered lists
              if (/^\d+\.\s/.test(line)) {
                return (
                  <div key={idx} className="my-2 ml-2 flex gap-3">
                    <span className="font-semibold text-[var(--accent-primary)]">
                      {line.match(/^\d+/)?.[0]}.
                    </span>
                    <span className="text-[var(--text-secondary)]">
                      {line.replace(/^\d+\.\s/, '').replace(/\*\*(.*?)\*\*/g, '$1')}
                    </span>
                  </div>
                );
              }
              // Bullet points
              if (/^[-*]\s/.test(line)) {
                return (
                  <div key={idx} className="my-2 ml-4 flex gap-3">
                    <span className="text-[var(--accent-secondary)]">•</span>
                    <span className="text-[var(--text-secondary)]">
                      {line.replace(/^[-*]\s/, '')}
                    </span>
                  </div>
                );
              }
              // Horizontal rules
              if (line.startsWith('---')) {
                return <hr key={idx} className="my-4 border-[rgba(255,255,255,0.1)]" />;
              }
              // Italic text (note style)
              if (line.startsWith('*') && line.endsWith('*')) {
                return (
                  <p key={idx} className="my-2 text-sm text-[var(--text-tertiary)] italic">
                    {line.replace(/^\*|\*$/g, '')}
                  </p>
                );
              }
              // Regular paragraph
              if (line.trim()) {
                return (
                  <p key={idx} className="my-2 leading-relaxed text-[var(--text-secondary)]">
                    {line}
                  </p>
                );
              }
              return null;
            })}
          </div>
        ) : (
          <div className="space-y-3 pr-4">
            {research.report_citations && research.report_citations.length > 0 ? (
              research.report_citations.map((citation, idx) => (
                <a
                  key={idx}
                  href={citation.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-3 rounded-xl border border-[rgba(255,255,255,0.1)] bg-[var(--bg-tertiary)] p-4 transition-colors hover:border-[rgba(255,255,255,0.2)]"
                >
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--bg-surface)]">
                    <Globe className="h-4 w-4 text-[var(--text-tertiary)]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent-primary)]">
                      {citation.title}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-[var(--text-tertiary)]">
                      {citation.url}
                    </p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-[var(--text-tertiary)] opacity-0 transition-opacity group-hover:opacity-100" />
                </a>
              ))
            ) : (
              <div className="py-8 text-center">
                <Globe className="mx-auto mb-2 h-8 w-8 text-[var(--text-tertiary)]" />
                <p className="text-sm text-[var(--text-tertiary)]">No sources cited</p>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
