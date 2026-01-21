'use client';

import { User } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, BookOpen, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

import { FeaturedCarousel } from '@/components/dashboard/featured-carousel';
import { DashboardHeader } from '@/components/dashboard/header';
import { NotebookCard, CreateNotebookCard } from '@/components/dashboard/notebook-card';
import { DashboardTabs } from '@/components/dashboard/tabs';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { createClient, Notebook } from '@/lib/supabase';

const EMOJI_OPTIONS = ['📚', '🔬', '💡', '🎯', '📊', '🚀', '💻', '🎨', '📝', '🔍', '🧠', '⚡'];

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newNotebookName, setNewNotebookName] = useState('');
  const [newNotebookDescription, setNewNotebookDescription] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('📚');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const supabase = createClient();
  const t = useTranslations();

  useEffect(() => {
    const checkUser = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();
        if (error || !user) {
          router.push('/auth/login');
          return;
        }
        setUser(user);
        fetchNotebooks();
      } catch (e) {
        console.error('Auth check failed:', e);
        router.push('/auth/login');
      }
    };
    checkUser();
  }, []);

  const fetchNotebooks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notebooks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to load notebooks:', error);
        toast.error('Failed to load notebooks');
      } else {
        setNotebooks(data || []);
      }
    } catch (e) {
      console.error('Network error loading notebooks:', e);
      toast.error('Network error - please check your connection');
    }
    setLoading(false);
  };

  const createNotebook = async () => {
    if (!newNotebookName.trim()) return;

    setCreating(true);
    const { data, error } = await supabase
      .from('notebooks')
      .insert({
        name: newNotebookName,
        description: newNotebookDescription || null,
        emoji: selectedEmoji,
        user_id: user?.id,
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to create notebook');
    } else {
      toast.success('Notebook created!');
      setNotebooks([data, ...notebooks]);
      resetDialog();
      router.push(`/notebooks/${data.id}`);
    }
    setCreating(false);
  };

  const resetDialog = () => {
    setNewNotebookName('');
    setNewNotebookDescription('');
    setSelectedEmoji('📚');
    setDialogOpen(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  const deleteNotebook = async (id: string) => {
    const { error } = await supabase.from('notebooks').delete().eq('id', id);

    if (error) {
      toast.error('Failed to delete notebook');
    } else {
      setNotebooks(notebooks.filter((n) => n.id !== id));
      toast.success('Notebook deleted');
    }
  };

  const toggleFeatured = async (id: string) => {
    const notebook = notebooks.find((n) => n.id === id);
    if (!notebook) return;

    const { error } = await supabase
      .from('notebooks')
      .update({ is_featured: !notebook.is_featured })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update notebook');
    } else {
      setNotebooks(notebooks.map((n) => (n.id === id ? { ...n, is_featured: !n.is_featured } : n)));
    }
  };

  const formatLastEdited = (date: string) => {
    const now = new Date();
    const edited = new Date(date);
    const diffMs = now.getTime() - edited.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return edited.toLocaleDateString();
  };

  const filteredNotebooks = useMemo(() => {
    let filtered = notebooks;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (n) => n.name.toLowerCase().includes(query) || n.description?.toLowerCase().includes(query)
      );
    }

    // Apply tab filter
    if (activeTab === 'featured') {
      filtered = filtered.filter((n) => n.is_featured);
    } else if (activeTab === 'archived') {
      filtered = filtered.filter((n) => n.is_archived);
    } else {
      // Recent: exclude archived
      filtered = filtered.filter((n) => !n.is_archived);
    }

    return filtered;
  }, [notebooks, searchQuery, activeTab]);

  const featuredNotebooks = useMemo(
    () => notebooks.filter((n) => n.is_featured && !n.is_archived),
    [notebooks]
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-primary)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <DashboardHeader
        user={user}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onLogout={handleLogout}
      />

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Featured Section */}
        {activeTab === 'recent' && featuredNotebooks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <FeaturedCarousel
              notebooks={featuredNotebooks.map((n) => ({
                id: n.id,
                emoji: n.emoji,
                name: n.name,
                sourceCount: n.source_count || 0,
                description: n.description,
              }))}
              onOpen={(id) => router.push(`/notebooks/${id}`)}
            />
          </motion.div>
        )}

        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center"
        >
          <div className="flex items-center gap-4">
            <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} />
          </div>

          <Button
            onClick={() => setDialogOpen(true)}
            className="btn-hover h-10 rounded-xl bg-[var(--accent-primary)] px-4 font-medium text-white hover:bg-[var(--accent-primary)]/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('dashboard.createNew')}
          </Button>
        </motion.div>

        {/* Notebooks Grid */}
        <AnimatePresence mode="wait">
          {filteredNotebooks.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--bg-tertiary)]">
                <BookOpen className="h-10 w-10 text-[var(--text-tertiary)]" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-[var(--text-primary)]">
                {searchQuery ? t('dashboard.noResults') : t('dashboard.empty')}
              </h3>
              <p className="mb-6 max-w-sm text-center text-[var(--text-secondary)]">
                {searchQuery
                  ? t('dashboard.tryDifferentSearch')
                  : t('dashboard.emptyDescription')}
              </p>
              {!searchQuery && (
                <Button
                  onClick={() => setDialogOpen(true)}
                  className="btn-hover h-11 rounded-xl bg-[var(--accent-primary)] px-6 font-medium text-white hover:bg-[var(--accent-primary)]/90"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t('notebook.create')}
                </Button>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              <CreateNotebookCard onClick={() => setDialogOpen(true)} />

              {filteredNotebooks.map((notebook, index) => (
                <motion.div
                  key={notebook.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <NotebookCard
                    id={notebook.id}
                    emoji={notebook.emoji}
                    name={notebook.name}
                    sourceCount={notebook.source_count || 0}
                    description={notebook.description}
                    lastEdited={formatLastEdited(notebook.updated_at || notebook.created_at)}
                    isFeatured={notebook.is_featured}
                    onOpen={(id) => router.push(`/notebooks/${id}`)}
                    onDelete={deleteNotebook}
                    onToggleFeatured={toggleFeatured}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Create Notebook Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && resetDialog()}>
        <DialogContent className="border-[rgba(255,255,255,0.1)] bg-[var(--bg-secondary)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[var(--text-primary)]">{t('notebook.createTitle')}</DialogTitle>
            <DialogDescription className="text-[var(--text-secondary)]">
              {t('notebook.createDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Emoji Picker */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--text-primary)]">{t('notebook.icon')}</label>
              <div className="flex flex-wrap gap-2">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setSelectedEmoji(emoji)}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl transition-all ${selectedEmoji === emoji
                      ? 'bg-[var(--accent-primary)]/20 ring-2 ring-[var(--accent-primary)]'
                      : 'bg-[var(--bg-tertiary)] hover:bg-[var(--bg-surface)]'
                      } `}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Name Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--text-primary)]">{t('notebook.name')}</label>
              <Input
                placeholder={t('notebook.namePlaceholder')}
                value={newNotebookName}
                onChange={(e) => setNewNotebookName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createNotebook()}
                className="h-11 rounded-xl border-[rgba(255,255,255,0.1)] bg-[var(--bg-tertiary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)]"
              />
            </div>

            {/* Description Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--text-primary)]">
                {t('notebook.description')} <span className="text-[var(--text-tertiary)]">({t('common.optional')})</span>
              </label>
              <Textarea
                placeholder={t('notebook.descriptionPlaceholder')}
                value={newNotebookDescription}
                onChange={(e) => setNewNotebookDescription(e.target.value)}
                className="resize-none rounded-xl border-[rgba(255,255,255,0.1)] bg-[var(--bg-tertiary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)]"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={resetDialog}
              className="rounded-xl border-[rgba(255,255,255,0.1)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={createNotebook}
              disabled={creating || !newNotebookName.trim()}
              className="btn-hover rounded-xl bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary)]/90"
            >
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('notebook.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
