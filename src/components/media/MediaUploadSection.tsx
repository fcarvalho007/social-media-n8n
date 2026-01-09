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

  // Check if only video formats are selected (hide AI generator)
  const hasOnlyVideoFormats = selectedFormats.length > 0 && selectedFormats.every(format => 
    ['instagram_reel', 'instagram_stories', 'youtube_shorts', 'youtube_video', 'tiktok_video'].includes(format)
  );

  // Drag and drop handlers for file upload card
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
      // Create a synthetic event to pass to onFileUpload
      const input = document.createElement('input');
      input.type = 'file';
      const dataTransfer = new DataTransfer();
      files.forEach(file => dataTransfer.items.add(file));
      input.files = dataTransfer.files;
      
      const syntheticEvent = {
        target: input,
        currentTarget: input,
      } as React.ChangeEvent<HTMLInputElement>;
      
      onFileUpload(syntheticEvent);
    }
  }, [onFileUpload]);

  return (
    <div className="space-y-3">
      {/* Card 1: Dividir Grelha */}
      <div className={cn(
        "rounded-xl border transition-all duration-200",
        "bg-indigo-50/50 dark:bg-indigo-950/20",
        "border-indigo-200/50 dark:border-indigo-800/30",
        openCard === 'grid' && "ring-2 ring-indigo-500/20 shadow-md"
      )}>
        <button
          type="button"
          onClick={() => handleCardToggle('grid')}
          disabled={disabled}
          className={cn(
            "w-full p-4 sm:p-5 flex items-start gap-3 sm:gap-4 text-left",
            "hover:bg-indigo-100/50 dark:hover:bg-indigo-900/30 transition-colors rounded-xl",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <div className={cn(
            "p-2.5 sm:p-3 rounded-xl shrink-0",
            "bg-indigo-100 dark:bg-indigo-900/50",
            "group-hover:scale-105 transition-transform"
          )}>
            <Grid3x3 className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h4 className="font-semibold text-sm sm:text-base text-foreground">
                Dividir Grelha
              </h4>
              <Badge variant="outline" className="text-[10px] sm:text-xs shrink-0 bg-indigo-100/50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700">
                até 200MB
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
              Separa uma imagem com múltiplas fotos em slides individuais
            </p>
          </div>
          
          <ChevronDown className={cn(
            "h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-200",
            openCard === 'grid' && "rotate-180"
          )} />
        </button>
        
        <AnimatePresence>
          {openCard === 'grid' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-1">
                <GridSplitter
                  onAddToCarousel={onAddToCarousel}
                  maxImages={maxImages}
                  disabled={disabled}
                  selectedFormats={selectedFormats}
                  isEmbedded
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Card 2: Gerar com IA - Hidden for video-only formats */}
      {!hasOnlyVideoFormats && (
        <div className={cn(
          "rounded-xl border transition-all duration-200",
          "bg-violet-50/50 dark:bg-violet-950/20",
          "border-violet-200/50 dark:border-violet-800/30",
          openCard === 'ai' && "ring-2 ring-violet-500/20 shadow-md"
        )}>
          <button
            type="button"
            onClick={() => handleCardToggle('ai')}
            disabled={disabled}
            className={cn(
              "w-full p-4 sm:p-5 flex items-start gap-3 sm:gap-4 text-left",
              "hover:bg-violet-100/50 dark:hover:bg-violet-900/30 transition-colors rounded-xl",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <div className={cn(
              "p-2.5 sm:p-3 rounded-xl shrink-0",
              "bg-gradient-to-br from-violet-100 to-fuchsia-100 dark:from-violet-900/50 dark:to-fuchsia-900/50"
            )}>
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-violet-600 dark:text-violet-400" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h4 className="font-semibold text-sm sm:text-base text-foreground">
                  Gerar com IA
                </h4>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                Cria imagens únicas com inteligência artificial
              </p>
            </div>
            
            <ChevronDown className={cn(
              "h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-200",
              openCard === 'ai' && "rotate-180"
            )} />
          </button>
          
          <AnimatePresence>
            {openCard === 'ai' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="overflow-hidden"
              >
                <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-1">
                  <AIGenerator
                    onAddToCarousel={(files) => onAddToCarousel(files, 'ai')}
                    onSendToGridSplitter={onSendToGridSplitter}
                    maxImages={maxImages}
                    disabled={disabled}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Card 3: Carregar Ficheiros - Always visible drop zone */}
      <Label
        htmlFor="media-upload-section"
        className={cn(
          "block cursor-pointer",
          disabled && "cursor-not-allowed"
        )}
      >
        <div
          ref={dropRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "rounded-xl border-2 border-dashed transition-all duration-200",
            "bg-slate-50/50 dark:bg-slate-900/30",
            "border-slate-300 dark:border-slate-700",
            "hover:border-primary hover:bg-primary/5",
            isDragging && "border-primary bg-primary/10 scale-[1.01]",
            disabled && "opacity-50 pointer-events-none"
          )}
        >
          <div className="p-4 sm:p-5">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className={cn(
                "p-2.5 sm:p-3 rounded-xl shrink-0",
                "bg-slate-100 dark:bg-slate-800"
              )}>
                <CloudUpload className="h-5 w-5 sm:h-6 sm:w-6 text-slate-600 dark:text-slate-400" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h4 className="font-semibold text-sm sm:text-base text-foreground">
                    Carregar Ficheiros
                  </h4>
                  <div className="flex gap-1 flex-wrap">
                    <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1.5 py-0 bg-slate-100/50 dark:bg-slate-800/50">PNG</Badge>
                    <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1.5 py-0 bg-slate-100/50 dark:bg-slate-800/50">JPG</Badge>
                    <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1.5 py-0 bg-slate-100/50 dark:bg-slate-800/50">MP4</Badge>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                  Arrasta ficheiros ou clica para selecionar
                </p>
              </div>
            </div>
            
            {/* Drop zone visual */}
            <div className={cn(
              "mt-4 p-6 sm:p-8 rounded-lg border-2 border-dashed text-center transition-all",
              "border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/30",
              isDragging && "border-primary bg-primary/5"
            )}>
              {isUploading ? (
                <div className="space-y-3">
                  <Loader2 className="h-8 w-8 mx-auto text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground">A processar...</p>
                  <Progress value={uploadProgress} className="h-2 max-w-[200px] mx-auto" />
                </div>
              ) : (
                <>
                  <CloudUpload className={cn(
                    "h-8 w-8 sm:h-10 sm:w-10 mx-auto mb-2 transition-colors",
                    isDragging ? "text-primary" : "text-muted-foreground"
                  )} />
                  <p className="text-sm text-muted-foreground">
                    {isDragging ? (
                      <span className="text-primary font-medium">Larga para carregar</span>
                    ) : (
                      <>Arrasta ficheiros aqui ou <span className="text-primary font-medium">clica para selecionar</span></>
                    )}
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
    </div>
  );
}
