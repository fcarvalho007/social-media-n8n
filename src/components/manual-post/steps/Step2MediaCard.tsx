import { type ChangeEvent, type RefObject } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CloudUpload, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
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
import { SectionHelp, getSectionTooltip } from '@/components/manual-post/SectionHelp';
import { AutoSaveIndicator } from '@/components/manual-post/NoAccountsState';
import { DragHintTooltip } from '@/components/manual-post/DragHintTooltip';
import {
  EnhancedSortableMediaItem,
  MediaDragOverlay,
  type AspectRatioType,
} from '@/components/manual-post/EnhancedSortableMediaItem';
import { MediaSource } from '@/types/media';
import { PostFormat } from '@/types/social';

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
  // Visibility / animation
  visible: boolean;

  // Media state
  mediaFiles: File[];
  mediaPreviewUrls: string[];
  mediaSources: MediaSource[];
  mediaAspectRatios: string[];
  mediaRequirements: MediaRequirements;
  selectedFormats: PostFormat[];

  // Mutators
  setMediaFiles: React.Dispatch<React.SetStateAction<File[]>>;
  setMediaPreviewUrls: React.Dispatch<React.SetStateAction<string[]>>;
  setMediaSources: React.Dispatch<React.SetStateAction<MediaSource[]>>;
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

  // Auto-save indicator
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
}

/**
 * Cartão Step 2 — gestão de média. Inclui upload inicial (`MediaUploadSection`),
 * `GridSplitter` para adicionar mais, grelha sortable com DnD e navegação.
 */
export function Step2MediaCard(props: Step2MediaCardProps) {
  const {
    visible,
    mediaFiles,
    mediaPreviewUrls,
    mediaSources,
    mediaAspectRatios,
    mediaRequirements,
    selectedFormats,
    setMediaFiles,
    setMediaPreviewUrls,
    setMediaSources,
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
    lastSaved,
    isAutoSaving,
    hasUnsavedChanges,
    saving,
    submitting,
    publishing,
    mediaSectionRef,
    onPreviousStep,
    onNextStep,
  } = props;

  const isInstagramCarousel = selectedFormats.includes('instagram_carousel');
  const maxRemaining = isInstagramCarousel
    ? 50 - mediaPreviewUrls.length
    : mediaRequirements.maxMedia - mediaPreviewUrls.length;

  return (
    <div
      className={cn(
        'transition-all duration-300 ease-out overflow-hidden',
        visible ? 'opacity-100' : 'opacity-0 max-h-0',
      )}
    >
      <Card className="border-0 sm:border shadow-none sm:shadow-sm w-full max-w-full overflow-hidden">
        <CardHeader className="pb-1 sm:pb-3 px-1.5 xs:px-2 sm:px-6 pt-1.5 xs:pt-2 sm:pt-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm xs:text-base sm:text-lg flex items-center gap-1 xs:gap-1.5 sm:gap-2">
              <CloudUpload className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <span>Média</span>
              <SectionHelp content={getSectionTooltip('media')} />
            </CardTitle>
            <AutoSaveIndicator
              lastSaved={lastSaved}
              isSaving={isAutoSaving}
              hasUnsavedChanges={hasUnsavedChanges}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-2 xs:space-y-3 sm:space-y-4 px-1.5 xs:px-2 sm:px-6 pb-3 xs:pb-4 sm:pb-6">
          {/* 3 Card Upload Options - Vertical Stack */}
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

          {/* Grid Splitter when media exists (for adding more via grid) */}
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
            <div className="space-y-3">
              {/* Persistent Action Bar */}
              <div
                className={cn(
                  'flex items-center justify-between p-2 xs:p-2.5 sm:p-3 rounded-lg border',
                  mediaPreviewUrls.length >= mediaRequirements.maxMedia
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-muted/50 border-border',
                )}
              >
                <div className="flex items-center gap-1.5 xs:gap-2">
                  <span
                    className={cn(
                      'text-xs sm:text-sm font-medium',
                      mediaPreviewUrls.length >= mediaRequirements.maxMedia &&
                        'text-amber-700 dark:text-amber-300',
                    )}
                  >
                    {mediaPreviewUrls.length}/{mediaRequirements.maxMedia}
                  </span>
                  {mediaPreviewUrls.length < mediaRequirements.maxMedia ? (
                    <Badge variant="secondary" className="text-[10px] hidden xs:inline-flex">
                      +{mediaRequirements.maxMedia - mediaPreviewUrls.length}
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-[10px] xs:text-xs bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30"
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
                      className="gap-1 h-8 xs:h-9 px-2 xs:px-3"
                    >
                      <span>
                        <Plus className="h-3.5 w-3.5 xs:h-4 xs:w-4" />
                        <span className="text-xs">Mais</span>
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

              {/* Drag hint for first-time users */}
              {mediaPreviewUrls.length > 1 && (
                <DragHintTooltip show={mediaPreviewUrls.length > 1} />
              )}

              <div className="flex items-center justify-between text-xs text-muted-foreground">
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1 xs:gap-1.5 sm:gap-3">
                    {mediaPreviewUrls.map((url, idx) => {
                      const isVideo = mediaFiles[idx]?.type?.startsWith('video/');
                      return (
                        <EnhancedSortableMediaItem
                          key={`media-${idx}`}
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
                      );
                    })}

                    {/* Add More Button */}
                    {mediaPreviewUrls.length < mediaRequirements.maxMedia && (
                      <Label
                        htmlFor="media-upload-more"
                        className={cn(
                          'aspect-square rounded-lg xs:rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 xs:gap-1.5 cursor-pointer transition-all press-effect',
                          'border-primary/40 bg-primary/5 hover:border-primary hover:bg-primary/10',
                          'min-h-[100px]',
                        )}
                      >
                        <div className="p-2 rounded-full bg-primary/20">
                          <Plus className="h-5 w-5 text-primary" />
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

                {/* Drag Overlay */}
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
          <div className="flex justify-between mt-3 pt-3 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={onPreviousStep}
              className="text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            {mediaPreviewUrls.length >= (mediaRequirements.minMedia || 1) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onNextStep}
                className="text-muted-foreground hover:text-foreground"
              >
                Seguinte
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
