import { type ChangeEvent, type RefObject, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CloudUpload, ChevronLeft, ChevronRight, Plus, Video, ChevronDown, Sparkles } from 'lucide-react';
import { MediaToolsPopover } from '@/components/manual-post/ai/MediaToolsPopover';
import { cn } from '@/lib/utils';
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
  type SensorDescriptor,
  type SensorOptions,
  DragOverlay,
} from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { GridSplitter } from '@/components/media/GridSplitter';
import { MediaUploadSection } from '@/components/media/MediaUploadSection';
import { DragHintTooltip } from '@/components/manual-post/DragHintTooltip';
import {
  EnhancedSortableMediaItem,
  MediaDragOverlay,
  type AspectRatioType,
} from '@/components/manual-post/EnhancedSortableMediaItem';
import { MediaSource } from '@/types/media';
import { PostFormat } from '@/types/social';
import { AltTextPanel } from '@/components/manual-post/ai/AltTextPanel';
import { AIGeneratedField } from '@/components/ai/AIGeneratedField';

import { getAltTextSupportContext } from '@/lib/altTextSupport';
import { SectionCard, SectionState } from '@/components/manual-post/ui/SectionCard';

const formatFileSize = (size: number) => {
  if (!size) return '0 KB';
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const VALID_ASPECT_RATIOS = new Set<AspectRatioType>([
  '1:1', '3:4', '4:5', '4:3', '16:9', '9:16', 'auto',
]);
const toAspectRatio = (v: string | undefined): AspectRatioType | undefined =>
  v && VALID_ASPECT_RATIOS.has(v as AspectRatioType) ? (v as AspectRatioType) : undefined;

interface MediaRequirements {
  minMedia: number;
  maxMedia: number;
}

interface Step2MediaCardProps {
  // Visibility / animation (deprecated em favor de `state` mas mantido por
  // retrocompat enquanto o ManualCreate ainda calcula `showStep2`).
  visible: boolean;

  // Media state
  mediaFiles: File[];
  mediaPreviewUrls: string[];
  mediaSources: MediaSource[];
  mediaAspectRatios: string[];
  altText?: string;
  altTexts?: Record<string, string>;
  altTextGeneratedAt?: string | null;
  altTextEdited?: boolean;
  mediaRequirements: MediaRequirements;
  selectedFormats: PostFormat[];

  // Mutators
  setMediaFiles: React.Dispatch<React.SetStateAction<File[]>>;
  setMediaPreviewUrls: React.Dispatch<React.SetStateAction<string[]>>;
  setMediaSources: React.Dispatch<React.SetStateAction<MediaSource[]>>;
  onAltTextChange?: (value: string) => void;
  onMediaAltTextChange?: (key: string, value: string) => void;
  onGenerateAltText?: (index: number) => Promise<unknown>;
  altTextLoadingKey?: string | null;
  videoToolsLoadingAction?: string | null;
  onGenerateSrt?: () => void;
  onGenerateChapters?: () => Promise<unknown>;
  onExtractQuotes?: () => Promise<unknown>;
  removeMedia: (idx: number) => void;
  moveMedia: (from: number, to: number) => void;

  // Upload pipeline
  isUploading: boolean;
  uploadProgress: number;
  handleMediaUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  getAcceptTypes: () => string;

  // DnD
  sensors: SensorDescriptor<SensorOptions>[];
  activeId: string | null;
  handleDragStart: (e: DragStartEvent) => void;
  handleDragEnd: (e: DragEndEvent) => void;
  handleDragCancel: () => void;

  // Auto-save indicator (não usado dentro de SectionCard — mostrado pelo pai)
  lastSaved: Date | null;
  isAutoSaving: boolean;
  hasUnsavedChanges: boolean;

  // Operação em curso
  saving: boolean;
  submitting: boolean;
  publishing: boolean;

  // Refs
  mediaSectionRef: RefObject<HTMLDivElement>;

  // Stepper
  onPreviousStep: () => void;
  onNextStep: () => void;

  // Progressive disclosure
  state?: SectionState;
  onActivate?: () => void;
  onEdit?: () => void;
  stepNumber?: number;
}

/**
 * Cartão Step 2 — gestão de média. Migrado para `<SectionCard>` no Prompt
 * 2/4 do progressive disclosure. Mantém toda a funcionalidade interna
 * (upload, GridSplitter, DnD, alt text, video AI tools) e adiciona summary
 * com thumbnails sobrepostos no estado `complete`.
 */
export function Step2MediaCard(props: Step2MediaCardProps) {
  const {
    visible,
    mediaFiles,
    mediaPreviewUrls,
    mediaSources,
    mediaAspectRatios,
    altText = '',
    altTexts = {},
    altTextGeneratedAt,
    altTextEdited,
    mediaRequirements,
    selectedFormats,
    setMediaFiles,
    setMediaPreviewUrls,
    setMediaSources,
    onAltTextChange,
    onMediaAltTextChange,
    onGenerateAltText,
    altTextLoadingKey,
    videoToolsLoadingAction,
    onGenerateSrt,
    onGenerateChapters,
    onExtractQuotes,
    removeMedia,
    moveMedia,
    isUploading,
    uploadProgress: _uploadProgress,
    handleMediaUpload,
    getAcceptTypes,
    sensors,
    activeId,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
    saving,
    submitting,
    publishing,
    mediaSectionRef,
    onPreviousStep,
    onNextStep,
    state = 'active',
    onActivate,
    onEdit,
    stepNumber = 2,
  } = props;

  const [altTextOpen, setAltTextOpen] = useState(false);

  const isInstagramCarousel = selectedFormats.includes('instagram_carousel');
  const hasVideo = mediaFiles.some(file => file.type?.startsWith('video/'));
  const maxRemaining = isInstagramCarousel
    ? 50 - mediaPreviewUrls.length
    : mediaRequirements.maxMedia - mediaPreviewUrls.length;
  const altTextSupport = getAltTextSupportContext(selectedFormats);

  // Total bytes para o título compacto (estado complete).
  const totalBytes = mediaFiles.reduce((acc, file) => acc + (file.size || 0), 0);
  const onlyVideos = mediaFiles.length > 0 && mediaFiles.every(f => f.type?.startsWith('video/'));
  const onlyImages = mediaFiles.length > 0 && mediaFiles.every(f => f.type?.startsWith('image/'));
  const mediaKindLabel = onlyVideos
    ? mediaFiles.length === 1 ? 'vídeo' : 'vídeos'
    : onlyImages
      ? mediaFiles.length === 1 ? 'imagem' : 'imagens'
      : 'ficheiros';

  // Sufixo do título: "· N ficheiros · TAM" + indicação de mínimo quando
  // o formato exige múltiplos ficheiros (ex.: Carrossel/Documento PDF).
  const requiresMultiple = mediaRequirements.minMedia >= 2;
  const belowMinimum = requiresMultiple && mediaFiles.length < mediaRequirements.minMedia;
  const titleSuffix = mediaFiles.length > 0
    ? ` · ${mediaFiles.length} ${mediaKindLabel} · ${formatFileSize(totalBytes)}`
    : '';

  // Summary com thumbnails sobrepostos (-4px) em estilo stack.
  const summary = (
    <div className="flex items-center gap-3">
      <div className="flex">
        {mediaPreviewUrls.slice(0, 6).map((url, idx) => {
          const isVideo = mediaFiles[idx]?.type?.startsWith('video/');
          return (
            <div
              key={`summary-thumb-${idx}`}
              className={cn(
                'relative h-10 w-10 shrink-0 overflow-hidden rounded-md border-2 border-card bg-muted',
                idx > 0 && '-ml-1.5',
              )}
              style={{ zIndex: 10 - idx }}
            >
              {isVideo ? (
                <div className="flex h-full w-full items-center justify-center bg-muted-foreground/10">
                  <Video className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                </div>
              ) : (
                <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
              )}
            </div>
          );
        })}
        {mediaPreviewUrls.length > 6 && (
          <div className="-ml-1.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md border-2 border-card bg-muted text-xs font-medium text-muted-foreground">
            +{mediaPreviewUrls.length - 6}
          </div>
        )}
      </div>
      {mediaFiles.length === 1 && (
        <span className="truncate text-sm text-muted-foreground">{mediaFiles[0]?.name}</span>
      )}
    </div>
  );

  if (!visible) {
    return null;
  }

  return (
    <SectionCard
      id="media"
      stepNumber={stepNumber}
      icon={CloudUpload}
      title={`Média${titleSuffix}`}
      state={state}
      onActivate={onActivate}
      onEdit={onEdit}
      summary={mediaPreviewUrls.length > 0 ? summary : undefined}
    >
      <div className="manual-group-stack">
        {/* Upload zone */}
        {mediaPreviewUrls.length === 0 && (
          <div ref={mediaSectionRef}>
            <MediaUploadSection
              onAddToCarousel={(files: File[], source: MediaSource) => {
                const newUrls = files.map((f) => URL.createObjectURL(f));
                const remainingSlots = mediaRequirements.maxMedia - mediaPreviewUrls.length;
                const filesToAdd = files.slice(0, remainingSlots);
                const urlsToAdd = newUrls.slice(0, remainingSlots);

                setMediaFiles((prev) => [...prev, ...filesToAdd]);
                setMediaPreviewUrls((prev) => [...prev, ...urlsToAdd]);
                setMediaSources((prev) => [...prev, ...Array(filesToAdd.length).fill(source)]);

                setTimeout(() => {
                  mediaSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
              }}
              maxImages={maxRemaining}
              disabled={saving || submitting || isUploading}
              selectedFormats={selectedFormats}
              isUploading={isUploading}
              uploadProgress={_uploadProgress}
              onFileUpload={handleMediaUpload}
              getAcceptTypes={getAcceptTypes}
            />
          </div>
        )}

        {/* Grid Splitter when media exists */}
        {mediaPreviewUrls.length > 0 && (
          <div ref={mediaSectionRef}>
            <GridSplitter
              onAddToCarousel={(files: File[], source: MediaSource) => {
                const newUrls = files.map((f) => URL.createObjectURL(f));
                const remainingSlots = mediaRequirements.maxMedia - mediaPreviewUrls.length;
                const filesToAdd = files.slice(0, remainingSlots);
                const urlsToAdd = newUrls.slice(0, remainingSlots);

                setMediaFiles((prev) => [...prev, ...filesToAdd]);
                setMediaPreviewUrls((prev) => [...prev, ...urlsToAdd]);
                setMediaSources((prev) => [...prev, ...Array(filesToAdd.length).fill(source)]);
              }}
              maxImages={maxRemaining}
              disabled={saving || submitting || isUploading}
              selectedFormats={selectedFormats}
            />
          </div>
        )}

        {/* Media Grid - With Files */}
        {mediaPreviewUrls.length > 0 && (
          <div className="manual-group-stack">
            {/* Ferramentas (popover unificado adaptativo) */}
            {(hasVideo || mediaPreviewUrls.length > 0) && (
              <div className="flex items-center justify-end">
                <MediaToolsPopover
                  hasVideo={hasVideo}
                  hasImages={mediaFiles.some((f) => f.type?.startsWith('image/'))}
                  loadingAction={videoToolsLoadingAction ?? null}
                  disabled={saving || submitting || publishing}
                  onGenerateSrt={onGenerateSrt}
                  onGenerateChapters={onGenerateChapters ? () => { void onGenerateChapters(); } : undefined}
                  onExtractQuotes={onExtractQuotes ? () => { void onExtractQuotes(); } : undefined}
                  onRegenerateAllAltText={onGenerateAltText ? () => { void onGenerateAltText(0); } : undefined}
                  altTextLoading={!!altTextLoadingKey}
                />
              </div>
            )}

            {/* Persistent Action Bar */}
            <div
              className={cn(
                'flex items-center justify-between rounded-md border p-3',
                mediaPreviewUrls.length >= mediaRequirements.maxMedia
                  ? 'border-warning/30 bg-warning/10'
                  : 'bg-muted/50 border-border',
              )}
            >
              <div className="flex items-center gap-1.5 xs:gap-2">
                <span
                  className={cn(
                    'text-xs sm:text-sm font-medium',
                    mediaPreviewUrls.length >= mediaRequirements.maxMedia &&
                      'text-warning',
                  )}
                >
                  {mediaPreviewUrls.length}/{mediaRequirements.maxMedia}
                </span>
                {mediaPreviewUrls.length < mediaRequirements.maxMedia ? (
                  <Badge variant="secondary" className="manual-chip hidden xs:inline-flex">
                    +{mediaRequirements.maxMedia - mediaPreviewUrls.length}
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="manual-chip border-warning/30 bg-warning/20 text-warning"
                  >
                    Limite
                  </Badge>
                )}
              </div>

              {mediaPreviewUrls.length < mediaRequirements.maxMedia && (
                <Label htmlFor="media-upload-header" className="cursor-pointer">
                  <Button
                    variant="secondary"
                    size="sm"
                    asChild
                    className="gap-1 h-11 xs:h-9 px-3"
                  >
                    <span>
                      <Plus className="h-3.5 w-3.5 xs:h-4 xs:w-4" />
                      <span className="text-xs">Adicionar mais</span>
                    </span>
                  </Button>
                  <Input
                    id="media-upload-header"
                    type="file"
                    multiple={mediaRequirements.maxMedia > 1}
                    accept={getAcceptTypes()}
                    onChange={handleMediaUpload}
                    disabled={saving || submitting || isUploading}
                    className="hidden"
                  />
                </Label>
              )}
            </div>

            {mediaPreviewUrls.length > 1 && (
              <DragHintTooltip show={mediaPreviewUrls.length > 1} />
            )}

            <div className="flex items-center justify-between text-manual-micro text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="hidden sm:inline">Arraste para reordenar ou use as setas</span>
                <span className="sm:hidden">Pressione e arraste • Use ↑↓</span>
              </span>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              <SortableContext
                items={mediaPreviewUrls.map((_, i) => `media-${i}`)}
                strategy={horizontalListSortingStrategy}
              >
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {mediaPreviewUrls.map((url, idx) => {
                    const isVideo = mediaFiles[idx]?.type?.startsWith('video/');
                    return (
                      <div key={`media-wrap-${idx}`} className="min-w-0">
                        <EnhancedSortableMediaItem
                          id={`media-${idx}`}
                          url={url}
                          index={idx}
                          total={mediaPreviewUrls.length}
                          isVideo={isVideo}
                          disabled={saving || submitting || publishing}
                          source={mediaSources[idx]}
                          aspectRatio={toAspectRatio(mediaAspectRatios[idx])}
                          onRemove={() => removeMedia(idx)}
                          onMoveUp={() => moveMedia(idx, idx - 1)}
                          onMoveDown={() => moveMedia(idx, idx + 1)}
                        />
                        <div className="mt-1 min-w-0 text-xs">
                          <p className="truncate font-medium">{mediaFiles[idx]?.name ?? `Ficheiro ${idx + 1}`}</p>
                          <p className="text-muted-foreground">{formatFileSize(mediaFiles[idx]?.size ?? 0)}</p>
                        </div>
                      </div>
                    );
                  })}

                  {mediaPreviewUrls.length < mediaRequirements.maxMedia && (
                    <Label
                      htmlFor="media-upload-more"
                      className={cn(
                        'aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all press-effect',
                        'border-primary/40 bg-primary/5 hover:border-primary hover:bg-primary/10',
                        'min-h-[100px]',
                      )}
                    >
                      <div className="p-2 rounded-full bg-primary/20">
                        <Plus className="h-5 w-5 text-primary" strokeWidth={1.5} />
                      </div>
                      <span className="text-xs font-medium text-primary">
                        +{mediaRequirements.maxMedia - mediaPreviewUrls.length}
                      </span>
                      <Input
                        id="media-upload-more"
                        type="file"
                        multiple={mediaRequirements.maxMedia > 1}
                        accept={getAcceptTypes()}
                        onChange={handleMediaUpload}
                        disabled={saving || submitting || isUploading}
                        className="hidden"
                      />
                    </Label>
                  )}
                </div>
              </SortableContext>

              {/* Alt text — sub-acordeão colapsado por defeito */}
              {altTextSupport.hasSupported && mediaPreviewUrls.length > 0 && (
                <div className="overflow-hidden rounded-md border border-border/60 bg-muted/20">
                  <button
                    type="button"
                    onClick={() => setAltTextOpen((prev) => !prev)}
                    aria-expanded={altTextOpen}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                      Alt text para acessibilidade
                      {altTextGeneratedAt && (
                        <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                          gerado IA
                        </Badge>
                      )}
                    </span>
                    <ChevronDown
                      className={cn('h-4 w-4 text-muted-foreground transition-transform', altTextOpen && 'rotate-180')}
                      strokeWidth={1.5}
                    />
                  </button>
                  {altTextOpen && (
                    <div className="border-t border-border/40 px-3 py-3">
                      {onMediaAltTextChange ? (
                        <div className="grid gap-4 sm:grid-cols-2">
                          {mediaPreviewUrls.map((_url, idx) => {
                            const key = `media-${idx}`;
                            const value = altTexts[key] ?? (idx === 0 ? altText : '');
                            return (
                              <AIGeneratedField key={key} generatedAt={altTextGeneratedAt} edited={altTextEdited} className="border-0 bg-transparent">
                                <AltTextPanel
                                  visible
                                  value={value}
                                  isCarousel={mediaPreviewUrls.length > 1}
                                  applyAll={false}
                                  loading={altTextLoadingKey === key}
                                  onChange={(next) => onMediaAltTextChange(key, next)}
                                  onRegenerate={() => onGenerateAltText?.(idx)}
                                  onApplyAllChange={(checked) => { if (checked) mediaPreviewUrls.forEach((_, applyIdx) => onMediaAltTextChange(`media-${applyIdx}`, value)); }}
                                  microcopy={idx === 0 ? altTextSupport.microcopy : null}
                                />
                              </AIGeneratedField>
                            );
                          })}
                        </div>
                      ) : onAltTextChange && mediaPreviewUrls.length === 1 ? (
                        <AIGeneratedField generatedAt={altTextGeneratedAt} edited={altTextEdited} className="border-0 bg-transparent">
                          <AltTextPanel
                            visible
                            value={altText}
                            isCarousel={false}
                            applyAll={false}
                            loading={false}
                            onChange={onAltTextChange}
                            onRegenerate={() => undefined}
                            onApplyAllChange={() => undefined}
                            microcopy={altTextSupport.microcopy}
                          />
                        </AIGeneratedField>
                      ) : null}
                    </div>
                  )}
                </div>
              )}

              <DragOverlay
                dropAnimation={{
                  duration: 200,
                  easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
                }}
              >
                {activeId ? (
                  <MediaDragOverlay
                    url={mediaPreviewUrls[parseInt(activeId.replace('media-', ''))]}
                    isVideo={mediaFiles[parseInt(activeId.replace('media-', ''))]?.type?.startsWith(
                      'video/',
                    )}
                  />
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        )}

        {/* Step 2 Navigation */}
        <div className="mt-2 flex justify-between border-t border-border/40 pt-4">
          <Button
            variant="ghost"
            onClick={onPreviousStep}
            className="h-11 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>
          {mediaPreviewUrls.length >= (mediaRequirements.minMedia || 1) && (
            <Button
              variant="default"
              onClick={onNextStep}
              className="h-11"
            >
              Seguinte
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </SectionCard>
  );
}
