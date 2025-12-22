import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Grid3x3, Plus, X, Loader2 } from 'lucide-react';
import { AIGeneratedImage } from '@/lib/ai-generator/types';
import { motion, AnimatePresence } from 'framer-motion';

interface AIGeneratorPreviewProps {
  image: AIGeneratedImage;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDiscard: () => void;
  onAddToCarousel: () => void;
  onSendToGridSplitter: (imageUrl: string) => void;
  isProcessing?: boolean;
}

export function AIGeneratorPreview({
  image,
  open,
  onOpenChange,
  onDiscard,
  onAddToCarousel,
  onSendToGridSplitter,
  isProcessing = false,
}: AIGeneratorPreviewProps) {
  const handleSendToGrid = () => {
    onSendToGridSplitter(image.url);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-4">
        <DialogHeader>
          <DialogTitle>Pré-visualização</DialogTitle>
          <DialogDescription>
            Escolhe o que fazer com esta imagem gerada
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Large Preview with Animation */}
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="relative aspect-square max-h-[50vh] mx-auto overflow-hidden rounded-lg border bg-muted"
            >
              <img 
                src={image.url} 
                alt="Generated preview" 
                className="w-full h-full object-contain"
              />
              
              {/* 3:4 Aspect Ratio Guide Overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div 
                  className="border-2 border-dashed border-primary/40 rounded"
                  style={{ 
                    width: '75%',
                    aspectRatio: '3/4',
                    maxHeight: '100%'
                  }}
                />
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Action Buttons */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex gap-2 justify-center flex-wrap"
          >
            <Button 
              variant="outline" 
              onClick={onDiscard}
              disabled={isProcessing}
              className="gap-1.5"
            >
              <X className="h-4 w-4" />
              Descartar
            </Button>
            
            <Button 
              variant="secondary"
              onClick={handleSendToGrid}
              disabled={isProcessing}
              className="gap-1.5"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Grid3x3 className="h-4 w-4" />
              )}
              Cortar para Instagram (3:4)
            </Button>
            
            <Button 
              onClick={onAddToCarousel}
              disabled={isProcessing}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Adicionar ao Carrossel
            </Button>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
