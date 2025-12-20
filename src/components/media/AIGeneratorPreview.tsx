import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Scissors, Plus, X, Loader2 } from 'lucide-react';
import { AIGeneratedImage } from '@/lib/ai-generator/types';

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
          {/* Large Preview */}
          <div className="relative aspect-square max-h-[50vh] mx-auto overflow-hidden rounded-lg border bg-muted">
            <img 
              src={image.url} 
              alt="Generated preview" 
              className="w-full h-full object-contain"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-center flex-wrap">
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
                <Scissors className="h-4 w-4" />
              )}
              Cortar em Grelha
            </Button>
            
            <Button 
              onClick={onAddToCarousel}
              disabled={isProcessing}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Adicionar ao Carrossel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
