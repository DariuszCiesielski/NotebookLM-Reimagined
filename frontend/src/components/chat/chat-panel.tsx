'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Loader2,
  Sparkles,
  Copy,
  StickyNote,
  AlertCircle,
  ChevronDown,
  MessageSquare,
  Plus,
  Trash2,
  Clock,
  ExternalLink,
  FileText,
  Search,
  PanelLeftClose,
  PanelLeft,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import { useRef, useEffect, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { createClient, ChatMessage, Citation } from '@/lib/supabase';

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

interface ChatPanelProps {
  messages: ChatMessage[];
  message: string;
  onMessageChange: (message: string) => void;
  onSendMessage: (overrideMessage?: string) => void;
  sending: boolean;
  selectedSourcesCount: number;
  totalSourcesCount: number;
  notebookSummary?: string;
  onSaveResponse?: (message: ChatMessage) => void;
  // Chat history props
  sessions?: ChatSession[];
  currentSessionId?: string | null;
  onLoadSession?: (sessionId: string) => void;
  onNewChat?: () => void;
  onDeleteSession?: (sessionId: string) => void;
  onRenameSession?: (sessionId: string, newTitle: string) => void;
  loadingSessions?: boolean;
  notebookId?: string;
}

// Suggested questions will be fetched from translations
const SUGGESTED_QUESTION_KEYS = [
  'summarizeKeyPoints',
  'mainTakeaways',
  'explainMethodology',
  'whatAreLimitations',
];

export function ChatPanel({
  messages,
  message,
  onMessageChange,
  onSendMessage,
  sending,
  selectedSourcesCount,
  totalSourcesCount,
  notebookSummary,
  onSaveResponse,
  sessions = [],
  currentSessionId,
  onLoadSession,
  onNewChat,
  onDeleteSession,
  onRenameSession,
  loadingSessions,
  notebookId,
}: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const t = useTranslations('chat');

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // Get current session title
  const currentSession = sessions.find((s) => s.id === currentSessionId);
  const currentTitle = currentSession?.title || t('newChat');

  // Filter sessions based on search query
  const filteredSessions = sessions.filter((session) =>
    session.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return t('justNow');
    if (diffMins < 60) return `${diffMins}${t('agoMinutes')}`;
    if (diffHours < 24) return `${diffHours}${t('agoHours')}`;
    if (diffDays < 7) return `${diffDays}${t('agoDays')}`;
    return date.toLocaleDateString();
  };

  // Format short timestamp for duplicate differentiation
  const formatShortTimestamp = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get display title with timestamp suffix for duplicates
  const getDisplayTitle = (session: ChatSession, allSessions: ChatSession[]) => {
    const duplicates = allSessions.filter((s) => s.title === session.title);
    if (duplicates.length > 1) {
      return `${session.title} (${formatShortTimestamp(session.created_at)})`;
    }
    return session.title;
  };

  // Get first message preview
  const getMessagePreview = (session: ChatSession) => {
    // We could fetch the first message, but for now just use the title
    return session.title;
  };

  // Handle rename
  const handleStartRename = (session: ChatSession, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingSessionId(session.id);
    setEditingTitle(session.title);
    setTimeout(() => editInputRef.current?.focus(), 50);
  };

  const handleSaveRename = async () => {
    if (!editingSessionId || !editingTitle.trim()) {
      setEditingSessionId(null);
      return;
    }

    if (onRenameSession) {
      onRenameSession(editingSessionId, editingTitle.trim());
    }
    setEditingSessionId(null);
  };

  const handleCancelRename = () => {
    setEditingSessionId(null);
    setEditingTitle('');
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveRename();
    } else if (e.key === 'Escape') {
      handleCancelRename();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t('copiedToClipboard'));
  };

  // Sidebar Thread Item Component
  const ThreadItem = ({ session, isActive }: { session: ChatSession; isActive: boolean }) => {
    const isEditing = editingSessionId === session.id;

    return (
      <div
        className={`group relative flex cursor-pointer items-start gap-3 rounded-xl p-3 transition-all ${isActive
          ? 'border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/15'
          : 'border border-transparent hover:bg-[var(--bg-tertiary)]'
          } `}
        onClick={() => !isEditing && onLoadSession?.(session.id)}
        onDoubleClick={() => handleStartRename(session)}
      >
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isActive
            ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]'
            : 'bg-[var(--bg-secondary)] text-[var(--text-tertiary)]'
            } `}
        >
          <MessageSquare className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1 py-0.5">
          {isEditing ? (
            <div className="flex items-center gap-1">
              <Input
                ref={editInputRef}
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onKeyDown={handleRenameKeyDown}
                onBlur={handleSaveRename}
                className="h-6 border-[var(--accent-primary)] bg-[var(--bg-secondary)] px-2 py-1 text-sm"
                onClick={(e) => e.stopPropagation()}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSaveRename();
                }}
              >
                <Check className="h-3 w-3 text-green-400" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancelRename();
                }}
              >
                <X className="h-3 w-3 text-red-400" />
              </Button>
            </div>
          ) : (
            <>
              <p
                className={`truncate text-sm font-medium ${isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}
              >
                {getDisplayTitle(session, sessions)}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <Clock className="h-3 w-3 text-[var(--text-tertiary)]" />
                <span className="text-xs text-[var(--text-tertiary)]">
                  {formatDate(session.updated_at)}
                </span>
                <span className="text-xs text-[var(--text-tertiary)]">·</span>
                <span className="text-xs text-[var(--text-tertiary)]">
                  {session.message_count} msgs
                </span>
              </div>
            </>
          )}
        </div>

        {/* Action buttons */}
        {!isEditing && (
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-[var(--text-tertiary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
                  onClick={(e) => handleStartRename(session, e)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('rename')}</TooltipContent>
            </Tooltip>

            {onDeleteSession && !isActive && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-[var(--text-tertiary)] hover:bg-red-500/10 hover:text-red-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('delete')}</TooltipContent>
              </Tooltip>
            )}
          </div>
        )}

        {/* Active indicator */}
        {isActive && (
          <div className="absolute top-1/2 left-0 h-8 w-1 -translate-y-1/2 rounded-r-full bg-[var(--accent-primary)]" />
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="h-full shrink-0 overflow-hidden border-r border-[rgba(255,255,255,0.1)] bg-[var(--bg-primary)]"
          >
            <div className="flex h-full w-[280px] flex-col">
              {/* Sidebar Header */}
              <div className="border-b border-[rgba(255,255,255,0.1)] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t('history')}</h3>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                        onClick={() => setSidebarOpen(false)}
                      >
                        <PanelLeftClose className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('closeSidebar')}</TooltipContent>
                  </Tooltip>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
                  <Input
                    placeholder={t('searchThreads')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 border-[rgba(255,255,255,0.1)] bg-[var(--bg-secondary)] pl-9 text-sm placeholder:text-[var(--text-tertiary)]"
                  />
                </div>
              </div>

              {/* New Chat Button */}
              {onNewChat && (
                <div className="p-3">
                  <Button
                    variant="outline"
                    className="h-10 w-full justify-start gap-2 border-[rgba(255,255,255,0.1)] bg-[var(--bg-secondary)] hover:border-[var(--accent-primary)]/50 hover:bg-[var(--bg-tertiary)]"
                    onClick={onNewChat}
                  >
                    <Plus className="h-4 w-4 text-[var(--accent-primary)]" />
                    <span>{t('newChat')}</span>
                  </Button>
                </div>
              )}

              {/* Thread List */}
              <div className="flex-1 overflow-y-auto px-3 pb-3">
                {loadingSessions ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-[var(--text-tertiary)]" />
                  </div>
                ) : filteredSessions.length > 0 ? (
                  <div className="space-y-1">
                    {filteredSessions.map((session) => (
                      <ThreadItem
                        key={session.id}
                        session={session}
                        isActive={session.id === currentSessionId}
                      />
                    ))}
                  </div>
                ) : searchQuery ? (
                  <div className="py-8 text-center">
                    <Search className="mx-auto mb-2 h-8 w-8 text-[var(--text-tertiary)]" />
                    <p className="text-sm text-[var(--text-tertiary)]">{t('noThreadsFound')}</p>
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <MessageSquare className="mx-auto mb-2 h-8 w-8 text-[var(--text-tertiary)]" />
                    <p className="text-sm text-[var(--text-tertiary)]">{t('noConversationsYet')}</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex h-full flex-1 flex-col overflow-hidden">
        {/* Chat History Header */}
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-[rgba(255,255,255,0.1)] bg-[var(--bg-primary)] px-4">
          <div className="flex items-center gap-2">
            {/* Sidebar Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                  <PanelLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{sidebarOpen ? t('closeSidebar') : t('openSidebar')}</TooltipContent>
            </Tooltip>

            {/* Dropdown (shown when sidebar is closed) */}
            {!sidebarOpen && (sessions.length > 0 || messages.length > 0) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-8 gap-2 px-3 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                  >
                    <MessageSquare className="h-4 w-4 text-[var(--accent-primary)]" />
                    <span className="max-w-[200px] truncate">{currentTitle}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-72 border-[rgba(255,255,255,0.15)] bg-[#1a1a2e] shadow-xl"
                >
                  {onNewChat && (
                    <>
                      <DropdownMenuItem
                        className="cursor-pointer gap-2 focus:bg-[var(--bg-tertiary)]"
                        onClick={onNewChat}
                      >
                        <Plus className="h-4 w-4 text-[var(--accent-primary)]" />
                        <span>{t('newChat')}</span>
                      </DropdownMenuItem>
                      {sessions.length > 0 && (
                        <DropdownMenuSeparator className="bg-[rgba(255,255,255,0.1)]" />
                      )}
                    </>
                  )}
                  {loadingSessions ? (
                    <div className="flex items-center justify-center px-2 py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-[var(--text-tertiary)]" />
                    </div>
                  ) : sessions.length > 0 ? (
                    <div className="max-h-64 overflow-y-auto">
                      {sessions.map((session) => (
                        <DropdownMenuItem
                          key={session.id}
                          className={`group cursor-pointer gap-2 focus:bg-[var(--bg-tertiary)] ${session.id === currentSessionId ? 'bg-[var(--accent-primary)]/10' : ''
                            }`}
                          onClick={() => onLoadSession?.(session.id)}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <MessageSquare className="h-3.5 w-3.5 shrink-0 text-[var(--text-tertiary)]" />
                              <span className="truncate text-sm">
                                {getDisplayTitle(session, sessions)}
                              </span>
                            </div>
                            <div className="mt-0.5 flex items-center gap-2">
                              <Clock className="h-3 w-3 text-[var(--text-tertiary)]" />
                              <span className="text-xs text-[var(--text-tertiary)]">
                                {formatDate(session.updated_at)} · {session.message_count} messages
                              </span>
                            </div>
                          </div>
                          {onDeleteSession && session.id !== currentSessionId && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteSession(session.id);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </DropdownMenuItem>
                      ))}
                    </div>
                  ) : (
                    <div className="px-2 py-4 text-center text-sm text-[var(--text-tertiary)]">
                      {t('noPreviousConversations')}
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {onNewChat && messages.length > 0 && !sidebarOpen && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
                  onClick={onNewChat}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('newChat')}</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-6 py-6">
            {messages.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex min-h-[400px] flex-col items-center justify-center text-center"
              >
                {/* Hero Icon */}
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--accent-primary)]/20 to-[var(--accent-secondary)]/20">
                  <Sparkles className="h-9 w-9 text-[var(--accent-primary)]" />
                </div>

                <h3 className="mb-3 text-2xl font-semibold text-[var(--text-primary)]">
                  {t('startConversation')}
                </h3>
                <p className="mb-8 max-w-md text-[var(--text-secondary)]">
                  {t('startDescription')}
                </p>

                {/* Notebook Summary */}
                {notebookSummary && (
                  <div className="mb-8 w-full max-w-lg rounded-xl border border-[rgba(255,255,255,0.1)] bg-[var(--bg-secondary)] p-4">
                    <p className="text-sm text-[var(--text-secondary)]">{notebookSummary}</p>
                  </div>
                )}

                {/* Suggested Questions */}
                <div className="flex max-w-lg flex-wrap justify-center gap-2">
                  {SUGGESTED_QUESTION_KEYS.map((key) => {
                    const question = t(key);
                    return (
                      <Tooltip key={key}>
                        <TooltipTrigger asChild>
                          <motion.button
                            whileHover={selectedSourcesCount > 0 ? { scale: 1.02 } : {}}
                            whileTap={selectedSourcesCount > 0 ? { scale: 0.98 } : {}}
                            onClick={() => selectedSourcesCount > 0 && onSendMessage(question)}
                            disabled={sending || selectedSourcesCount === 0}
                            className="rounded-xl border border-[rgba(255,255,255,0.1)] bg-[var(--bg-secondary)] px-4 py-2.5 text-sm text-[var(--text-secondary)] transition-all hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[var(--bg-secondary)] disabled:hover:text-[var(--text-secondary)]"
                          >
                            {question}
                          </motion.button>
                        </TooltipTrigger>
                        {selectedSourcesCount === 0 && (
                          <TooltipContent>
                            <p>{t('selectSourcesFirst')}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    );
                  })}
                </div>
                {selectedSourcesCount === 0 && totalSourcesCount > 0 && (
                  <p className="mt-4 text-sm text-[var(--text-tertiary)]">
                    {t('selectSourcesHint')}
                  </p>
                )}
              </motion.div>
            ) : (
              <div className="space-y-6">
                <AnimatePresence>
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-5 py-4 ${msg.role === 'user'
                          ? 'rounded-br-md bg-[var(--accent-primary)] text-white'
                          : 'rounded-bl-md border border-[rgba(255,255,255,0.1)] bg-[var(--bg-secondary)]'
                          } `}
                      >
                        <MessageContent content={msg.content} citations={msg.citations} />

                        {/* Actions for assistant messages */}
                        {msg.role === 'assistant' && (
                          <div className="mt-4 flex items-center gap-3 border-t border-[rgba(255,255,255,0.1)] pt-3">
                            {msg.cost_usd !== null && msg.cost_usd > 0 && (
                              <span className="text-xs text-[var(--text-tertiary)]">
                                ${msg.cost_usd.toFixed(4)}
                              </span>
                            )}
                            <div className="ml-auto flex items-center gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-[var(--text-tertiary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                                    onClick={() => copyToClipboard(msg.content)}
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Copy</TooltipContent>
                              </Tooltip>
                              {onSaveResponse && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-[var(--text-tertiary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                                      onClick={() => onSaveResponse(msg)}
                                    >
                                      <StickyNote className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>{t('saveAsNote')}</TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Typing indicator */}
                {sending && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                  >
                    <div className="rounded-2xl rounded-bl-md border border-[rgba(255,255,255,0.1)] bg-[var(--bg-secondary)] px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <span
                            className="typing-dot h-2 w-2 rounded-full bg-[var(--accent-primary)]"
                            style={{ animationDelay: '0ms' }}
                          />
                          <span
                            className="typing-dot h-2 w-2 rounded-full bg-[var(--accent-primary)]"
                            style={{ animationDelay: '200ms' }}
                          />
                          <span
                            className="typing-dot h-2 w-2 rounded-full bg-[var(--accent-primary)]"
                            style={{ animationDelay: '400ms' }}
                          />
                        </div>
                        <span className="text-sm text-[var(--text-tertiary)]">{t('thinking')}</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-[rgba(255,255,255,0.1)] bg-[var(--bg-primary)] p-4">
          <div className="mx-auto max-w-3xl">
            {/* Source warning */}
            {selectedSourcesCount === 0 && totalSourcesCount > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-3 flex items-center gap-2 rounded-xl border border-[var(--warning)]/20 bg-[var(--warning)]/10 px-4 py-2.5 text-sm text-[var(--warning)]"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{t('selectSourcesWarning')}</span>
              </motion.div>
            )}

            {/* Input */}
            <div className="flex items-end gap-3">
              <div className="relative flex-1">
                <Textarea
                  ref={textareaRef}
                  placeholder={t('inputPlaceholder')}
                  value={message}
                  onChange={(e) => onMessageChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={sending}
                  rows={1}
                  className="max-h-[200px] min-h-[52px] resize-none rounded-xl border-[rgba(255,255,255,0.1)] bg-[var(--bg-secondary)] px-4 py-4 pr-12 text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)]"
                />
              </div>
              <Button
                onClick={() => onSendMessage()}
                disabled={sending || !message.trim()}
                size="lg"
                className="h-[52px] w-[52px] shrink-0 rounded-xl bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary)]/90"
              >
                {sending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper component to render message content with citations
function MessageContent({ content, citations }: { content: string; citations: Citation[] }) {
  const [activeCitation, setActiveCitation] = useState<number | null>(null);
  const [loadingSource, setLoadingSource] = useState<string | null>(null);
  const supabase = createClient();
  const t = useTranslations('chat');

  // Open source file in new tab
  const viewSource = useCallback(
    async (citation: Citation) => {
      if (!citation.source_id) {
        toast.error(t('sourceNotAvailable'));
        return;
      }

      setLoadingSource(citation.source_id);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const response = await fetch(`/api/sources/${citation.source_id}/view`, {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        });

        if (!response.ok) {
          throw new Error(t('failedToGetSourceUrl'));
        }

        const data = await response.json();
        if (data.url) {
          window.open(data.url, '_blank');
        }
      } catch (error) {
        console.error('Failed to view source:', error);
        toast.error(t('failedToOpenSource'));
      }
      setLoadingSource(null);
    },
    [supabase]
  );

  // Parse content to make citation references clickable
  const renderContentWithCitations = useCallback(() => {
    // Split content by citation patterns like [1], [2], etc.
    const citationRegex = /\[(\d+)\]/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = citationRegex.exec(content)) !== null) {
      // Add text before the citation
      if (match.index > lastIndex) {
        const textBefore = content.slice(lastIndex, match.index);
        parts.push(
          <ReactMarkdown
            key={`text-${lastIndex}`}
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <span>{children}</span>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              em: ({ children }) => <em className="italic">{children}</em>,
              ul: ({ children }) => (
                <ul className="my-2 list-inside list-disc space-y-1">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="my-2 list-inside list-decimal space-y-1">{children}</ol>
              ),
              li: ({ children }) => <li className="text-[var(--text-primary)]">{children}</li>,
              code: ({ children }) => (
                <code className="rounded bg-[var(--bg-tertiary)] px-1.5 py-0.5 font-mono text-sm">
                  {children}
                </code>
              ),
              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--accent-primary)] hover:underline"
                >
                  {children}
                </a>
              ),
            }}
          >
            {textBefore}
          </ReactMarkdown>
        );
      }

      // Add the clickable citation
      const citationNumber = parseInt(match[1]);
      const citation = citations?.find((c) => c.number === citationNumber);

      parts.push(
        <Popover key={`citation-${match.index}`}>
          <PopoverTrigger asChild>
            <button
              className="mx-0.5 inline-flex h-5 min-w-[1.5rem] cursor-pointer items-center justify-center rounded bg-[var(--accent-primary)]/20 px-1 align-middle text-xs font-medium text-[var(--accent-primary)] transition-colors hover:bg-[var(--accent-primary)]/30"
              onClick={() =>
                setActiveCitation(activeCitation === citationNumber ? null : citationNumber)
              }
            >
              [{citationNumber}]
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="z-[100] w-80 border border-[rgba(255,255,255,0.2)] bg-[#1a1a2e] p-4 shadow-xl"
            sideOffset={5}
          >
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded bg-[var(--accent-primary)]/20 text-xs font-bold text-[var(--accent-primary)]">
                  {citationNumber}
                </div>
                <p className="flex-1 truncate text-sm font-medium text-[var(--text-primary)]">
                  {citation?.source_name || t('defaultSourceName')}
                </p>
                {citation?.file_path && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/20"
                    onClick={() => citation && viewSource(citation)}
                    disabled={loadingSource === citation?.source_id}
                  >
                    {loadingSource === citation?.source_id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <ExternalLink className="mr-1 h-3 w-3" />
                        {t('viewSource')}
                      </>
                    )}
                  </Button>
                )}
              </div>
              {citation?.text ? (
                <p className="border-l-2 border-[var(--accent-primary)]/30 pl-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                  "{citation.text}"
                </p>
              ) : (
                <p className="text-sm text-[var(--text-tertiary)] italic">
                  {t('referencedFromSource')}
                </p>
              )}
            </div>
          </PopoverContent>
        </Popover>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text after last citation
    if (lastIndex < content.length) {
      const remainingText = content.slice(lastIndex);
      parts.push(
        <ReactMarkdown
          key={`text-${lastIndex}`}
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => <span>{children}</span>,
            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
            em: ({ children }) => <em className="italic">{children}</em>,
            ul: ({ children }) => (
              <ul className="my-2 list-inside list-disc space-y-1">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="my-2 list-inside list-decimal space-y-1">{children}</ol>
            ),
            li: ({ children }) => <li className="text-[var(--text-primary)]">{children}</li>,
            code: ({ children }) => (
              <code className="rounded bg-[var(--bg-tertiary)] px-1.5 py-0.5 font-mono text-sm">
                {children}
              </code>
            ),
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent-primary)] hover:underline"
              >
                {children}
              </a>
            ),
          }}
        >
          {remainingText}
        </ReactMarkdown>
      );
    }

    // If no citations found, just render markdown
    if (parts.length === 0) {
      return (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
            em: ({ children }) => <em className="italic">{children}</em>,
            ul: ({ children }) => (
              <ul className="my-2 list-inside list-disc space-y-1">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="my-2 list-inside list-decimal space-y-1">{children}</ol>
            ),
            li: ({ children }) => <li className="text-[var(--text-primary)]">{children}</li>,
            code: ({ children }) => (
              <code className="rounded bg-[var(--bg-tertiary)] px-1.5 py-0.5 font-mono text-sm">
                {children}
              </code>
            ),
            pre: ({ children }) => (
              <pre className="my-2 overflow-x-auto rounded-lg bg-[var(--bg-tertiary)] p-3">
                {children}
              </pre>
            ),
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent-primary)] hover:underline"
              >
                {children}
              </a>
            ),
            h1: ({ children }) => <h1 className="mt-4 mb-2 text-xl font-bold">{children}</h1>,
            h2: ({ children }) => <h2 className="mt-3 mb-2 text-lg font-bold">{children}</h2>,
            h3: ({ children }) => <h3 className="mt-2 mb-1 text-base font-bold">{children}</h3>,
            blockquote: ({ children }) => (
              <blockquote className="my-2 border-l-2 border-[var(--accent-primary)] pl-3 text-[var(--text-secondary)]">
                {children}
              </blockquote>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      );
    }

    return parts;
  }, [content, citations, activeCitation, loadingSource, viewSource]);

  return (
    <div className="text-[15px] leading-relaxed text-[var(--text-primary)]">
      <div className="prose prose-invert max-w-none">{renderContentWithCitations()}</div>
      {citations && citations.length > 0 && (
        <div className="mt-4 border-t border-[rgba(255,255,255,0.1)] pt-3">
          <p className="mb-2 text-xs font-medium text-[var(--text-tertiary)]">{t('sourcesLabel')}</p>
          <div className="flex flex-wrap gap-2">
            {citations.map((citation, idx) => (
              <Popover key={idx}>
                <PopoverTrigger asChild>
                  <button className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--accent-primary)]/10 px-2.5 py-1.5 text-xs text-[var(--accent-primary)] transition-colors hover:bg-[var(--accent-primary)]/20">
                    <span className="font-semibold">[{citation.number}]</span>
                    <span className="max-w-[150px] truncate">{citation.source_name}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="z-[100] w-80 border border-[rgba(255,255,255,0.2)] bg-[#1a1a2e] p-4 shadow-xl"
                  sideOffset={5}
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded bg-[var(--accent-primary)]/20 text-xs font-bold text-[var(--accent-primary)]">
                        {citation.number}
                      </div>
                      <p className="flex-1 truncate text-sm font-medium text-[var(--text-primary)]">
                        {citation.source_name}
                      </p>
                      {citation.file_path && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/20"
                          onClick={() => viewSource(citation)}
                          disabled={loadingSource === citation.source_id}
                        >
                          {loadingSource === citation.source_id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <ExternalLink className="mr-1 h-3 w-3" />
                              {t('viewSource')}
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                    {citation.text ? (
                      <p className="border-l-2 border-[var(--accent-primary)]/30 pl-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                        "{citation.text}"
                      </p>
                    ) : (
                      <p className="text-sm text-[var(--text-tertiary)] italic">
                        {t('referencedFromSource')}
                      </p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
