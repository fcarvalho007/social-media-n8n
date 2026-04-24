import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Grid3x3, Sparkles, CloudUpload, ChevronDown, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { PostFormat } from '@/types/social';
import { MediaSource } from '@/types/media';
import { GridSplitter } from './GridSplitter';
import { AIGenerator } from './AIGenerator';

interface MediaUploadSectionProps {
  onAddToCarousel: (files: File[], source: MediaSource) => void;
  onSendToGridSplitter?: (imageFile: File, presetConfig?: { rows: number; cols: number }) => void;
  maxImages: number;
  disabled?: boolean;
  selectedFormats: PostFormat[];
  isUploading?: boolean;
  uploadProgress?: number;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  getAcceptTypes: () => string;
}

export function MediaUploadSection({
  onAddToCarousel,
  onSendToGridSplitter,
  maxImages,
  disabled = false,
  selectedFormats,
  isUploading = false,
  uploadProgress = 0,
  onFileUpload,
  getAcceptTypes,
}: MediaUploadSectionProps) {
  const [openCard, setOpenCard] = useState<'grid' | 'ai' | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const handleCardToggle = useCallback((card: 'grid' | 'ai') => {
    setOpenCard(prev => prev === card ? null : card);
  }, []);

  const hasOnlyVideoFormats = selectedFormats.length > 0 && selectedFormats.every(format =>
    ['instagram_reel', 'instagram_stories', 'youtube_shorts', 'youtube_video', 'tiktok_video'].includes(format)
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const input = document.createElement('input');
      input.type = 'file';
      const dataTransfer = new DataTransfer();
      files.forEach(file => dataTransfer.items.add(file));
      input.files = dataTransfer.files;

      onFileUpload({ target: input, currentTarget: input } as React.ChangeEvent<HTMLInputElement>);
    }
  }, [onFileUpload]);

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,7fr)_minmax(220px,3fr)]">
      <Label htmlFor="media-upload-section" className={cn('block cursor-pointer lg:row-span-2', disabled && 'cursor-not-allowed')}>
        <div
          ref={dropRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'h-full rounded-md border-2 border-dashed border-border bg-muted/30 transition-all duration-200 hover:border-primary hover:bg-primary/5',
            isDragging && 'scale-[1.01] border-primary bg-primary/10',
            disabled && 'pointer-events-none opacity-50'
          )}
        >
          <div className="flex h-full min-h-[260px] flex-col p-4 sm:p-6">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="rounded-md bg-background p-3 shadow-sm">
                <CloudUpload className="h-6 w-6 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-base font-semibold text-foreground">Carregar ficheiros</h4>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-[10px]">PNG</Badge>
                    <Badge variant="outline" className="text-[10px]">JPG</Badge>
                    <Badge variant="outline" className="text-[10px]">MP4</Badge>
                    <Badge variant="outline" className="text-[10px]">MOV</Badge>
                  </div>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">Arrasta ficheiros para esta área ou clica para selecionar.</p>
              </div>
            </div>

            <div className={cn('mt-4 flex flex-1 flex-col items-center justify-center rounded-md border border-dashed bg-background/70 p-6 text-center transition-all', isDragging && 'border-primary bg-primary/5')}>
              {isUploading ? (
                <div className="w-full max-w-xs space-y-3">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">A processar...</p>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              ) : (
                <>
                  <CloudUpload className={cn('mb-3 h-10 w-10 transition-colors', isDragging ? 'text-primary' : 'text-muted-foreground')} />
                  <p className="text-sm text-muted-foreground">
                    {isDragging ? <span className="font-medium text-primary">Larga para carregar</span> : <>Arrasta aqui ou <span className="font-medium text-primary">seleciona no computador</span></>}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        <Input
          id="media-upload-section"
          type="file"
          multiple
          accept={getAcceptTypes()}
          onChange={onFileUpload}
          disabled={disabled || isUploading}
          className="hidden"
          aria-label="Carregar ficheiros de média"
        />
      </Label>

      <div className={cn('rounded-md border bg-muted/30 transition-all duration-200', openCard === 'grid' && 'shadow-md ring-2 ring-primary/20')}>
        <button
          type="button"
          onClick={() => handleCardToggle('grid')}
          disabled={disabled}
          className={cn('flex w-full items-start gap-3 rounded-md p-3 text-left transition-colors hover:bg-muted/50', disabled && 'cursor-not-allowed opacity-50')}
        >
          <div className="shrink-0 rounded-md bg-background p-2 shadow-sm">
            <Grid3x3 className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-foreground">Dividir grelha</h4>
              <Badge variant="outline" className="shrink-0 text-[10px]">até 200MB</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Separa uma imagem com múltiplas fotos em slides individuais</p>
          </div>
          <ChevronDown className={cn('h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200', openCard === 'grid' && 'rotate-180')} />
        </button>

        <AnimatePresence>
          {openCard === 'grid' && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="overflow-hidden">
              <div className="px-3 pb-3 pt-1">
                <GridSplitter onAddToCarousel={onAddToCarousel} maxImages={maxImages} disabled={disabled} selectedFormats={selectedFormats} isEmbedded />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!hasOnlyVideoFormats && (
        <div className={cn('rounded-md border bg-muted/30 transition-all duration-200', openCard === 'ai' && 'shadow-md ring-2 ring-primary/20')}>
          <button
            type="button"
            onClick={() => handleCardToggle('ai')}
            disabled={disabled}
            className={cn('flex w-full items-start gap-3 rounded-md p-3 text-left transition-colors hover:bg-muted/50', disabled && 'cursor-not-allowed opacity-50')}
          >
            <div className="shrink-0 rounded-md bg-background p-2 shadow-sm">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-semibold text-foreground">Gerar com IA</h4>
              <p className="mt-1 text-xs text-muted-foreground">Cria imagens únicas com inteligência artificial</p>
            </div>
            <ChevronDown className={cn('h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200', openCard === 'ai' && 'rotate-180')} />
          </button>

          <AnimatePresence>
            {openCard === 'ai' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="overflow-hidden">
                <div className="px-3 pb-3 pt-1">
                  <AIGenerator onAddToCarousel={(files) => onAddToCarousel(files, 'ai')} onSendToGridSplitter={onSendToGridSplitter} maxImages={maxImages} disabled={disabled} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
