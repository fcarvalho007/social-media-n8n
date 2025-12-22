import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Trash2, Plus, Scissors, ZoomIn, History, Copy, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AIHistoryImage } from '@/hooks/useAIImageHistory';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';

interface AIImageHistoryProps {
  images: AIHistoryImage[];
  isLoading: boolean;
  onUseImage: (imageUrl: string) => void;
  onCropImage: (imageUrl: string) => void;
  onDeleteImage: (id: string) => void;
  onRegeneratePrompt?: (prompt: string) => void;
}

export function AIImageHistory({
  images,
  isLoading,
  onUseImage,
  onCropImage,
  onDeleteImage,
  onRegeneratePrompt,
}: AIImageHistoryProps) {
  const [selectedImage, setSelectedImage] = useState<AIHistoryImage | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const displayImages = isExpanded ? images.slice(0, 50) : images.slice(0, 8);
  const hasMore = images.length > 8;

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <History className="h-4 w-4" />
          <span>Geradas anteriormente</span>
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-16 w-16 rounded-lg flex-shrink-0 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (images.length === 0) {
    return null;
  }

  const handleDelete = async () => {
    if (!selectedImage) return;
    setIsDeleting(true);
    await onDeleteImage(selectedImage.id);
    setIsDeleting(false);
    setSelectedImage(null);
  };

  const handleCopyPrompt = () => {
    if (selectedImage?.prompt) {
      navigator.clipboard.writeText(selectedImage.prompt);
      toast.success('Prompt copiado!');
    }
  };

  const handleDownload = async () => {
    if (!selectedImage) return;
    try {
      const response = await fetch(selectedImage.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-image-${selectedImage.id}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Download iniciado');
    } catch {
      toast.error('Erro ao fazer download');
    }
  };

  const formatRelativeDate = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: pt });
    } catch {
      return '';
    }
  };

  return (
    <TooltipProvider>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <History className="h-4 w-4" />
              <span>Geradas anteriormente ({images.length})</span>
            </div>
            {hasMore && (
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                  {isExpanded ? (
                    <>Ver menos <ChevronUp className="h-3 w-3" /></>
                  ) : (
                    <>Ver mais <ChevronDown className="h-3 w-3" /></>
                  )}
                </Button>
              </CollapsibleTrigger>
            )}
          </div>
          
          <ScrollArea className="w-full">
            <div className="flex gap-2 pb-2">
              <AnimatePresence mode="popLayout">
                {displayImages.map((image, index) => (
                  <Tooltip key={image.id}>
                    <TooltipTrigger asChild>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ delay: index * 0.03, type: 'spring', stiffness: 300 }}
                        className="relative group flex-shrink-0"
                      >
                        <button
                          onClick={() => setSelectedImage(image)}
                          className={cn(
                            "h-16 w-16 rounded-lg overflow-hidden border-2 border-transparent",
                            "hover:border-primary transition-all duration-200",
                            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                          )}
                        >
                          <img
                            src={image.thumbnailUrl}
                            alt="AI generated"
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </button>
                        
                        {/* Date badge */}
                        <div className="absolute bottom-0.5 right-0.5 bg-black/70 text-white text-[8px] px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                          {formatRelativeDate(image.createdAt).replace('há ', '')}
                        </div>
                        
                        {/* Cost badge if available */}
                        {image.cost && image.cost > 0 && (
                          <div className="absolute top-0.5 right-0.5 bg-primary/90 text-primary-foreground text-[8px] px-1 rounded">
                            ${image.cost.toFixed(2)}
                          </div>
                        )}
                        
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                          <ZoomIn className="h-4 w-4 text-white" />
                        </div>
                      </motion.div>
                    </TooltipTrigger>
                    {image.prompt && (
                      <TooltipContent side="bottom" className="max-w-xs">
                        <p className="text-xs line-clamp-3">{image.prompt}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                ))}
              </AnimatePresence>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
          
          <CollapsibleContent>
            {/* Additional content when expanded - already handled by displayImages */}
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Preview Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="max-w-lg p-4">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Imagem do Histórico
              </div>
              {selectedImage && (
                <span className="text-xs text-muted-foreground font-normal">
                  {formatRelativeDate(selectedImage.createdAt)}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedImage && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Image Preview */}
              <div className="relative aspect-square max-h-[50vh] mx-auto overflow-hidden rounded-lg border bg-muted">
                <img
                  src={selectedImage.url}
                  alt="AI generated preview"
                  className="w-full h-full object-contain"
                />
                {selectedImage.cost && selectedImage.cost > 0 && (
                  <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                    ${selectedImage.cost.toFixed(3)}
                  </div>
                )}
              </div>

              {/* Prompt if available */}
              {selectedImage.prompt && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-muted-foreground">Prompt usado:</p>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 text-xs gap-1"
                      onClick={handleCopyPrompt}
                    >
                      <Copy className="h-3 w-3" />
                      Copiar
                    </Button>
                  </div>
                  <p className="text-sm line-clamp-3">{selectedImage.prompt}</p>
                  {onRegeneratePrompt && (
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="h-6 text-xs p-0 mt-1"
                      onClick={() => {
                        onRegeneratePrompt(selectedImage.prompt!);
                        setSelectedImage(null);
                      }}
                    >
                      Usar este prompt para gerar nova
                    </Button>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="gap-1.5 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar
                </Button>
                
                <Button
                  variant="outline"
                  onClick={handleDownload}
                  className="gap-1.5"
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => {
                    onCropImage(selectedImage.url);
                    setSelectedImage(null);
                  }}
                  className="gap-1.5"
                >
                  <Scissors className="h-4 w-4" />
                  Cortar 3:4
                </Button>

                <Button
                  onClick={() => {
                    onUseImage(selectedImage.url);
                    setSelectedImage(null);
                  }}
                  className="gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  Usar no Carrossel
                </Button>
              </div>
            </motion.div>
          )}
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
