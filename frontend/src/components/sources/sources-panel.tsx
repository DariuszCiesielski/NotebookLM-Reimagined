'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Upload,
  FileText,
  Youtube,
  Link as LinkIcon,
  Type,
  CheckCircle,
  Clock,
  XCircle,
  Trash2,
  Eye,
  Loader2,
  X,
  MoreVertical,
} from 'lucide-react';
import { useState, useRef } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Source } from '@/lib/supabase';

interface SourcesPanelProps {
  sources: Source[];
  selectedSources: Set<string>;
  onToggleSource: (id: string) => void;
  onSelectAll: () => void;
  onAddSource: (type: string, data: { input: string; name?: string; file?: File }) => Promise<void>;
  onDeleteSource: (id: string) => void;
  onViewSource: (source: Source) => void;
  uploading?: boolean;
}

const SOURCE_COLORS = {
  pdf: 'var(--source-pdf)',
  docx: 'var(--source-doc)',
  txt: 'var(--source-doc)',
  youtube: 'var(--source-video)',
  url: 'var(--source-web)',
  audio: 'var(--source-audio)',
  text: 'var(--text-tertiary)',
};

export function SourcesPanel({
  sources,
  selectedSources,
  onToggleSource,
  onSelectAll,
  onAddSource,
  onDeleteSource,
  onViewSource,
  uploading = false,
}: SourcesPanelProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sourceType, setSourceType] = useState<'file' | 'youtube' | 'url' | 'text'>('file');
  const [sourceInput, setSourceInput] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [sourceToDelete, setSourceToDelete] = useState<Source | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDeleteClick = (source: Source) => {
    setSourceToDelete(source);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (sourceToDelete) {
      onDeleteSource(sourceToDelete.id);
      setDeleteConfirmOpen(false);
      setSourceToDelete(null);
    }
  };

  const getSourceIcon = (type: string) => {
    const color = SOURCE_COLORS[type as keyof typeof SOURCE_COLORS] || 'var(--text-tertiary)';
    switch (type) {
      case 'pdf':
      case 'docx':
      case 'txt':
        return <FileText className="h-4 w-4" style={{ color }} />;
      case 'youtube':
        return <Youtube className="h-4 w-4" style={{ color }} />;
      case 'url':
        return <LinkIcon className="h-4 w-4" style={{ color }} />;
      case 'text':
      case 'audio':
      default:
        return <Type className="h-4 w-4" style={{ color }} />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return <CheckCircle className="h-3.5 w-3.5 text-[var(--success)]" />;
      case 'processing':
        return <Clock className="h-3.5 w-3.5 animate-spin text-[var(--warning)]" />;
      case 'failed':
        return <XCircle className="h-3.5 w-3.5 text-[var(--error)]" />;
      default:
        return <Clock className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />;
    }
  };

  const handleAddSource = async () => {
    if (!sourceInput.trim() && sourceType !== 'file') return;
    setIsAdding(true);
    await onAddSource(sourceType, { input: sourceInput, name: sourceName });
    setSourceInput('');
    setSourceName('');
    setDialogOpen(false);
    setIsAdding(false);
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    const validTypes = ['.pdf', '.docx', '.txt', '.md'];
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!validTypes.includes(fileExt)) {
      return;
    }

    setIsAdding(true);
    await onAddSource('file', { input: file.name, name: file.name, file });
    setDialogOpen(false);
    setIsAdding(false);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleFileUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      await handleFileUpload(file);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header Actions */}
      <div className="border-b border-[rgba(255,255,255,0.1)] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className="border-0 bg-[var(--bg-tertiary)] text-xs text-[var(--text-secondary)]">
              {sources.length} source{sources.length !== 1 ? 's' : ''}
            </Badge>
            {selectedSources.size > 0 && (
              <Badge className="border-0 bg-[var(--accent-primary)]/20 text-xs text-[var(--accent-primary)]">
                {selectedSources.size} selected
              </Badge>
            )}
          </div>
          <Button
            size="sm"
            onClick={() => setDialogOpen(true)}
            className="h-8 rounded-lg bg-[var(--accent-primary)] px-3 text-white hover:bg-[var(--accent-primary)]/90"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add
          </Button>
        </div>

        {sources.length > 0 && (
          <button
            onClick={onSelectAll}
            className="mt-3 text-xs text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-secondary)]"
          >
            {selectedSources.size === sources.length ? 'Deselect all' : 'Select all'}
          </button>
        )}
      </div>

      {/* Sources List */}
      <ScrollArea className="flex-1 overflow-x-visible">
        <div className="overflow-visible p-3">
          {sources.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center px-4 py-12"
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--bg-tertiary)]">
                <FileText className="h-6 w-6 text-[var(--text-tertiary)]" />
              </div>
              <p className="mb-1 font-medium text-[var(--text-primary)]">No sources yet</p>
              <p className="mb-4 text-center text-sm text-[var(--text-tertiary)]">
                Add documents to start analyzing
              </p>
              <Button
                size="sm"
                onClick={() => setDialogOpen(true)}
                className="rounded-lg bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary)]/90"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Add Source
              </Button>
            </motion.div>
          ) : (
            <div className="space-y-1">
              <AnimatePresence>
                {sources.map((source, index) => (
                  <motion.div
                    key={source.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.05 }}
                    className={`group relative flex cursor-pointer items-center gap-3 rounded-xl px-3 py-3 transition-all duration-150 ${
                      selectedSources.has(source.id)
                        ? 'bg-[var(--accent-primary)]/10 ring-1 ring-[var(--accent-primary)]/30'
                        : 'hover:bg-[var(--bg-tertiary)]'
                    } `}
                    onClick={() => onToggleSource(source.id)}
                  >
                    <Checkbox
                      checked={selectedSources.has(source.id)}
                      className="border-[var(--text-tertiary)] data-[state=checked]:border-[var(--accent-primary)] data-[state=checked]:bg-[var(--accent-primary)]"
                    />

                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-surface)]">
                      {getSourceIcon(source.type)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                        {source.name}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="text-xs text-[var(--text-tertiary)] capitalize">
                          {source.type}
                        </span>
                        {source.file_size_bytes && (
                          <span className="text-xs text-[var(--text-tertiary)]">
                            {(source.file_size_bytes / 1024).toFixed(0)} KB
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex min-w-[52px] shrink-0 items-center justify-end gap-1">
                      {getStatusIcon(source.status)}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-40 border-[rgba(255,255,255,0.1)] bg-[var(--bg-secondary)]"
                        >
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewSource(source);
                            }}
                            className="cursor-pointer text-[var(--text-primary)] focus:bg-[var(--bg-tertiary)]"
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(source);
                            }}
                            className="cursor-pointer text-[var(--error)] focus:bg-[var(--error)]/10 focus:text-[var(--error)]"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Add Source Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-[rgba(255,255,255,0.1)] bg-[var(--bg-secondary)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[var(--text-primary)]">Add Source</DialogTitle>
            <DialogDescription className="text-[var(--text-secondary)]">
              Add documents, URLs, or text to your notebook for AI analysis.
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={sourceType}
            onValueChange={(v) => setSourceType(v as typeof sourceType)}
            className="mt-2"
          >
            <TabsList className="grid w-full grid-cols-4 rounded-xl bg-[var(--bg-tertiary)] p-1">
              <TabsTrigger
                value="file"
                className="rounded-lg text-xs data-[state=active]:bg-[var(--bg-surface)] data-[state=active]:text-[var(--text-primary)]"
              >
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                File
              </TabsTrigger>
              <TabsTrigger
                value="youtube"
                className="rounded-lg text-xs data-[state=active]:bg-[var(--bg-surface)] data-[state=active]:text-[var(--text-primary)]"
              >
                <Youtube className="mr-1.5 h-3.5 w-3.5" />
                YouTube
              </TabsTrigger>
              <TabsTrigger
                value="url"
                className="rounded-lg text-xs data-[state=active]:bg-[var(--bg-surface)] data-[state=active]:text-[var(--text-primary)]"
              >
                <LinkIcon className="mr-1.5 h-3.5 w-3.5" />
                URL
              </TabsTrigger>
              <TabsTrigger
                value="text"
                className="rounded-lg text-xs data-[state=active]:bg-[var(--bg-surface)] data-[state=active]:text-[var(--text-primary)]"
              >
                <Type className="mr-1.5 h-3.5 w-3.5" />
                Text
              </TabsTrigger>
            </TabsList>

            <TabsContent value="file" className="mt-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.md"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                disabled={isAdding}
                className={`flex h-32 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  isDragging
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10'
                    : 'border-[rgba(255,255,255,0.15)] hover:border-[var(--accent-primary)]/50 hover:bg-[var(--bg-tertiary)]/50'
                }`}
              >
                {isAdding ? (
                  <Loader2 className="h-6 w-6 animate-spin text-[var(--text-tertiary)]" />
                ) : (
                  <>
                    <Upload
                      className={`h-8 w-8 ${isDragging ? 'text-[var(--accent-primary)]' : 'text-[var(--text-tertiary)]'}`}
                    />
                    <div className="text-center">
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {isDragging ? 'Drop file here' : 'Drag & drop or click to upload'}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
                        PDF, DOCX, TXT, or MD
                      </p>
                    </div>
                  </>
                )}
              </button>
            </TabsContent>

            <TabsContent value="youtube" className="mt-4 space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text-primary)]">
                  YouTube URL
                </label>
                <Input
                  placeholder="https://youtube.com/watch?v=..."
                  value={sourceInput}
                  onChange={(e) => setSourceInput(e.target.value)}
                  className="h-10 rounded-lg border-[rgba(255,255,255,0.1)] bg-[var(--bg-tertiary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text-primary)]">
                  Name (optional)
                </label>
                <Input
                  placeholder="My video"
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                  className="h-10 rounded-lg border-[rgba(255,255,255,0.1)] bg-[var(--bg-tertiary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)]"
                />
              </div>
            </TabsContent>

            <TabsContent value="url" className="mt-4 space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text-primary)]">
                  Website URL
                </label>
                <Input
                  placeholder="https://example.com/article"
                  value={sourceInput}
                  onChange={(e) => setSourceInput(e.target.value)}
                  className="h-10 rounded-lg border-[rgba(255,255,255,0.1)] bg-[var(--bg-tertiary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text-primary)]">
                  Name (optional)
                </label>
                <Input
                  placeholder="Article name"
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                  className="h-10 rounded-lg border-[rgba(255,255,255,0.1)] bg-[var(--bg-tertiary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)]"
                />
              </div>
            </TabsContent>

            <TabsContent value="text" className="mt-4 space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text-primary)]">Name</label>
                <Input
                  placeholder="My notes"
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                  className="h-10 rounded-lg border-[rgba(255,255,255,0.1)] bg-[var(--bg-tertiary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text-primary)]">Content</label>
                <Textarea
                  placeholder="Paste your text here..."
                  value={sourceInput}
                  onChange={(e) => setSourceInput(e.target.value)}
                  rows={6}
                  className="resize-none rounded-lg border-[rgba(255,255,255,0.1)] bg-[var(--bg-tertiary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)]"
                />
              </div>
            </TabsContent>
          </Tabs>

          {sourceType !== 'file' && (
            <DialogFooter className="mt-4">
              <Button
                onClick={handleAddSource}
                disabled={isAdding || !sourceInput.trim()}
                className="w-full rounded-lg bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary)]/90 sm:w-auto"
              >
                {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Source
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="border-[rgba(255,255,255,0.1)] bg-[var(--bg-secondary)] sm:max-w-md">
          <DialogHeader>
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--error)]/10">
                <Trash2 className="h-5 w-5 text-[var(--error)]" />
              </div>
              <DialogTitle className="text-[var(--text-primary)]">Delete Source</DialogTitle>
            </div>
            <DialogDescription className="text-[var(--text-secondary)]">
              Are you sure you want to delete{' '}
              <span className="font-medium text-[var(--text-primary)]">{sourceToDelete?.name}</span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4 gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              className="flex-1 rounded-xl border-[rgba(255,255,255,0.1)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              className="flex-1 rounded-xl bg-[var(--error)] text-white hover:bg-[var(--error)]/90 sm:flex-none"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
