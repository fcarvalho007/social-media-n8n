import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Check, Plus, RefreshCw, ZoomIn, Scissors, DollarSign, Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AIGeneratedImage } from '@/lib/ai-generator/types';
import { AIGeneratorPreview } from './AIGeneratorPreview';
import { formatCost } from '@/lib/ai-generator/constants';
import { motion, AnimatePresence } from 'framer-motion';

interface AIGeneratorResultsProps {
  images: AIGeneratedImage[];
  onToggleSelection: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onAddToCarousel: () => void;
  onGenerateNew: () => void;
  onSendToGridSplitter?: (imageUrl: string) => void;
  maxImages: number;
  totalCost?: number;
}

export function AIGeneratorResults({
  images,
  onToggleSelection,
  onSelectAll,
  onDeselectAll,
  onAddToCarousel,
  onGenerateNew,
  onSendToGridSplitter,
  maxImages,
  totalCost = 0,
}: AIGeneratorResultsProps) {
  const [previewImage, setPreviewImage] = useState<AIGeneratedImage | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  
  const selectedCount = images.filter(img => img.selected).length;
  const allSelected = selectedCount === images.length;
  const canAddMore = selectedCount <= maxImages;

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore if typing in an input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    
    if (e.key === 'Enter' && selectedCount > 0 && canAddMore) {
      e.preventDefault();
      onAddToCarousel();
    } else if (e.key.toLowerCase() === 'a' && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      allSelected ? onDeselectAll() : onSelectAll();
    } else if (e.key >= '1' && e.key <= '9') {
      const index = parseInt(e.key) - 1;
      if (index < images.length) {
        e.preventDefault();
        onToggleSelection(images[index].id);
      }
    } else if (e.key === 'Escape' && previewImage) {
      setPreviewImage(null);
    }
  }, [images, selectedCount, canAddMore, allSelected, onAddToCarousel, onSelectAll, onDeselectAll, onToggleSelection, previewImage]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleImageClick = (image: AIGeneratedImage) => {
    setPreviewImage(image);
  };

  const handleAddSingleToCarousel = () => {
    if (previewImage) {
      images.forEach(img => {
        if (img.id !== previewImage.id && img.selected) {
          onToggleSelection(img.id);
        }
        if (img.id === previewImage.id && !img.selected) {
          onToggleSelection(img.id);
        }
      });
      setPreviewImage(null);
      onAddToCarousel();
    }
  };

  const handleDiscard = () => {
    if (previewImage) {
      if (previewImage.selected) {
        onToggleSelection(previewImage.id);
      }
      setPreviewImage(null);
    }
  };

  const handleSendToGrid = (imageUrl: string) => {
    if (onSendToGridSplitter) {
      onSendToGridSplitter(imageUrl);
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Cost Display */}
        {totalCost > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-500/10 border border-green-500/20 rounded-lg p-3"
          >
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <Check className="h-4 w-4" />
                <span className="font-medium">{images.length} imagem{images.length > 1 ? 's' : ''} gerada{images.length > 1 ? 's' : ''}!</span>
              </div>
              <div className="flex items-center gap-1.5 text-green-700 dark:text-green-400">
                <DollarSign className="h-3.5 w-3.5" />
                <span className="font-semibold">{formatCost(totalCost)}</span>
              </div>
            </div>
          </motion.div>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={allSelected ? onDeselectAll : onSelectAll} className="h-8 text-xs">
              {allSelected ? 'Desselecionar' : 'Selecionar todas'}
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6"
                  onClick={() => setShowShortcuts(!showShortcuts)}
                >
                  <Keyboard className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <div className="space-y-1">
                  <p><kbd className="px-1 bg-muted rounded">A</kbd> Selec. todas</p>
                  <p><kbd className="px-1 bg-muted rounded">1-9</kbd> Toggle imagem</p>
                  <p><kbd className="px-1 bg-muted rounded">Enter</kbd> Adicionar</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
          <Badge variant="secondary" className="text-xs">{selectedCount} selecionada{selectedCount !== 1 ? 's' : ''}</Badge>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <AnimatePresence>
            {images.map((image, index) => (
              <motion.div
                key={image.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "relative aspect-square rounded-lg overflow-hidden cursor-pointer group border-2 transition-all",
                  image.selected ? "border-primary ring-2 ring-primary/20" : "border-transparent hover:border-muted-foreground/30"
                )}
                onClick={() => handleImageClick(image)}
              >
                <img src={image.url} alt={`Generated ${image.order}`} className="w-full h-full object-cover" />
                
                {/* Selection indicator */}
                <div 
                  className={cn(
                    "absolute top-2 left-2 h-6 w-6 rounded-full flex items-center justify-center transition-all text-xs font-bold",
                    image.selected ? "bg-primary text-primary-foreground" : "bg-background/80 border text-muted-foreground"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSelection(image.id);
                  }}
                >
                  {image.selected ? <Check className="h-3.5 w-3.5" /> : index + 1}
                </div>
                
                {/* Order badge when selected */}
                {image.selected && (
                  <Badge className="absolute top-2 right-2 h-5 px-1.5 text-xs" variant="secondary">
                    {images.filter(i => i.selected).findIndex(i => i.id === image.id) + 1}
                  </Badge>
                )}
                
                {/* Hover overlay with actions */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="secondary" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleImageClick(image);
                        }}
                      >
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Ver maior</TooltipContent>
                  </Tooltip>
                  
                  {onSendToGridSplitter && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="secondary" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendToGrid(image.url);
                          }}
                        >
                          <Scissors className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Cortar para Instagram</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {!canAddMore && <p className="text-xs text-destructive text-center">Máximo de {maxImages} imagens.</p>}

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onGenerateNew} className="flex-1">
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Gerar novas
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" onClick={onAddToCarousel} disabled={selectedCount === 0 || !canAddMore} className="flex-1">
                <Plus className="h-3.5 w-3.5 mr-1.5" />Adicionar {selectedCount > 0 ? selectedCount : ''}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <kbd className="px-1 bg-muted rounded text-xs">Enter</kbd>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Preview Dialog */}
        {previewImage && (
          <AIGeneratorPreview
            image={previewImage}
            open={!!previewImage}
            onOpenChange={(open) => !open && setPreviewImage(null)}
            onDiscard={handleDiscard}
            onAddToCarousel={handleAddSingleToCarousel}
            onSendToGridSplitter={handleSendToGrid}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
