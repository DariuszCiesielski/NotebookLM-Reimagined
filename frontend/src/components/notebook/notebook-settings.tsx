'use client';

import { Shield, Lightbulb, Code, Sparkles, HelpCircle, Loader2, Check, X } from 'lucide-react';
import { useState, useEffect } from 'react';

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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

// Persona presets
const PERSONA_PRESETS = {
  critical: {
    name: 'Critical Reviewer',
    instructions:
      'Analyze information skeptically. Question assumptions and point out potential weaknesses or gaps. Be constructive but thorough in your critique.',
    icon: Shield,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
  simple: {
    name: 'Simple Explainer',
    instructions:
      'Explain concepts as if to a beginner. Use simple language, avoid jargon, and provide relatable examples. Break down complex ideas into digestible parts.',
    icon: Lightbulb,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
  },
  technical: {
    name: 'Technical Expert',
    instructions:
      'Provide detailed technical analysis. Use precise terminology, include implementation details, and reference best practices and standards.',
    icon: Code,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  creative: {
    name: 'Creative Thinker',
    instructions:
      'Think outside the box. Suggest novel approaches, make unexpected connections, and explore unconventional solutions.',
    icon: Sparkles,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  socratic: {
    name: 'Socratic Teacher',
    instructions:
      'Guide understanding through questions. Instead of giving direct answers, ask probing questions that lead to deeper understanding.',
    icon: HelpCircle,
    color: 'text-teal-500',
    bgColor: 'bg-teal-500/10',
  },
} as const;

type PresetKey = keyof typeof PERSONA_PRESETS | 'custom' | 'none';

export interface NotebookSettings {
  persona: {
    enabled: boolean;
    name: string;
    instructions: string;
    preset: PresetKey;
  };
  preferences: {
    responseLength: 'concise' | 'balanced' | 'detailed';
    tone: 'casual' | 'professional' | 'academic';
    includeExamples: boolean;
    citationStyle: 'inline' | 'footnote' | 'none';
  };
}

const DEFAULT_SETTINGS: NotebookSettings = {
  persona: {
    enabled: false,
    name: '',
    instructions: '',
    preset: 'none',
  },
  preferences: {
    responseLength: 'balanced',
    tone: 'professional',
    includeExamples: true,
    citationStyle: 'inline',
  },
};

// Helper to merge settings with defaults to ensure all properties exist
function mergeWithDefaults(settings: NotebookSettings | null): NotebookSettings {
  if (!settings) return DEFAULT_SETTINGS;
  return {
    persona: {
      ...DEFAULT_SETTINGS.persona,
      ...settings.persona,
    },
    preferences: {
      ...DEFAULT_SETTINGS.preferences,
      ...settings.preferences,
    },
  };
}

interface NotebookSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: NotebookSettings | null;
  onSave: (settings: NotebookSettings) => Promise<void>;
  notebookName: string;
}

export function NotebookSettingsDialog({
  open,
  onOpenChange,
  settings,
  onSave,
  notebookName,
}: NotebookSettingsDialogProps) {
  const [localSettings, setLocalSettings] = useState<NotebookSettings>(mergeWithDefaults(settings));
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Reset local settings when dialog opens
  useEffect(() => {
    if (open) {
      setLocalSettings(mergeWithDefaults(settings));
      setHasChanges(false);
    }
  }, [open, settings]);

  const updateSettings = (updates: Partial<NotebookSettings>) => {
    setLocalSettings((prev) => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const updatePersona = (updates: Partial<NotebookSettings['persona']>) => {
    setLocalSettings((prev) => ({
      ...prev,
      persona: { ...prev.persona, ...updates },
    }));
    setHasChanges(true);
  };

  const updatePreferences = (updates: Partial<NotebookSettings['preferences']>) => {
    setLocalSettings((prev) => ({
      ...prev,
      preferences: { ...prev.preferences, ...updates },
    }));
    setHasChanges(true);
  };

  const selectPreset = (presetKey: PresetKey) => {
    if (presetKey === 'none') {
      updatePersona({
        enabled: false,
        name: '',
        instructions: '',
        preset: 'none',
      });
    } else if (presetKey === 'custom') {
      updatePersona({
        enabled: true,
        preset: 'custom',
      });
    } else {
      const preset = PERSONA_PRESETS[presetKey];
      updatePersona({
        enabled: true,
        name: preset.name,
        instructions: preset.instructions,
        preset: presetKey,
      });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(localSettings);
      setHasChanges(false);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setLocalSettings(mergeWithDefaults(settings));
    setHasChanges(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto border-[rgba(255,255,255,0.1)] bg-[var(--bg-secondary)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[var(--text-primary)]">
            Notebook Settings
            {localSettings.persona?.enabled && (
              <Badge className="border-0 bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]">
                {localSettings.persona.name || 'Custom Persona'}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="text-[var(--text-secondary)]">
            Customize how AI responds in "{notebookName}". These settings apply to all chat, study
            materials, and creative outputs.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="persona" className="mt-4">
          <TabsList className="grid w-full grid-cols-2 bg-[var(--bg-tertiary)]">
            <TabsTrigger
              value="persona"
              className="data-[state=active]:bg-[var(--accent-primary)] data-[state=active]:text-white"
            >
              Persona
            </TabsTrigger>
            <TabsTrigger
              value="preferences"
              className="data-[state=active]:bg-[var(--accent-primary)] data-[state=active]:text-white"
            >
              Preferences
            </TabsTrigger>
          </TabsList>

          <TabsContent value="persona" className="mt-4 space-y-4">
            {/* Preset Cards */}
            <div className="space-y-2">
              <Label className="text-[var(--text-primary)]">Choose a Persona</Label>
              <p className="text-xs text-[var(--text-tertiary)]">
                Select a preset or create your own custom persona
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* No Persona Option */}
              <button
                onClick={() => selectPreset('none')}
                className={`rounded-xl border p-4 text-left transition-all ${
                  localSettings.persona.preset === 'none'
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10'
                    : 'border-[rgba(255,255,255,0.1)] bg-[var(--bg-tertiary)] hover:border-[rgba(255,255,255,0.2)]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--bg-secondary)]">
                    <X className="h-5 w-5 text-[var(--text-tertiary)]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-[var(--text-primary)]">No Persona</div>
                    <div className="truncate text-xs text-[var(--text-tertiary)]">
                      Default AI behavior
                    </div>
                  </div>
                  {localSettings.persona.preset === 'none' && (
                    <Check className="h-4 w-4 text-[var(--accent-primary)]" />
                  )}
                </div>
              </button>

              {/* Preset Options */}
              {Object.entries(PERSONA_PRESETS).map(([key, preset]) => {
                const Icon = preset.icon;
                const isSelected = localSettings.persona.preset === key;
                return (
                  <button
                    key={key}
                    onClick={() => selectPreset(key as PresetKey)}
                    className={`rounded-xl border p-4 text-left transition-all ${
                      isSelected
                        ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10'
                        : 'border-[rgba(255,255,255,0.1)] bg-[var(--bg-tertiary)] hover:border-[rgba(255,255,255,0.2)]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-10 w-10 rounded-lg ${preset.bgColor} flex items-center justify-center`}
                      >
                        <Icon className={`h-5 w-5 ${preset.color}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-[var(--text-primary)]">{preset.name}</div>
                        <div className="line-clamp-1 text-xs text-[var(--text-tertiary)]">
                          {preset.instructions.slice(0, 50)}...
                        </div>
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-[var(--accent-primary)]" />}
                    </div>
                  </button>
                );
              })}

              {/* Custom Option */}
              <button
                onClick={() => selectPreset('custom')}
                className={`rounded-xl border p-4 text-left transition-all ${
                  localSettings.persona.preset === 'custom'
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10'
                    : 'border-[rgba(255,255,255,0.1)] bg-[var(--bg-tertiary)] hover:border-[rgba(255,255,255,0.2)]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500/20 to-orange-500/20">
                    <Sparkles className="h-5 w-5 text-pink-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-[var(--text-primary)]">Custom</div>
                    <div className="truncate text-xs text-[var(--text-tertiary)]">
                      Write your own instructions
                    </div>
                  </div>
                  {localSettings.persona.preset === 'custom' && (
                    <Check className="h-4 w-4 text-[var(--accent-primary)]" />
                  )}
                </div>
              </button>
            </div>

            {/* Custom Instructions */}
            {localSettings.persona.enabled && (
              <div className="space-y-3 pt-2">
                <div className="space-y-2">
                  <Label className="text-[var(--text-primary)]">Persona Name</Label>
                  <input
                    type="text"
                    value={localSettings.persona.name}
                    onChange={(e) => {
                      updatePersona({ name: e.target.value, preset: 'custom' });
                    }}
                    placeholder="e.g., Research Assistant"
                    className="h-10 w-full rounded-lg border border-[rgba(255,255,255,0.1)] bg-[var(--bg-tertiary)] px-3 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[var(--text-primary)]">Instructions</Label>
                  <Textarea
                    value={localSettings.persona.instructions}
                    onChange={(e) => {
                      updatePersona({ instructions: e.target.value, preset: 'custom' });
                    }}
                    placeholder="Describe how the AI should behave. For example: 'Always provide step-by-step explanations. Focus on practical applications. Use analogies to explain complex concepts.'"
                    rows={4}
                    className="resize-none border-[rgba(255,255,255,0.1)] bg-[var(--bg-tertiary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)]"
                  />
                  <p className="text-xs text-[var(--text-tertiary)]">
                    These instructions will be applied to all AI interactions in this notebook.
                  </p>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="preferences" className="mt-4 space-y-6">
            {/* Response Length */}
            <div className="space-y-3">
              <Label className="text-[var(--text-primary)]">Response Length</Label>
              <Select
                value={localSettings.preferences.responseLength}
                onValueChange={(value: NotebookSettings['preferences']['responseLength']) =>
                  updatePreferences({ responseLength: value })
                }
              >
                <SelectTrigger className="border-[rgba(255,255,255,0.1)] bg-[var(--bg-tertiary)] text-[var(--text-primary)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-[rgba(255,255,255,0.1)] bg-[var(--bg-secondary)]">
                  <SelectItem value="concise" className="text-[var(--text-primary)]">
                    Concise - Brief, to-the-point answers
                  </SelectItem>
                  <SelectItem value="balanced" className="text-[var(--text-primary)]">
                    Balanced - Moderate detail (default)
                  </SelectItem>
                  <SelectItem value="detailed" className="text-[var(--text-primary)]">
                    Detailed - Comprehensive explanations
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tone */}
            <div className="space-y-3">
              <Label className="text-[var(--text-primary)]">Tone</Label>
              <Select
                value={localSettings.preferences.tone}
                onValueChange={(value: NotebookSettings['preferences']['tone']) =>
                  updatePreferences({ tone: value })
                }
              >
                <SelectTrigger className="border-[rgba(255,255,255,0.1)] bg-[var(--bg-tertiary)] text-[var(--text-primary)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-[rgba(255,255,255,0.1)] bg-[var(--bg-secondary)]">
                  <SelectItem value="casual" className="text-[var(--text-primary)]">
                    Casual - Friendly and conversational
                  </SelectItem>
                  <SelectItem value="professional" className="text-[var(--text-primary)]">
                    Professional - Clear and business-like
                  </SelectItem>
                  <SelectItem value="academic" className="text-[var(--text-primary)]">
                    Academic - Formal and scholarly
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Citation Style */}
            <div className="space-y-3">
              <Label className="text-[var(--text-primary)]">Citation Style</Label>
              <Select
                value={localSettings.preferences.citationStyle}
                onValueChange={(value: NotebookSettings['preferences']['citationStyle']) =>
                  updatePreferences({ citationStyle: value })
                }
              >
                <SelectTrigger className="border-[rgba(255,255,255,0.1)] bg-[var(--bg-tertiary)] text-[var(--text-primary)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-[rgba(255,255,255,0.1)] bg-[var(--bg-secondary)]">
                  <SelectItem value="inline" className="text-[var(--text-primary)]">
                    Inline - [1], [2] notation in text
                  </SelectItem>
                  <SelectItem value="footnote" className="text-[var(--text-primary)]">
                    Footnote - References at the end
                  </SelectItem>
                  <SelectItem value="none" className="text-[var(--text-primary)]">
                    None - No citations
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Include Examples */}
            <div className="flex items-center space-x-3 pt-2">
              <Checkbox
                id="includeExamples"
                checked={localSettings.preferences.includeExamples}
                onCheckedChange={(checked) =>
                  updatePreferences({ includeExamples: checked as boolean })
                }
                className="border-[rgba(255,255,255,0.2)] data-[state=checked]:border-[var(--accent-primary)] data-[state=checked]:bg-[var(--accent-primary)]"
              />
              <div className="space-y-1">
                <Label
                  htmlFor="includeExamples"
                  className="cursor-pointer text-[var(--text-primary)]"
                >
                  Include Examples
                </Label>
                <p className="text-xs text-[var(--text-tertiary)]">
                  Add illustrative examples when explaining concepts
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6 gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="border-[rgba(255,255,255,0.1)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary)]/90"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Export helper to convert settings to system instructions
export function buildSystemInstructions(settings: NotebookSettings | null): string {
  if (!settings) return '';

  const parts: string[] = [];

  // Add persona instructions
  if (settings.persona.enabled && settings.persona.instructions) {
    parts.push(`[NOTEBOOK PERSONA: ${settings.persona.name || 'Custom'}]`);
    parts.push(settings.persona.instructions);
  }

  // Add preferences
  const prefs = settings.preferences;
  const prefParts: string[] = [];

  if (prefs.responseLength !== 'balanced') {
    const lengthMap = {
      concise: 'Keep responses brief and to-the-point.',
      detailed: 'Provide comprehensive, detailed explanations.',
    };
    prefParts.push(lengthMap[prefs.responseLength as 'concise' | 'detailed']);
  }

  if (prefs.tone !== 'professional') {
    const toneMap = {
      casual: 'Use a friendly, conversational tone.',
      academic: 'Use formal, scholarly language.',
    };
    prefParts.push(toneMap[prefs.tone as 'casual' | 'academic']);
  }

  if (!prefs.includeExamples) {
    prefParts.push('Do not include examples unless specifically asked.');
  }

  if (prefs.citationStyle === 'none') {
    prefParts.push('Do not include source citations.');
  } else if (prefs.citationStyle === 'footnote') {
    prefParts.push('Place all citations as footnotes at the end of your response.');
  }

  if (prefParts.length > 0) {
    parts.push('');
    parts.push('[PREFERENCES]');
    parts.push(prefParts.join(' '));
  }

  if (parts.length > 0) {
    parts.push('');
    parts.push('---');
  }

  return parts.join('\n');
}
