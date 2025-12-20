import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Check, Plus, RefreshCw, ZoomIn } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AIGeneratedImage } from '@/lib/ai-generator/types';

interface AIGeneratorResultsProps {
  images: AIGeneratedImage[];
  onToggleSelection: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onAddToCarousel: () => void;
  onGenerateNew: () => void;
  maxImages: number;
}

export function AIGeneratorResults({
  images,
  onToggleSelection,
  onSelectAll,
  onDeselectAll,
  onAddToCarousel,
  onGenerateNew,
  maxImages,
}: AIGeneratorResultsProps) {
  const selectedCount = images.filter(img => img.selected).length;
  const allSelected = selectedCount === images.length;
  const canAddMore = selectedCount <= maxImages;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={allSelected ? onDeselectAll : onSelectAll} className="h-8 text-xs">
          {allSelected ? 'Desselecionar' : 'Selecionar todas'}
        </Button>
        <Badge variant="secondary" className="text-xs">{selectedCount} selecionada{selectedCount !== 1 ? 's' : ''}</Badge>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {images.map((image) => (
          <div
            key={image.id}
            className={cn(
              "relative aspect-square rounded-lg overflow-hidden cursor-pointer group border-2 transition-all",
              image.selected ? "border-primary ring-2 ring-primary/20" : "border-transparent hover:border-muted-foreground/30"
            )}
            onClick={() => onToggleSelection(image.id)}
          >
            <img src={image.url} alt={`Generated ${image.order}`} className="w-full h-full object-cover" />
            <div className={cn(
              "absolute top-2 left-2 h-5 w-5 rounded-full flex items-center justify-center transition-all",
              image.selected ? "bg-primary text-primary-foreground" : "bg-background/80 border"
            )}>
              {image.selected && <Check className="h-3 w-3" />}
            </div>
            {image.selected && (
              <Badge className="absolute top-2 right-2 h-5 px-1.5 text-xs" variant="secondary">
                {images.filter(i => i.selected).findIndex(i => i.id === image.id) + 1}
              </Badge>
            )}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary" size="icon" className="absolute bottom-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl p-2">
                <img src={image.url} alt={`Generated ${image.order}`} className="w-full h-auto rounded-lg" />
              </DialogContent>
            </Dialog>
          </div>
        ))}
      </div>

      {!canAddMore && <p className="text-xs text-destructive text-center">Máximo de {maxImages} imagens.</p>}

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onGenerateNew} className="flex-1">
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Gerar novas
        </Button>
        <Button size="sm" onClick={onAddToCarousel} disabled={selectedCount === 0 || !canAddMore} className="flex-1">
          <Plus className="h-3.5 w-3.5 mr-1.5" />Adicionar {selectedCount > 0 ? selectedCount : ''}
        </Button>
      </div>
    </div>
  );
}
