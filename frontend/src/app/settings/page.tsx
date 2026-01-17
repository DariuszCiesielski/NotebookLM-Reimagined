'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Key,
  Plus,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  Check,
  AlertTriangle,
  Settings,
  ArrowLeft,
  RefreshCw,
  BookOpen,
  Link2,
  Code,
  MessageSquare,
  FileText,
  Mic,
  Video,
  Brain,
  GraduationCap,
  ExternalLink,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { apiKeysApi, ApiKey, ApiKeyWithSecret } from '@/lib/api';
import { createClient } from '@/lib/supabase';

const API_KEY_SCOPES = [
  { value: '*', label: 'Full Access', description: 'Access to all operations' },
  { value: 'read', label: 'Read Only', description: 'Can only read data, no modifications' },
  { value: 'notebooks', label: 'Notebooks', description: 'Manage notebooks' },
  { value: 'sources', label: 'Sources', description: 'Upload and manage sources' },
  { value: 'chat', label: 'Chat', description: 'Send chat messages' },
  { value: 'audio', label: 'Audio', description: 'Generate audio overviews' },
  { value: 'video', label: 'Video', description: 'Generate video content' },
  { value: 'research', label: 'Research', description: 'Run deep research tasks' },
  { value: 'study', label: 'Study', description: 'Generate study materials' },
  { value: 'notes', label: 'Notes', description: 'Manage notes' },
];

interface Notebook {
  id: string;
  name: string;
  emoji: string | null;
}

type OperationType =
  | 'list_notebooks'
  | 'chat'
  | 'sources'
  | 'audio'
  | 'video'
  | 'research'
  | 'study'
  | 'global_chat';

const operations: {
  value: OperationType;
  label: string;
  icon: React.ReactNode;
  method: string;
  needsNotebook: boolean;
  path: string;
  body?: object;
}[] = [
  {
    value: 'list_notebooks',
    label: 'List Notebooks',
    icon: <BookOpen className="h-4 w-4" />,
    method: 'GET',
    needsNotebook: false,
    path: '/api/v1/notebooks',
  },
  {
    value: 'chat',
    label: 'Chat with Notebook',
    icon: <MessageSquare className="h-4 w-4" />,
    method: 'POST',
    needsNotebook: true,
    path: '/api/v1/notebooks/{id}/chat',
    body: { message: 'What are the key insights from this content?' },
  },
  {
    value: 'sources',
    label: 'List Sources',
    icon: <FileText className="h-4 w-4" />,
    method: 'GET',
    needsNotebook: true,
    path: '/api/v1/notebooks/{id}/sources',
  },
  {
    value: 'audio',
    label: 'Generate Audio',
    icon: <Mic className="h-4 w-4" />,
    method: 'POST',
    needsNotebook: true,
    path: '/api/v1/notebooks/{id}/audio',
    body: { format: 'deep_dive' },
  },
  {
    value: 'video',
    label: 'Generate Video',
    icon: <Video className="h-4 w-4" />,
    method: 'POST',
    needsNotebook: true,
    path: '/api/v1/notebooks/{id}/video',
    body: { style: 'explainer' },
  },
  {
    value: 'research',
    label: 'Deep Research',
    icon: <Brain className="h-4 w-4" />,
    method: 'POST',
    needsNotebook: true,
    path: '/api/v1/notebooks/{id}/research',
    body: { query: 'Latest developments in this topic', mode: 'deep' },
  },
  {
    value: 'study',
    label: 'Generate Flashcards',
    icon: <GraduationCap className="h-4 w-4" />,
    method: 'POST',
    needsNotebook: true,
    path: '/api/v1/notebooks/{id}/flashcards',
    body: { count: 10 },
  },
  {
    value: 'global_chat',
    label: 'Global Chat (All Notebooks)',
    icon: <MessageSquare className="h-4 w-4" />,
    method: 'POST',
    needsNotebook: false,
    path: '/api/v1/chat/global',
    body: { message: 'Search across all my knowledge' },
  },
];

export default function SettingsPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newKeyDialogOpen, setNewKeyDialogOpen] = useState(false);
  const [newKeySecret, setNewKeySecret] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Create form state
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyDescription, setNewKeyDescription] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(['*']);
  const [newKeyRpm, setNewKeyRpm] = useState(60);
  const [newKeyRpd, setNewKeyRpd] = useState(10000);

  // API Request Builder state
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [selectedNotebook, setSelectedNotebook] = useState<string>('');
  const [selectedOperation, setSelectedOperation] = useState<OperationType>('chat');
  const [loadingNotebooks, setLoadingNotebooks] = useState(false);

  const router = useRouter();
  const supabase = createClient();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://notebooklm-api.vercel.app';

  useEffect(() => {
    checkAuthAndLoadKeys();
    loadNotebooks();
  }, []);

  async function checkAuthAndLoadKeys() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth/login');
      return;
    }
    await loadApiKeys();
  }

  async function loadApiKeys() {
    setLoading(true);
    try {
      const response = await apiKeysApi.list();
      setApiKeys(response.data);
    } catch (error) {
      console.error('Failed to load API keys:', error);
      toast.error('Failed to load API keys');
    }
    setLoading(false);
  }

  async function createApiKey() {
    if (!newKeyName.trim()) {
      toast.error('Please enter a name for the API key');
      return;
    }

    setCreating(true);
    try {
      const response = await apiKeysApi.create({
        name: newKeyName,
        description: newKeyDescription || undefined,
        scopes: newKeyScopes,
        rate_limit_rpm: newKeyRpm,
        rate_limit_rpd: newKeyRpd,
      });

      // Show the secret key dialog
      setNewKeySecret(response.data.key);
      setCreateDialogOpen(false);
      setNewKeyDialogOpen(true);

      // Reset form
      setNewKeyName('');
      setNewKeyDescription('');
      setNewKeyScopes(['*']);
      setNewKeyRpm(60);
      setNewKeyRpd(10000);

      // Reload keys
      await loadApiKeys();
    } catch (error) {
      console.error('Failed to create API key:', error);
      toast.error('Failed to create API key');
    }
    setCreating(false);
  }

  async function revokeApiKey(keyId: string, keyName: string) {
    if (!confirm(`Are you sure you want to revoke "${keyName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await apiKeysApi.revoke(keyId);
      setApiKeys(apiKeys.filter((k) => k.id !== keyId));
      toast.success('API key revoked');
    } catch (error) {
      console.error('Failed to revoke API key:', error);
      toast.error('Failed to revoke API key');
    }
  }

  async function toggleApiKey(keyId: string, isActive: boolean) {
    try {
      await apiKeysApi.update(keyId, { is_active: !isActive });
      setApiKeys(apiKeys.map((k) => (k.id === keyId ? { ...k, is_active: !isActive } : k)));
      toast.success(isActive ? 'API key disabled' : 'API key enabled');
    } catch (error) {
      console.error('Failed to update API key:', error);
      toast.error('Failed to update API key');
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  }

  function copyToClipboardField(text: string, field: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  async function loadNotebooks() {
    setLoadingNotebooks(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${apiUrl}/api/v1/notebooks`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const notebookList = data.data || [];
        setNotebooks(notebookList);
        if (notebookList.length > 0 && !selectedNotebook) {
          setSelectedNotebook(notebookList[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load notebooks:', error);
    } finally {
      setLoadingNotebooks(false);
    }
  }

  // API Request Builder computations
  const currentOp = operations.find((op) => op.value === selectedOperation) || operations[0];
  const selectedNotebookData = notebooks.find((n) => n.id === selectedNotebook);
  const actualPath =
    currentOp.needsNotebook && selectedNotebook
      ? currentOp.path.replace('{id}', selectedNotebook)
      : currentOp.path;
  const fullUrl = `${apiUrl}${actualPath}`;
  const activeKey = apiKeys.find((k) => k.is_active);
  const apiKeyDisplay = activeKey ? `${activeKey.key_prefix}...` : 'No API key created';

  // Generate cURL command
  let curlExample = `curl -X ${currentOp.method} "${fullUrl}" \\
  -H "X-API-Key: YOUR_API_KEY"`;
  if (currentOp.body) {
    curlExample += ` \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(currentOp.body)}'`;
  }

  // Generate n8n config
  const n8nConfigObj: Record<string, unknown> = {
    method: currentOp.method,
    url: fullUrl,
    headers: { 'X-API-Key': 'YOUR_API_KEY' },
  };
  if (currentOp.body) {
    n8nConfigObj.body = currentOp.body;
  }
  const n8nConfig = JSON.stringify(n8nConfigObj, null, 2);

  // Generate Make config
  let makeConfig = `URL: ${fullUrl}
Method: ${currentOp.method}
Headers:
  X-API-Key: YOUR_API_KEY`;
  if (currentOp.body) {
    makeConfig += `
Body (JSON):
  ${JSON.stringify(currentOp.body, null, 2).split('\n').join('\n  ')}`;
  }

  // Generate Zapier config
  let zapierConfig = `Webhook URL: ${fullUrl}
Method: ${currentOp.method}
Headers:
  X-API-Key: YOUR_API_KEY`;
  if (currentOp.body) {
    zapierConfig += `
Data:
  ${JSON.stringify(currentOp.body, null, 2).split('\n').join('\n  ')}`;
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--bg-secondary)]">
        <div className="mx-auto max-w-5xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/')}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <div className="flex items-center gap-3">
                <Settings className="h-6 w-6 text-[var(--accent-primary)]" />
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Settings</h1>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/docs')}
              className="border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            >
              <BookOpen className="mr-2 h-4 w-4" />
              API Documentation
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <Tabs defaultValue="api-keys" className="space-y-6">
          <TabsList className="border border-[var(--border)] bg-[var(--bg-secondary)]">
            <TabsTrigger
              value="api-keys"
              className="gap-2 data-[state=active]:bg-[var(--accent-primary)] data-[state=active]:text-white"
            >
              <Key className="h-4 w-4" />
              API Keys
            </TabsTrigger>
            <TabsTrigger
              value="request-builder"
              className="gap-2 data-[state=active]:bg-[var(--accent-primary)] data-[state=active]:text-white"
            >
              <Link2 className="h-4 w-4" />
              API Request Builder
            </TabsTrigger>
          </TabsList>

          <TabsContent value="api-keys" className="space-y-6">
            {/* API Keys Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">API Keys</h2>
                <p className="mt-1 text-[var(--text-secondary)]">
                  Manage API keys for programmatic access to NotebookLM Reimagined
                </p>
              </div>
              <Button
                onClick={() => setCreateDialogOpen(true)}
                className="bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary)]/80"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create API Key
              </Button>
            </div>

            {/* Usage Example */}
            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-medium text-[var(--text-primary)]">Quick Start</h3>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => router.push('/docs')}
                  className="px-0 text-[var(--accent-primary)] hover:text-[var(--accent-primary)]/80"
                >
                  View Full Documentation →
                </Button>
              </div>
              <p className="mb-3 text-sm text-[var(--text-secondary)]">
                Use your API key with the{' '}
                <code className="rounded bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-[var(--accent-primary)]">
                  X-API-Key
                </code>{' '}
                header:
              </p>
              <pre className="overflow-x-auto rounded bg-[var(--bg-tertiary)] p-3 text-sm text-[var(--text-secondary)]">
                {`curl -X POST https://notebooklm-api.vercel.app/api/v1/notebooks/{id}/chat \\
  -H "X-API-Key: nb_live_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "What are the key findings?"}'`}
              </pre>
            </div>

            {/* API Keys List */}
            <div className="space-y-4">
              {loading ? (
                <div className="py-12 text-center text-[var(--text-secondary)]">
                  <RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin" />
                  Loading API keys...
                </div>
              ) : apiKeys.length === 0 ? (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] py-12 text-center">
                  <Key className="mx-auto mb-4 h-12 w-12 text-[var(--text-tertiary)]" />
                  <h3 className="mb-2 text-lg font-medium text-[var(--text-primary)]">
                    No API Keys
                  </h3>
                  <p className="mb-4 text-[var(--text-secondary)]">
                    Create an API key to access NotebookLM Reimagined programmatically
                  </p>
                  <Button
                    onClick={() => setCreateDialogOpen(true)}
                    className="bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary)]/80"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First API Key
                  </Button>
                </div>
              ) : (
                apiKeys.map((key) => (
                  <div
                    key={key.id}
                    className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-2 w-2 rounded-full ${key.is_active ? 'bg-[var(--success)]' : 'bg-[var(--text-tertiary)]'}`}
                        />
                        <h3 className="text-lg font-medium text-[var(--text-primary)]">
                          {key.name}
                        </h3>
                        {!key.is_active && (
                          <Badge
                            variant="secondary"
                            className="bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
                          >
                            Disabled
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleApiKey(key.id, key.is_active)}
                          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                          title={key.is_active ? 'Disable key' : 'Enable key'}
                        >
                          {key.is_active ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => revokeApiKey(key.id, key.name)}
                          className="text-[var(--error)] hover:bg-[var(--error)]/10 hover:text-[var(--error)]"
                          title="Revoke key"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {key.description && (
                      <p className="mb-3 text-sm text-[var(--text-secondary)]">{key.description}</p>
                    )}

                    <div className="mb-3 flex items-center gap-4 text-sm">
                      <div className="rounded bg-[var(--bg-tertiary)] px-3 py-1.5 font-mono text-[var(--text-secondary)]">
                        {key.key_prefix}
                      </div>
                      <div className="text-[var(--text-tertiary)]">
                        Created: {formatDate(key.created_at)}
                      </div>
                      <div className="text-[var(--text-tertiary)]">
                        Last used: {formatDate(key.last_used_at)}
                      </div>
                      <div className="text-[var(--text-tertiary)]">
                        {key.total_requests.toLocaleString()} requests
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {key.scopes.map((scope) => (
                        <Badge
                          key={scope}
                          variant="secondary"
                          className="border-0 bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]"
                        >
                          {scope === '*' ? 'Full Access' : scope}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {/* API Request Builder Tab */}
          <TabsContent value="request-builder" className="space-y-6">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-6">
              <div className="mb-2 flex items-center gap-3">
                <Link2 className="h-5 w-5 text-[var(--accent-primary)]" />
                <h2 className="text-lg font-medium text-[var(--text-primary)]">
                  API Request Builder
                </h2>
              </div>
              <p className="mb-6 text-sm text-[var(--text-secondary)]">
                Select an operation and notebook to generate ready-to-use API requests for n8n,
                Zapier, Make, or cURL.
              </p>

              <div className="space-y-6">
                {/* Operation & Notebook Selector */}
                <div className="space-y-4 rounded-lg border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10 p-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {/* Operation Selector */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[var(--text-secondary)]">
                        Operation
                      </label>
                      <Select
                        value={selectedOperation}
                        onValueChange={(v) => setSelectedOperation(v as OperationType)}
                      >
                        <SelectTrigger className="border-[var(--border)] bg-[var(--bg-tertiary)] text-[var(--text-primary)]">
                          <SelectValue placeholder="Select operation" />
                        </SelectTrigger>
                        <SelectContent className="border-[var(--border)] bg-[var(--bg-secondary)]">
                          {operations.map((op) => (
                            <SelectItem
                              key={op.value}
                              value={op.value}
                              className="text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
                            >
                              <div className="flex items-center gap-2">
                                {op.icon}
                                <span>{op.label}</span>
                                <span
                                  className={`ml-2 rounded px-1.5 py-0.5 text-xs ${
                                    op.method === 'GET'
                                      ? 'bg-[var(--success)]/20 text-[var(--success)]'
                                      : 'bg-[var(--info)]/20 text-[var(--info)]'
                                  }`}
                                >
                                  {op.method}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Notebook Selector */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
                        Notebook
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={loadNotebooks}
                          disabled={loadingNotebooks}
                          className="h-6 w-6 p-0 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        >
                          <RefreshCw
                            className={`h-3 w-3 ${loadingNotebooks ? 'animate-spin' : ''}`}
                          />
                        </Button>
                      </label>
                      <Select
                        value={selectedNotebook}
                        onValueChange={setSelectedNotebook}
                        disabled={!currentOp.needsNotebook}
                      >
                        <SelectTrigger
                          className={`border-[var(--border)] bg-[var(--bg-tertiary)] text-[var(--text-primary)] ${!currentOp.needsNotebook ? 'opacity-50' : ''}`}
                        >
                          <SelectValue
                            placeholder={
                              currentOp.needsNotebook ? 'Select notebook' : 'Not required'
                            }
                          />
                        </SelectTrigger>
                        <SelectContent className="border-[var(--border)] bg-[var(--bg-secondary)]">
                          {notebooks.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-[var(--text-secondary)]">
                              No notebooks found
                            </div>
                          ) : (
                            notebooks.map((nb) => (
                              <SelectItem
                                key={nb.id}
                                value={nb.id}
                                className="text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
                              >
                                <div className="flex items-center gap-2">
                                  <span>{nb.emoji || '📓'}</span>
                                  <span>{nb.name}</span>
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Selected info */}
                  {currentOp.needsNotebook && selectedNotebookData && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-[var(--text-secondary)]">Target:</span>
                      <span className="font-medium text-[var(--text-primary)]">
                        {selectedNotebookData.emoji || '📓'} {selectedNotebookData.name}
                      </span>
                      <code className="rounded bg-[var(--bg-tertiary)] px-2 py-0.5 text-xs text-[var(--text-tertiary)]">
                        {selectedNotebook.slice(0, 8)}...
                      </code>
                    </div>
                  )}
                </div>

                {/* Server URL */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--text-secondary)]">
                    Server URL
                  </label>
                  <div className="relative">
                    <pre className="overflow-x-auto rounded-lg bg-[var(--bg-tertiary)] p-4 pr-16 font-mono text-sm text-[var(--text-primary)]">
                      {apiUrl}
                    </pre>
                    <Button
                      size="sm"
                      className="absolute top-2 right-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/80"
                      onClick={() => copyToClipboardField(apiUrl, 'url')}
                    >
                      {copiedField === 'url' ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* API Key */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
                    <Key className="h-4 w-4" />
                    API Key
                  </label>
                  {activeKey ? (
                    <div className="relative">
                      <pre className="overflow-x-auto rounded-lg bg-[var(--bg-tertiary)] p-4 pr-16 font-mono text-sm text-[var(--text-primary)]">
                        {apiKeyDisplay}
                      </pre>
                      <p className="mt-2 text-xs text-[var(--text-tertiary)]">
                        Full key shown only once when created. Go to the{' '}
                        <button
                          onClick={() => {}}
                          className="text-[var(--accent-primary)] hover:underline"
                        >
                          API Keys tab
                        </button>{' '}
                        to manage keys.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-[var(--warning)]/30 bg-[var(--warning)]/10 p-4">
                      <p className="text-sm text-[var(--warning)]">
                        No API key found.{' '}
                        <button
                          onClick={() => setCreateDialogOpen(true)}
                          className="font-medium text-[var(--accent-primary)] hover:underline"
                        >
                          Create one now
                        </button>
                      </p>
                    </div>
                  )}
                </div>

                {/* cURL Example */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
                    <Code className="h-4 w-4" />
                    cURL: {currentOp.label}
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs ${
                        currentOp.method === 'GET'
                          ? 'bg-[var(--success)]/20 text-[var(--success)]'
                          : 'bg-[var(--info)]/20 text-[var(--info)]'
                      }`}
                    >
                      {currentOp.method}
                    </span>
                  </label>
                  <div className="relative">
                    <pre className="overflow-x-auto rounded-lg bg-[var(--bg-tertiary)] p-4 pr-16 font-mono text-sm whitespace-pre-wrap text-[var(--success)]">
                      {curlExample}
                    </pre>
                    <Button
                      size="sm"
                      className="absolute top-2 right-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/80"
                      onClick={() => copyToClipboardField(curlExample, 'curl')}
                    >
                      {copiedField === 'curl' ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* n8n Config */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
                    <img src="https://n8n.io/favicon.ico" alt="n8n" className="h-4 w-4" />
                    n8n HTTP Request Node
                  </label>
                  <div className="relative">
                    <pre className="overflow-x-auto rounded-lg bg-[var(--bg-tertiary)] p-4 pr-16 font-mono text-sm whitespace-pre-wrap text-[var(--info)]">
                      {n8nConfig}
                    </pre>
                    <Button
                      size="sm"
                      className="absolute top-2 right-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/80"
                      onClick={() => copyToClipboardField(n8nConfig, 'n8n')}
                    >
                      {copiedField === 'n8n' ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Make Config */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
                    <ExternalLink className="h-4 w-4" />
                    Make (Integromat) HTTP Module
                  </label>
                  <div className="relative">
                    <pre className="overflow-x-auto rounded-lg bg-[var(--bg-tertiary)] p-4 pr-16 font-mono text-sm whitespace-pre-wrap text-[var(--accent-primary)]">
                      {makeConfig}
                    </pre>
                    <Button
                      size="sm"
                      className="absolute top-2 right-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/80"
                      onClick={() => copyToClipboardField(makeConfig, 'make')}
                    >
                      {copiedField === 'make' ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Zapier Config */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
                    <ExternalLink className="h-4 w-4" />
                    Zapier Webhooks
                  </label>
                  <div className="relative">
                    <pre className="overflow-x-auto rounded-lg bg-[var(--bg-tertiary)] p-4 pr-16 font-mono text-sm whitespace-pre-wrap text-[var(--warning)]">
                      {zapierConfig}
                    </pre>
                    <Button
                      size="sm"
                      className="absolute top-2 right-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/80"
                      onClick={() => copyToClipboardField(zapierConfig, 'zapier')}
                    >
                      {copiedField === 'zapier' ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Available Endpoints */}
                <div className="space-y-2 border-t border-[var(--border)] pt-4">
                  <label className="text-sm font-medium text-[var(--text-secondary)]">
                    Popular Endpoints
                  </label>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {[
                      { method: 'GET', path: '/api/v1/notebooks', desc: 'List all notebooks' },
                      {
                        method: 'POST',
                        path: '/api/v1/notebooks/{id}/chat',
                        desc: 'Chat with notebook',
                      },
                      {
                        method: 'GET',
                        path: '/api/v1/notebooks/{id}/sources',
                        desc: 'List sources',
                      },
                      { method: 'POST', path: '/api/v1/chat/global', desc: 'Global search' },
                    ].map((endpoint) => (
                      <div
                        key={endpoint.path}
                        className="flex items-start gap-2 rounded-lg bg-[var(--bg-tertiary)] p-3"
                      >
                        <span
                          className={`rounded px-1.5 py-0.5 font-mono text-xs ${
                            endpoint.method === 'GET'
                              ? 'bg-[var(--success)]/20 text-[var(--success)]'
                              : 'bg-[var(--info)]/20 text-[var(--info)]'
                          }`}
                        >
                          {endpoint.method}
                        </span>
                        <div>
                          <code className="text-xs text-[var(--text-secondary)]">
                            {endpoint.path}
                          </code>
                          <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
                            {endpoint.desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-[var(--text-tertiary)]">
                    <Link href="/docs" className="text-[var(--accent-primary)] hover:underline">
                      View full API documentation →
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Create API Key Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription className="text-[var(--text-secondary)]">
              Create a new API key for programmatic access. The key will only be shown once.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--text-primary)]">Name *</label>
              <Input
                placeholder="My API Key"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="border-[var(--border)] bg-[var(--bg-tertiary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--text-primary)]">
                Description <span className="text-[var(--text-tertiary)]">(optional)</span>
              </label>
              <Textarea
                placeholder="What is this key for?"
                value={newKeyDescription}
                onChange={(e) => setNewKeyDescription(e.target.value)}
                className="border-[var(--border)] bg-[var(--bg-tertiary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--text-primary)]">Permissions</label>
              <div className="grid grid-cols-2 gap-2">
                {API_KEY_SCOPES.map((scope) => (
                  <label
                    key={scope.value}
                    className="flex cursor-pointer items-center gap-2 rounded bg-[var(--bg-tertiary)] p-2 hover:bg-[var(--bg-surface)]"
                  >
                    <Checkbox
                      checked={newKeyScopes.includes(scope.value)}
                      onCheckedChange={(checked) => {
                        if (scope.value === '*') {
                          setNewKeyScopes(checked ? ['*'] : []);
                        } else {
                          if (checked) {
                            setNewKeyScopes([
                              ...newKeyScopes.filter((s) => s !== '*'),
                              scope.value,
                            ]);
                          } else {
                            setNewKeyScopes(newKeyScopes.filter((s) => s !== scope.value));
                          }
                        }
                      }}
                      className="border-[var(--text-tertiary)] data-[state=checked]:border-[var(--accent-primary)] data-[state=checked]:bg-[var(--accent-primary)]"
                    />
                    <div>
                      <span className="text-sm text-[var(--text-primary)]">{scope.label}</span>
                      <p className="text-xs text-[var(--text-tertiary)]">{scope.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text-primary)]">
                  Rate Limit (per minute)
                </label>
                <Input
                  type="number"
                  value={newKeyRpm}
                  onChange={(e) => setNewKeyRpm(parseInt(e.target.value) || 60)}
                  className="border-[var(--border)] bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text-primary)]">
                  Rate Limit (per day)
                </label>
                <Input
                  type="number"
                  value={newKeyRpd}
                  onChange={(e) => setNewKeyRpd(parseInt(e.target.value) || 10000)}
                  className="border-[var(--border)] bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              className="border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            >
              Cancel
            </Button>
            <Button
              onClick={createApiKey}
              disabled={!newKeyName.trim() || creating}
              className="bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary)]/80"
            >
              {creating ? 'Creating...' : 'Create Key'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Key Secret Dialog */}
      <Dialog open={newKeyDialogOpen} onOpenChange={setNewKeyDialogOpen}>
        <DialogContent className="border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-[var(--warning)]" />
              Save Your API Key
            </DialogTitle>
            <DialogDescription className="text-[var(--text-secondary)]">
              This is the only time you will see this key. Copy and store it securely.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="relative">
              <pre className="overflow-x-auto rounded-lg bg-[var(--bg-tertiary)] p-4 font-mono text-sm break-all whitespace-pre-wrap text-[var(--text-primary)]">
                {newKeySecret}
              </pre>
              <Button
                size="sm"
                className="absolute top-2 right-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/80"
                onClick={() => copyToClipboard(newKeySecret)}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>

            <div className="mt-4 rounded-lg border border-[var(--warning)]/30 bg-[var(--warning)]/10 p-3">
              <p className="text-sm text-[var(--warning)]">
                <strong>Important:</strong> Store this key securely. You won&apos;t be able to see
                it again. If you lose it, you&apos;ll need to create a new one.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                setNewKeyDialogOpen(false);
                setNewKeySecret('');
              }}
              className="bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary)]/80"
            >
              I&apos;ve Saved My Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
