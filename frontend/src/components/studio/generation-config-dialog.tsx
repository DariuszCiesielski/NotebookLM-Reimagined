'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';

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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';

export type GenerationType =
  | 'flashcards'
  | 'quiz'
  | 'study-guide'
  | 'faq'
  | 'mind-map'
  | 'data_table'
  | 'report'
  | 'slide_deck'
  | 'infographic';

export interface GenerationConfig {
  type: GenerationType;
  count?: number;
  difficulty?: 'basic' | 'intermediate' | 'advanced';
  focusArea?: string;
  customInstructions?: string;
  questionTypes?: string[];
  reportType?: 'briefing_doc' | 'summary' | 'blog_post' | 'analysis';
  tone?: 'formal' | 'casual' | 'academic';
  slideCount?: number;
  style?: string;
  sourceIds?: string[];
  // Infographic-specific
  imageCount?: number;
  imageStyle?: string;
}

interface Source {
  id: string;
  name: string;
}

interface GenerationConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: GenerationType;
  sources?: Source[];
  onGenerate: (config: GenerationConfig) => void;
  isGenerating?: boolean;
}

const typeLabels: Record<GenerationType, string> = {
  flashcards: 'Flashcards',
  quiz: 'Quiz',
  'study-guide': 'Study Guide',
  faq: 'FAQ',
  'mind-map': 'Mind Map',
  data_table: 'Data Table',
  report: 'Report',
  slide_deck: 'Slide Deck',
  infographic: 'Infographic',
};

const typeDescriptions: Record<GenerationType, string> = {
  flashcards: 'Generate flashcards for memorization and review',
  quiz: 'Create quiz questions to test understanding',
  'study-guide': 'Build a comprehensive study guide',
  faq: 'Generate frequently asked questions with answers',
  'mind-map': 'Create a visual mind map of concepts',
  data_table: 'Extract and organize data into tables',
  report: 'Generate a formatted document report',
  slide_deck: 'Create presentation slides',
  infographic: 'Design a visual infographic layout',
};

export function GenerationConfigDialog({
  open,
  onOpenChange,
  type,
  sources = [],
  onGenerate,
  isGenerating = false,
}: GenerationConfigDialogProps) {
  const [config, setConfig] = useState<GenerationConfig>({
    type,
    count: type === 'flashcards' ? 10 : type === 'quiz' ? 5 : type === 'faq' ? 8 : undefined,
    difficulty: 'intermediate',
    focusArea: '',
    customInstructions: '',
    questionTypes: ['multiple_choice'],
    reportType: 'briefing_doc',
    tone: 'formal',
    slideCount: 8,
    style: 'modern',
    sourceIds: [],
    imageCount: 4,
    imageStyle: 'infographic',
  });

  const [selectedSources, setSelectedSources] = useState<string[]>([]);

  const handleGenerate = () => {
    onGenerate({
      ...config,
      type,
      sourceIds: selectedSources.length > 0 ? selectedSources : undefined,
    });
  };

  const toggleSource = (sourceId: string) => {
    setSelectedSources((prev) =>
      prev.includes(sourceId) ? prev.filter((id) => id !== sourceId) : [...prev, sourceId]
    );
  };

  const renderStudyOptions = () => (
    <>
      {/* Count slider for applicable types */}
      {(type === 'flashcards' || type === 'quiz' || type === 'faq') && (
        <div className="space-y-3">
          <div className="flex justify-between">
            <Label>Number of items</Label>
            <span className="text-muted-foreground text-sm">{config.count}</span>
          </div>
          <Slider
            value={[config.count || 5]}
            onValueChange={([value]) => setConfig((prev) => ({ ...prev, count: value }))}
            min={3}
            max={type === 'flashcards' ? 25 : type === 'faq' ? 15 : 10}
            step={1}
            className="w-full"
          />
        </div>
      )}

      {/* Difficulty */}
      <div className="space-y-3">
        <Label>Difficulty Level</Label>
        <RadioGroup
          value={config.difficulty}
          onValueChange={(value) =>
            setConfig((prev) => ({ ...prev, difficulty: value as GenerationConfig['difficulty'] }))
          }
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="basic" id="basic" />
            <Label htmlFor="basic" className="cursor-pointer font-normal">
              Basic
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="intermediate" id="intermediate" />
            <Label htmlFor="intermediate" className="cursor-pointer font-normal">
              Intermediate
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="advanced" id="advanced" />
            <Label htmlFor="advanced" className="cursor-pointer font-normal">
              Advanced
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Question types for quiz */}
      {type === 'quiz' && (
        <div className="space-y-3">
          <Label>Question Types</Label>
          <div className="flex flex-wrap gap-4">
            {[
              { id: 'multiple_choice', label: 'Multiple Choice' },
              { id: 'true_false', label: 'True/False' },
              { id: 'short_answer', label: 'Short Answer' },
            ].map((qType) => (
              <div key={qType.id} className="flex items-center space-x-2">
                <Checkbox
                  id={qType.id}
                  checked={config.questionTypes?.includes(qType.id)}
                  onCheckedChange={(checked) => {
                    setConfig((prev) => ({
                      ...prev,
                      questionTypes: checked
                        ? [...(prev.questionTypes || []), qType.id]
                        : prev.questionTypes?.filter((t) => t !== qType.id),
                    }));
                  }}
                />
                <Label htmlFor={qType.id} className="cursor-pointer font-normal">
                  {qType.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );

  const renderCreativeOptions = () => (
    <>
      {/* Report type */}
      {type === 'report' && (
        <div className="space-y-3">
          <Label>Report Type</Label>
          <Select
            value={config.reportType}
            onValueChange={(value) =>
              setConfig((prev) => ({
                ...prev,
                reportType: value as GenerationConfig['reportType'],
              }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="briefing_doc">Briefing Document</SelectItem>
              <SelectItem value="summary">Executive Summary</SelectItem>
              <SelectItem value="blog_post">Blog Post</SelectItem>
              <SelectItem value="analysis">Deep Analysis</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Slide count */}
      {type === 'slide_deck' && (
        <div className="space-y-3">
          <div className="flex justify-between">
            <Label>Number of slides</Label>
            <span className="text-muted-foreground text-sm">{config.slideCount}</span>
          </div>
          <Slider
            value={[config.slideCount || 8]}
            onValueChange={([value]) => setConfig((prev) => ({ ...prev, slideCount: value }))}
            min={4}
            max={20}
            step={1}
            className="w-full"
          />
        </div>
      )}

      {/* Tone */}
      {(type === 'report' || type === 'slide_deck') && (
        <div className="space-y-3">
          <Label>Tone</Label>
          <RadioGroup
            value={config.tone}
            onValueChange={(value) =>
              setConfig((prev) => ({ ...prev, tone: value as GenerationConfig['tone'] }))
            }
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="formal" id="formal" />
              <Label htmlFor="formal" className="cursor-pointer font-normal">
                Formal
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="casual" id="casual" />
              <Label htmlFor="casual" className="cursor-pointer font-normal">
                Casual
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="academic" id="academic" />
              <Label htmlFor="academic" className="cursor-pointer font-normal">
                Academic
              </Label>
            </div>
          </RadioGroup>
        </div>
      )}

      {/* Infographic settings */}
      {type === 'infographic' && (
        <>
          {/* Image count slider */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label>Number of images</Label>
              <span className="text-muted-foreground text-sm">{config.imageCount}</span>
            </div>
            <Slider
              value={[config.imageCount || 4]}
              onValueChange={([value]) => setConfig((prev) => ({ ...prev, imageCount: value }))}
              min={1}
              max={8}
              step={1}
              className="w-full"
            />
            <p className="text-muted-foreground text-xs">
              Each image visualizes a key concept from your sources
            </p>
          </div>

          {/* Image style */}
          <div className="space-y-3">
            <Label>Image Style</Label>
            <Select
              value={config.imageStyle}
              onValueChange={(value) => setConfig((prev) => ({ ...prev, imageStyle: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="infographic">Infographic (charts & icons)</SelectItem>
                <SelectItem value="illustration">Digital Illustration</SelectItem>
                <SelectItem value="diagram">Technical Diagram</SelectItem>
                <SelectItem value="flat">Flat Design</SelectItem>
                <SelectItem value="3d">3D Render</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Visual Style (layout) */}
          <div className="space-y-3">
            <Label>Color Theme</Label>
            <Select
              value={config.style}
              onValueChange={(value) => setConfig((prev) => ({ ...prev, style: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="modern">Modern & Clean</SelectItem>
                <SelectItem value="colorful">Colorful & Bold</SelectItem>
                <SelectItem value="minimal">Minimal & Simple</SelectItem>
                <SelectItem value="professional">Professional & Corporate</SelectItem>
                <SelectItem value="dark">Dark Mode</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}
    </>
  );

  const isStudyType = ['flashcards', 'quiz', 'study-guide', 'faq', 'mind-map'].includes(type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Generate {typeLabels[type]}</DialogTitle>
          <DialogDescription>{typeDescriptions[type]}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Type-specific options */}
          {isStudyType ? renderStudyOptions() : renderCreativeOptions()}

          {/* Focus area - for all types */}
          <div className="space-y-3">
            <Label htmlFor="focus">
              Focus Area <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="focus"
              placeholder="e.g. 'Focus on key definitions' or 'Emphasize practical examples'"
              value={config.focusArea}
              onChange={(e) => setConfig((prev) => ({ ...prev, focusArea: e.target.value }))}
              className="h-20 resize-none"
            />
          </div>

          {/* Custom instructions - for all types */}
          <div className="space-y-3">
            <Label htmlFor="instructions">
              Custom Instructions <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="instructions"
              placeholder="Any specific requirements or preferences..."
              value={config.customInstructions}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, customInstructions: e.target.value }))
              }
              className="h-20 resize-none"
            />
          </div>

          {/* Source selection */}
          {sources.length > 0 && (
            <div className="space-y-3">
              <Label>Sources</Label>
              <p className="text-muted-foreground text-sm">
                {selectedSources.length === 0
                  ? 'Using all sources. Select specific sources to focus on:'
                  : `Using ${selectedSources.length} of ${sources.length} sources`}
              </p>
              <div className="max-h-32 space-y-2 overflow-y-auto rounded-md border p-3">
                {sources.map((source) => (
                  <div key={source.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={source.id}
                      checked={selectedSources.includes(source.id)}
                      onCheckedChange={() => toggleSource(source.id)}
                    />
                    <Label
                      htmlFor={source.id}
                      className="cursor-pointer truncate text-sm font-normal"
                    >
                      {source.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
