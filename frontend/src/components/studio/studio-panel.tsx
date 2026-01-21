'use client';

import {
  Microphone,
  VideoCamera,
  MagnifyingGlass,
  GraduationCap,
  CaretDown,
  CaretRight,
  Play,
  SpinnerGap,
  BookOpen,
  ListChecks,
  FileText,
  Question,
  Note,
  Plus,
  ShareNetwork,
  ArrowsClockwise,
  Clock,
  WarningCircle,
  Table,
  ChartBar,
  PresentationChart,
  Image,
  Palette,
  Cards,
  TreeStructure,
  ChatCircleText,
  Sparkle,
  Export,
  FilePdf,
  FileZip,
  FileJs,
  CheckSquare,
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import {
  GenerationConfigDialog,
  GenerationType,
  GenerationConfig,
} from './generation-config-dialog';

// Metadata for a generated study material
export interface StudyMaterialMeta {
  id: string;
  type: string;
  sourceIds: string[];
  sourceNames: string[];
  createdAt: string;
  itemCount?: number;
}

// Helper to format relative time
function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// Source type for selection
export interface SourceInfo {
  id: string;
  name: string;
}

interface StudioPanelProps {
  notebookId: string;
  selectedSourcesCount: number;
  selectedSourceIds: string[];
  sources?: SourceInfo[];
  // Audio
  audioFormat: string;
  onAudioFormatChange: (format: string) => void;
  audioInstructions: string;
  onAudioInstructionsChange: (instructions: string) => void;
  onGenerateAudio: () => void;
  generatingAudio: boolean;
  // Video
  videoStyle: string;
  onVideoStyleChange: (style: string) => void;
  onGenerateVideo: () => void;
  generatingVideo: boolean;
  // Research
  researchQuery: string;
  onResearchQueryChange: (query: string) => void;
  researchMode: string;
  onResearchModeChange: (mode: string) => void;
  onRunResearch: () => void;
  researching: boolean;
  // Study - now accepts config
  onGenerateStudyMaterial: (config: GenerationConfig) => void;
  generatingFlashcards: boolean;
  generatingQuiz: boolean;
  generatingStudyGuide: boolean;
  generatingFaq: boolean;
  generatingMindMap: boolean;
  // Creative Outputs - now accepts config
  onGenerateCreativeOutput?: (config: GenerationConfig) => void;
  generatingDataTable?: boolean;
  generatingReport?: boolean;
  generatingSlideDeck?: boolean;
  generatingInfographic?: boolean;
  // Creative outputs results
  creativeOutputs?: Array<{
    id: string;
    type: string;
    title: string;
    status: string;
    createdAt: string;
  }>;
  onOpenCreativeOutput?: (type: string) => void;
  // Results - now with metadata
  studyMaterials?: StudyMaterialMeta[];
  onOpenStudyMaterial?: (type: string) => void;
  // Notes
  notesCount?: number;
  onAddNote?: () => void;
  onOpenNotes?: () => void;
  // Generated content
  hasGeneratedAudio?: boolean;
  hasGeneratedVideo?: boolean;
  hasGeneratedResearch?: boolean;
  onOpenAudio?: () => void;
  onOpenVideo?: () => void;
  onOpenResearch?: () => void;
  // Export
  onExportNotebook?: (format: 'zip' | 'pdf' | 'json', options: ExportOptionsState) => void;
  exportingNotebook?: boolean;
}

// Export options state type
export interface ExportOptionsState {
  includeSources: boolean;
  includeChats: boolean;
  includeNotes: boolean;
  includeGenerated: boolean;
}

export function StudioPanel({
  notebookId,
  selectedSourcesCount,
  selectedSourceIds,
  sources = [],
  audioFormat,
  onAudioFormatChange,
  audioInstructions,
  onAudioInstructionsChange,
  onGenerateAudio,
  generatingAudio,
  videoStyle,
  onVideoStyleChange,
  onGenerateVideo,
  generatingVideo,
  researchQuery,
  onResearchQueryChange,
  researchMode,
  onResearchModeChange,
  onRunResearch,
  researching,
  onGenerateStudyMaterial,
  generatingFlashcards,
  generatingQuiz,
  generatingStudyGuide,
  generatingFaq,
  generatingMindMap,
  onGenerateCreativeOutput,
  generatingDataTable = false,
  generatingReport = false,
  generatingSlideDeck = false,
  generatingInfographic = false,
  creativeOutputs = [],
  onOpenCreativeOutput,
  studyMaterials = [],
  onOpenStudyMaterial,
  notesCount = 0,
  onAddNote,
  onOpenNotes,
  hasGeneratedAudio = false,
  hasGeneratedVideo = false,
  hasGeneratedResearch = false,
  onOpenAudio,
  onOpenVideo,
  onOpenResearch,
  onExportNotebook,
  exportingNotebook = false,
}: StudioPanelProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('audio');
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [configDialogType, setConfigDialogType] = useState<GenerationType>('flashcards');
  const [exportOptions, setExportOptions] = useState<ExportOptionsState>({
    includeSources: true,
    includeChats: true,
    includeNotes: true,
    includeGenerated: true,
  });
  const t = useTranslations('studio');

  // Open config dialog for a specific type
  const openConfigDialog = (type: GenerationType) => {
    setConfigDialogType(type);
    setConfigDialogOpen(true);
  };

  // Handle generation from config dialog
  const handleGenerate = (config: GenerationConfig) => {
    setConfigDialogOpen(false);

    // Route to appropriate handler based on type
    const studyTypes = ['flashcards', 'quiz', 'study-guide', 'faq', 'mind-map'];
    if (studyTypes.includes(config.type)) {
      onGenerateStudyMaterial(config);
    } else {
      onGenerateCreativeOutput?.(config);
    }
  };

  // Check if currently generating for a type
  const isGenerating = (type: GenerationType): boolean => {
    switch (type) {
      case 'flashcards':
        return generatingFlashcards;
      case 'quiz':
        return generatingQuiz;
      case 'study-guide':
        return generatingStudyGuide;
      case 'faq':
        return generatingFaq;
      case 'mind-map':
        return generatingMindMap;
      case 'data_table':
        return generatingDataTable;
      case 'report':
        return generatingReport;
      case 'slide_deck':
        return generatingSlideDeck;
      case 'infographic':
        return generatingInfographic;
      default:
        return false;
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // Check if a material's sources match current selection
  const isMaterialStale = (material: StudyMaterialMeta) => {
    const sortedMaterialIds = [...material.sourceIds].sort();
    const sortedSelectedIds = [...selectedSourceIds].sort();
    if (sortedMaterialIds.length !== sortedSelectedIds.length) return true;
    return !sortedMaterialIds.every((id, idx) => id === sortedSelectedIds[idx]);
  };

  // Format relative time
  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Get material by type
  const getMaterial = (type: string) => studyMaterials.find((m) => m.type === type);

  return (
    <ScrollArea className="h-full">
      <div className="space-y-3 p-4">
        {/* Audio Overview Section */}
        <StudioSection
          id="audio"
          title={t('audioOverview')}
          subtitle={t('audioDescription')}
          icon={<Microphone className="h-5 w-5" weight="duotone" />}
          iconGradient="from-orange-500/20 to-red-500/20"
          iconColor="text-orange-500"
          expanded={expandedSection === 'audio'}
          onToggle={() => toggleSection('audio')}
        >
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-primary)]">{t('format')}</label>
              <Select value={audioFormat} onValueChange={onAudioFormatChange}>
                <SelectTrigger className="h-9 rounded-lg border-[rgba(255,255,255,0.1)] bg-[var(--bg-tertiary)] text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-[rgba(255,255,255,0.1)] bg-[var(--bg-secondary)]">
                  <SelectItem value="deep_dive">{t('formats.deepDive')}</SelectItem>
                  <SelectItem value="brief">{t('formats.brief')}</SelectItem>
                  <SelectItem value="critique">{t('formats.critique')}</SelectItem>
                  <SelectItem value="debate">{t('formats.debate')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-primary)]">
                {t('customInstructions')}
              </label>
              <Textarea
                placeholder={t('instructionsPlaceholder')}
                value={audioInstructions}
                onChange={(e) => onAudioInstructionsChange(e.target.value)}
                rows={2}
                className="resize-none rounded-lg border-[rgba(255,255,255,0.1)] bg-[var(--bg-tertiary)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)]"
              />
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1 rounded-lg bg-orange-500 text-white hover:bg-orange-500/90"
                onClick={onGenerateAudio}
                disabled={generatingAudio || selectedSourcesCount === 0}
              >
                {generatingAudio ? (
                  <SpinnerGap className="mr-2 h-4 w-4 animate-spin" weight="bold" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                {t('generate')}
              </Button>
              {hasGeneratedAudio && onOpenAudio && (
                <Button
                  variant="outline"
                  className="rounded-lg border-orange-500/30 text-orange-500 hover:bg-orange-500/10"
                  onClick={onOpenAudio}
                >
                  {t('view')}
                  <CaretRight className="ml-1 h-4 w-4" weight="bold" />
                </Button>
              )}
            </div>
            {selectedSourcesCount === 0 && (
              <p className="text-center text-xs text-[var(--text-tertiary)]">
                {t('selectSourcesToGenerate')}
              </p>
            )}
          </div>
        </StudioSection>

        {/* Video Overview Section */}
        <StudioSection
          id="video"
          title={t('videoOverview')}
          subtitle={t('videoDescription')}
          icon={<VideoCamera className="h-5 w-5" weight="duotone" />}
          iconGradient="from-purple-500/20 to-pink-500/20"
          iconColor="text-purple-500"
          expanded={expandedSection === 'video'}
          onToggle={() => toggleSection('video')}
        >
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-primary)]">{t('style')}</label>
              <Select value={videoStyle} onValueChange={onVideoStyleChange}>
                <SelectTrigger className="h-9 rounded-lg border-[rgba(255,255,255,0.1)] bg-[var(--bg-tertiary)] text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-[rgba(255,255,255,0.1)] bg-[var(--bg-secondary)]">
                  <SelectItem value="explainer">{t('formats.explainer')}</SelectItem>
                  <SelectItem value="documentary">{t('formats.documentary')}</SelectItem>
                  <SelectItem value="presentation">{t('formats.presentation')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-[var(--text-tertiary)]">
              {t('videoCost')}
            </p>
            <div className="flex gap-2">
              <Button
                className="flex-1 rounded-lg bg-purple-500 text-white hover:bg-purple-500/90"
                onClick={onGenerateVideo}
                disabled={generatingVideo || selectedSourcesCount === 0}
              >
                {generatingVideo ? (
                  <SpinnerGap className="mr-2 h-4 w-4 animate-spin" weight="bold" />
                ) : (
                  <VideoCamera className="mr-2 h-4 w-4" weight="duotone" />
                )}
                {generatingVideo ? t('generating') : t('generateVideo')}
              </Button>
              {hasGeneratedVideo && onOpenVideo && (
                <Button
                  variant="outline"
                  className="rounded-lg border-purple-500/30 text-purple-500 hover:bg-purple-500/10"
                  onClick={onOpenVideo}
                >
                  {t('view')}
                  <CaretRight className="ml-1 h-4 w-4" weight="bold" />
                </Button>
              )}
            </div>
            {selectedSourcesCount === 0 && (
              <p className="text-center text-xs text-[var(--text-tertiary)]">
                {t('selectSourcesToGenerate')}
              </p>
            )}
          </div>
        </StudioSection>

        {/* Deep Research Section */}
        <StudioSection
          id="research"
          title={t('research')}
          subtitle={t('researchDescription')}
          icon={<MagnifyingGlass className="h-5 w-5" weight="duotone" />}
          iconGradient="from-blue-500/20 to-cyan-500/20"
          iconColor="text-blue-500"
          expanded={expandedSection === 'research'}
          onToggle={() => toggleSection('research')}
        >
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-primary)]">
                {t('researchQuery')}
              </label>
              <Input
                placeholder={t('researchPlaceholder')}
                value={researchQuery}
                onChange={(e) => onResearchQueryChange(e.target.value)}
                className="h-9 rounded-lg border-[rgba(255,255,255,0.1)] bg-[var(--bg-tertiary)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-primary)]">{t('mode')}</label>
              <Select value={researchMode} onValueChange={onResearchModeChange}>
                <SelectTrigger className="h-9 rounded-lg border-[rgba(255,255,255,0.1)] bg-[var(--bg-tertiary)] text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-[rgba(255,255,255,0.1)] bg-[var(--bg-secondary)]">
                  <SelectItem value="fast">{t('formats.fastMode')}</SelectItem>
                  <SelectItem value="deep">{t('formats.deepMode')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1 rounded-lg bg-blue-500 text-white hover:bg-blue-500/90"
                onClick={onRunResearch}
                disabled={researching || !researchQuery.trim()}
              >
                {researching ? (
                  <SpinnerGap className="mr-2 h-4 w-4 animate-spin" weight="bold" />
                ) : (
                  <MagnifyingGlass className="mr-2 h-4 w-4" weight="duotone" />
                )}
                {t('research')}
              </Button>
              {hasGeneratedResearch && onOpenResearch && (
                <Button
                  variant="outline"
                  className="rounded-lg border-blue-500/30 text-blue-500 hover:bg-blue-500/10"
                  onClick={onOpenResearch}
                >
                  {t('view')}
                  <CaretRight className="ml-1 h-4 w-4" weight="bold" />
                </Button>
              )}
            </div>
          </div>
        </StudioSection>

        {/* Study Materials Section */}
        <StudioSection
          id="study"
          title={t('studyMaterials')}
          subtitle={t('studyMaterialsDescription')}
          icon={<GraduationCap className="h-5 w-5" />}
          iconGradient="from-emerald-500/20 to-teal-500/20"
          iconColor="text-emerald-500"
          expanded={expandedSection === 'study'}
          onToggle={() => toggleSection('study')}
        >
          <div className="space-y-4">
            {/* Study Tools Grid */}
            <div className="grid grid-cols-2 gap-2">
              <StudyToolButton
                icon={<BookOpen className="h-5 w-5" />}
                label="Flashcards"
                color="text-blue-500"
                onClick={() => openConfigDialog('flashcards')}
                loading={generatingFlashcards}
                disabled={selectedSourcesCount === 0}
              />
              <StudyToolButton
                icon={<ListChecks className="h-5 w-5" />}
                label="Quiz"
                color="text-purple-500"
                onClick={() => openConfigDialog('quiz')}
                loading={generatingQuiz}
                disabled={selectedSourcesCount === 0}
              />
              <StudyToolButton
                icon={<FileText className="h-5 w-5" />}
                label="Study Guide"
                color="text-orange-500"
                onClick={() => openConfigDialog('study-guide')}
                loading={generatingStudyGuide}
                disabled={selectedSourcesCount === 0}
              />
              <StudyToolButton
                icon={<Question className="h-5 w-5" weight="duotone" />}
                label="FAQ"
                color="text-teal-500"
                onClick={() => openConfigDialog('faq')}
                loading={generatingFaq}
                disabled={selectedSourcesCount === 0}
              />
              <StudyToolButton
                icon={<TreeStructure className="h-5 w-5" weight="duotone" />}
                label="Mind Map"
                color="text-cyan-500"
                onClick={() => openConfigDialog('mind-map')}
                loading={generatingMindMap}
                disabled={selectedSourcesCount === 0}
              />
            </div>

            {selectedSourcesCount === 0 && (
              <p className="text-center text-xs text-[var(--text-tertiary)]">
                Select sources to generate study materials
              </p>
            )}

            {/* Generated Materials */}
            {studyMaterials.length > 0 && (
              <div className="border-t border-[rgba(255,255,255,0.1)] pt-3">
                <p className="mb-2 text-xs font-medium text-[var(--text-tertiary)]">
                  Generated Materials
                </p>
                <div className="space-y-2">
                  {studyMaterials.map((material) => {
                    const isStale = isMaterialStale(material);
                    const iconMap: Record<
                      string,
                      { icon: React.ReactNode; color: string; label: string }
                    > = {
                      flashcards: {
                        icon: <BookOpen className="h-4 w-4" />,
                        color: 'text-blue-500',
                        label: `${material.itemCount || 0} Flashcards`,
                      },
                      quiz: {
                        icon: <ListChecks className="h-4 w-4" />,
                        color: 'text-purple-500',
                        label: `${material.itemCount || 0} Quiz Questions`,
                      },
                      study_guide: {
                        icon: <FileText className="h-4 w-4" />,
                        color: 'text-orange-500',
                        label: 'Study Guide',
                      },
                      faq: {
                        icon: <ChatCircleText className="h-4 w-4" weight="duotone" />,
                        color: 'text-teal-500',
                        label: `${material.itemCount || 0} FAQ Items`,
                      },
                      mind_map: {
                        icon: <TreeStructure className="h-4 w-4" weight="duotone" />,
                        color: 'text-cyan-500',
                        label: 'Mind Map',
                      },
                    };
                    const info = iconMap[material.type] || {
                      icon: <FileText className="h-4 w-4" />,
                      color: 'text-gray-500',
                      label: material.type,
                    };

                    return (
                      <div
                        key={material.id}
                        className={`rounded-lg border ${isStale ? 'border-amber-500/30 bg-amber-500/5' : 'border-[rgba(255,255,255,0.1)]'} overflow-hidden`}
                      >
                        <button
                          onClick={() => onOpenStudyMaterial?.(material.type)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-[var(--bg-tertiary)]"
                        >
                          <span className={info.color}>{info.icon}</span>
                          <span className="flex-1 text-left text-[var(--text-primary)]">
                            {info.label}
                          </span>
                          {isStale && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <WarningCircle
                                  className="h-3.5 w-3.5 text-amber-500"
                                  weight="fill"
                                />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Sources changed - regenerate for updated content</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          <CaretRight
                            className="h-4 w-4 text-[var(--text-tertiary)]"
                            weight="bold"
                          />
                        </button>
                        <div className="flex items-center gap-3 border-t border-[rgba(255,255,255,0.05)] bg-[var(--bg-tertiary)]/50 px-3 py-1.5 text-[10px] text-[var(--text-tertiary)]">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTimeAgo(material.createdAt)}
                          </span>
                          <span>•</span>
                          <span className="truncate">
                            {material.sourceNames.length === 1
                              ? material.sourceNames[0]
                              : `${material.sourceNames.length} sources`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </StudioSection>

        {/* Creative Outputs Section */}
        <StudioSection
          id="creative"
          title={t('creativeOutputs')}
          subtitle={t('creativeOutputsDescription')}
          icon={<Palette className="h-5 w-5" />}
          iconGradient="from-pink-500/20 to-rose-500/20"
          iconColor="text-pink-500"
          expanded={expandedSection === 'creative'}
          onToggle={() => toggleSection('creative')}
        >
          <div className="space-y-4">
            {/* Creative Tools Grid */}
            <div className="grid grid-cols-2 gap-2">
              <StudyToolButton
                icon={<Table className="h-5 w-5" />}
                label="Data Table"
                color="text-emerald-500"
                onClick={() => openConfigDialog('data_table')}
                loading={generatingDataTable}
                disabled={selectedSourcesCount === 0}
              />
              <StudyToolButton
                icon={<Palette className="h-5 w-5" weight="duotone" />}
                label="Report"
                color="text-blue-500"
                onClick={() => openConfigDialog('report')}
                loading={generatingReport}
                disabled={selectedSourcesCount === 0}
              />
              <StudyToolButton
                icon={<PresentationChart className="h-5 w-5" />}
                label="Slide Deck"
                color="text-violet-500"
                onClick={() => openConfigDialog('slide_deck')}
                loading={generatingSlideDeck}
                disabled={selectedSourcesCount === 0}
              />
              <StudyToolButton
                icon={<Image className="h-5 w-5" />}
                label="Infographic"
                color="text-rose-500"
                onClick={() => openConfigDialog('infographic')}
                loading={generatingInfographic}
                disabled={selectedSourcesCount === 0}
              />
            </div>

            {selectedSourcesCount === 0 && (
              <p className="text-center text-xs text-[var(--text-tertiary)]">
                Select sources to generate creative outputs
              </p>
            )}

            {/* Generated Outputs */}
            {creativeOutputs.length > 0 && (
              <div className="mt-4 border-t border-[rgba(255,255,255,0.1)] pt-4">
                <p className="mb-3 text-xs font-medium text-[var(--text-tertiary)]">
                  Generated Outputs
                </p>
                <div className="space-y-2">
                  {creativeOutputs.map((output) => {
                    const typeConfig: Record<
                      string,
                      { icon: React.ReactNode; label: string; color: string }
                    > = {
                      data_table: {
                        icon: <Table className="h-4 w-4" />,
                        label: 'Data Table',
                        color: 'text-emerald-500',
                      },
                      report: {
                        icon: <ChartBar className="h-4 w-4" weight="duotone" />,
                        label: 'Report',
                        color: 'text-blue-500',
                      },
                      slide_deck: {
                        icon: <PresentationChart className="h-4 w-4" />,
                        label: 'Slide Deck',
                        color: 'text-violet-500',
                      },
                      infographic: {
                        icon: <Image className="h-4 w-4" />,
                        label: 'Infographic',
                        color: 'text-rose-500',
                      },
                    };
                    const config = typeConfig[output.type] || {
                      icon: <FileText className="h-4 w-4" />,
                      label: output.type,
                      color: 'text-gray-500',
                    };
                    const timeAgo = getTimeAgo(output.createdAt);

                    return (
                      <button
                        key={output.id}
                        onClick={() => onOpenCreativeOutput?.(output.type)}
                        className="flex w-full items-center gap-3 rounded-xl bg-[var(--bg-tertiary)] p-3 text-left transition-colors hover:bg-[var(--bg-tertiary)]/80"
                      >
                        <div className={`${config.color}`}>{config.icon}</div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                            {config.label}
                          </p>
                          <p className="text-xs text-[var(--text-tertiary)]">{timeAgo}</p>
                        </div>
                        <CaretRight className="h-4 w-4 text-[var(--text-tertiary)]" weight="bold" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </StudioSection>

        {/* Notes Section */}
        <StudioSection
          id="notes"
          title={t('notes')}
          subtitle={`${notesCount} ${t('saved')}`}
          icon={<Note className="h-5 w-5" weight="duotone" />}
          iconGradient="from-amber-500/20 to-yellow-500/20"
          iconColor="text-amber-500"
          expanded={expandedSection === 'notes'}
          onToggle={() => toggleSection('notes')}
          action={
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onAddNote?.();
              }}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          }
        >
          <div className="space-y-3">
            {notesCount === 0 ? (
              <div className="py-6 text-center">
                <Note
                  className="mx-auto mb-2 h-8 w-8 text-[var(--text-tertiary)]/50"
                  weight="duotone"
                />
                <p className="text-sm text-[var(--text-tertiary)]">No notes yet</p>
                <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                  Create notes or save chat responses
                </p>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full justify-start rounded-lg border-[rgba(255,255,255,0.1)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
                onClick={onOpenNotes}
              >
                <Note className="mr-2 h-4 w-4 text-amber-500" weight="duotone" />
                View All Notes ({notesCount})
                <CaretRight className="ml-auto h-4 w-4 text-[var(--text-tertiary)]" weight="bold" />
              </Button>
            )}
          </div>
        </StudioSection>

        {/* Export Section */}
        <StudioSection
          id="export"
          title={t('exportNotebook')}
          subtitle={t('downloadAllContent')}
          icon={<Export className="h-5 w-5" weight="duotone" />}
          iconGradient="from-sky-500/20 to-indigo-500/20"
          iconColor="text-sky-500"
          expanded={expandedSection === 'export'}
          onToggle={() => toggleSection('export')}
        >
          <div className="space-y-4">
            {/* Export Options */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-[var(--text-tertiary)]">Include in export:</p>
              <div className="grid grid-cols-2 gap-2">
                <ExportOptionToggle
                  label="Sources"
                  checked={exportOptions.includeSources}
                  onChange={(checked) =>
                    setExportOptions((prev) => ({ ...prev, includeSources: checked }))
                  }
                />
                <ExportOptionToggle
                  label="Chats"
                  checked={exportOptions.includeChats}
                  onChange={(checked) =>
                    setExportOptions((prev) => ({ ...prev, includeChats: checked }))
                  }
                />
                <ExportOptionToggle
                  label="Notes"
                  checked={exportOptions.includeNotes}
                  onChange={(checked) =>
                    setExportOptions((prev) => ({ ...prev, includeNotes: checked }))
                  }
                />
                <ExportOptionToggle
                  label="Generated"
                  checked={exportOptions.includeGenerated}
                  onChange={(checked) =>
                    setExportOptions((prev) => ({ ...prev, includeGenerated: checked }))
                  }
                />
              </div>
            </div>

            {/* Export Format Buttons */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-[var(--text-tertiary)]">Export as:</p>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  className="flex h-auto flex-col items-center gap-1.5 rounded-xl border-[rgba(255,255,255,0.1)] py-3 hover:border-sky-500/50 hover:bg-[var(--bg-tertiary)]"
                  onClick={() => onExportNotebook?.('zip', exportOptions)}
                  disabled={exportingNotebook}
                >
                  {exportingNotebook ? (
                    <SpinnerGap
                      className="h-5 w-5 animate-spin text-[var(--text-tertiary)]"
                      weight="bold"
                    />
                  ) : (
                    <FileZip className="h-5 w-5 text-sky-500" weight="duotone" />
                  )}
                  <span className="text-xs font-medium text-[var(--text-primary)]">ZIP</span>
                </Button>
                <Button
                  variant="outline"
                  className="flex h-auto flex-col items-center gap-1.5 rounded-xl border-[rgba(255,255,255,0.1)] py-3 hover:border-red-500/50 hover:bg-[var(--bg-tertiary)]"
                  onClick={() => onExportNotebook?.('pdf', exportOptions)}
                  disabled={exportingNotebook}
                >
                  {exportingNotebook ? (
                    <SpinnerGap
                      className="h-5 w-5 animate-spin text-[var(--text-tertiary)]"
                      weight="bold"
                    />
                  ) : (
                    <FilePdf className="h-5 w-5 text-red-500" weight="duotone" />
                  )}
                  <span className="text-xs font-medium text-[var(--text-primary)]">PDF</span>
                </Button>
                <Button
                  variant="outline"
                  className="flex h-auto flex-col items-center gap-1.5 rounded-xl border-[rgba(255,255,255,0.1)] py-3 hover:border-yellow-500/50 hover:bg-[var(--bg-tertiary)]"
                  onClick={() => onExportNotebook?.('json', exportOptions)}
                  disabled={exportingNotebook}
                >
                  {exportingNotebook ? (
                    <SpinnerGap
                      className="h-5 w-5 animate-spin text-[var(--text-tertiary)]"
                      weight="bold"
                    />
                  ) : (
                    <FileJs className="h-5 w-5 text-yellow-500" weight="duotone" />
                  )}
                  <span className="text-xs font-medium text-[var(--text-primary)]">JSON</span>
                </Button>
              </div>
            </div>

            <p className="text-center text-xs text-[var(--text-tertiary)]">
              ZIP includes all files. PDF is a summary document.
            </p>
          </div>
        </StudioSection>
      </div>

      {/* Generation Config Dialog */}
      <GenerationConfigDialog
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
        type={configDialogType}
        sources={sources}
        onGenerate={handleGenerate}
        isGenerating={isGenerating(configDialogType)}
      />
    </ScrollArea>
  );
}

// Studio Section Component
function StudioSection({
  id,
  title,
  subtitle,
  icon,
  iconGradient,
  iconColor,
  expanded,
  onToggle,
  action,
  children,
}: {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  iconGradient: string;
  iconColor: string;
  expanded: boolean;
  onToggle: () => void;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-card overflow-hidden rounded-2xl">
      <div className="group flex items-center justify-between p-4 transition-all duration-200 hover:bg-white/[0.02]">
        <button onClick={onToggle} className="flex flex-1 items-center gap-3">
          <div
            className={`relative h-10 w-10 rounded-xl bg-gradient-to-br ${iconGradient} flex items-center justify-center shadow-lg`}
          >
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/10 to-transparent" />
            <span className={`relative z-10 ${iconColor}`}>{icon}</span>
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-[var(--text-primary)] transition-colors group-hover:text-white">
              {title}
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">{subtitle}</p>
          </div>
        </button>
        <div className="flex items-center gap-2">
          {action}
          <button
            onClick={onToggle}
            className="rounded-lg p-1.5 transition-colors hover:bg-white/5"
          >
            <CaretDown
              weight="bold"
              className={`h-4 w-4 text-[var(--text-tertiary)] transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-[rgba(255,255,255,0.1)] bg-[var(--bg-tertiary)]/30 px-4 pt-2 pb-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Study Tool Button
function StudyToolButton({
  icon,
  label,
  color,
  onClick,
  loading,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  onClick: () => void;
  loading: boolean;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="flex flex-col items-center gap-2 rounded-xl border border-[rgba(255,255,255,0.1)] bg-[var(--bg-secondary)] p-4 transition-colors hover:bg-[var(--bg-tertiary)]/50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? (
        <SpinnerGap className="h-5 w-5 animate-spin text-[var(--text-tertiary)]" weight="bold" />
      ) : (
        <span className={color}>{icon}</span>
      )}
      <span className="text-xs font-medium text-[var(--text-primary)]">{label}</span>
    </button>
  );
}

// Material Button
function MaterialButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-[var(--bg-tertiary)]"
    >
      {icon}
      <span className="text-[var(--text-primary)]">{label}</span>
      <CaretRight className="ml-auto h-4 w-4 text-[var(--text-tertiary)]" weight="bold" />
    </button>
  );
}

// Export Option Toggle
function ExportOptionToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${checked
        ? 'border-sky-500/50 bg-sky-500/10 text-[var(--text-primary)]'
        : 'border-[rgba(255,255,255,0.1)] text-[var(--text-tertiary)] hover:bg-[var(--bg-tertiary)]'
        }`}
    >
      <CheckSquare
        className={`h-4 w-4 ${checked ? 'text-sky-500' : 'text-[var(--text-tertiary)]'}`}
        weight={checked ? 'fill' : 'regular'}
      />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}
