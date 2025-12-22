import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Trash2, Plus, Scissors, ZoomIn, History, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AIHistoryImage } from '@/hooks/useAIImageHistory';
import { motion, AnimatePresence } from 'framer-motion';

interface AIImageHistoryProps {
  images: AIHistoryImage[];
  isLoading: boolean;
  onUseImage: (imageUrl: string) => void;
  onCropImage: (imageUrl: string) => void;
  onDeleteImage: (id: string) => void;
}

export function AIImageHistory({
  images,
  isLoading,
  onUseImage,
  onCropImage,
  onDeleteImage,
}: AIImageHistoryProps) {
  const [selectedImage, setSelectedImage] = useState<AIHistoryImage | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <History className="h-4 w-4" />
          <span>Geradas anteriormente</span>
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-16 rounded-lg flex-shrink-0" />
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

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <History className="h-4 w-4" />
          <span>Geradas anteriormente ({images.length})</span>
        </div>
        
        <ScrollArea className="w-full">
          <div className="flex gap-2 pb-2">
            <AnimatePresence mode="popLayout">
              {images.slice(0, 20).map((image, index) => (
                <motion.div
                  key={image.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ delay: index * 0.05 }}
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
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                    <ZoomIn className="h-4 w-4 text-white" />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="max-w-lg p-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Imagem do Histórico
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
              </div>

              {/* Prompt if available */}
              {selectedImage.prompt && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Prompt usado:</p>
                  <p className="text-sm line-clamp-3">{selectedImage.prompt}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 justify-center flex-wrap">
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
    </>
  );
}
