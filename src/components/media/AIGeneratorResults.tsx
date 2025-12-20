import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Plus, ZoomIn, CheckSquare, Square, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HiggsfieldGeneratedImage } from '@/lib/higgsfield/types';

interface AIGeneratorResultsProps {
  images: HiggsfieldGeneratedImage[];
  onToggleSelection: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onAddToCarousel: (images: HiggsfieldGeneratedImage[]) => void;
  onStartOver: () => void;
  maxImages: number;
  disabled?: boolean;
}

export function AIGeneratorResults({
  images,
  onToggleSelection,
  onSelectAll,
  onDeselectAll,
  onAddToCarousel,
  onStartOver,
  maxImages,
  disabled,
}: AIGeneratorResultsProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const selectedCount = images.filter(img => img.selected).length;
  const allSelected = images.length > 0 && selectedCount === images.length;
  const canAdd = selectedCount > 0 && selectedCount <= maxImages;

  const handleAddToCarousel = () => {
    const selectedImages = images.filter(img => img.selected);
    onAddToCarousel(selectedImages);
  };

  return (
    <div className="space-y-4">
      {/* Header with selection controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={allSelected ? onDeselectAll : onSelectAll}
            disabled={disabled || images.length === 0}
          >
            {allSelected ? (
              <>
                <Square className="h-4 w-4 mr-1" />
                Desselecionar
              </>
            ) : (
              <>
                <CheckSquare className="h-4 w-4 mr-1" />
                Selecionar Todas
              </>
            )}
          </Button>
        </div>
        <Badge variant="secondary">
          {selectedCount} de {images.length} selecionadas
        </Badge>
      </div>

      {/* Image Grid */}
      <div className="grid grid-cols-3 gap-3">
        {images.map((image) => (
          <div
            key={image.id}
            className={cn(
              "relative group rounded-lg overflow-hidden border-2 transition-all cursor-pointer",
              image.selected 
                ? "border-primary ring-2 ring-primary/20" 
                : "border-transparent hover:border-muted-foreground/30"
            )}
            onClick={() => onToggleSelection(image.id)}
          >
            <img
              src={image.url}
              alt={`Imagem gerada ${image.order}`}
              className="w-full aspect-square object-cover"
            />
            
            {/* Selection Checkbox */}
            <div className="absolute top-2 left-2">
              <div className={cn(
                "h-5 w-5 rounded border-2 flex items-center justify-center transition-colors",
                image.selected 
                  ? "bg-primary border-primary text-primary-foreground" 
                  : "bg-background/80 border-muted-foreground/50"
              )}>
                {image.selected && <CheckSquare className="h-3 w-3" />}
              </div>
            </div>

            {/* Order Badge */}
            <Badge 
              className="absolute top-2 right-2"
              variant="secondary"
            >
              #{image.order}
            </Badge>

            {/* Zoom Button */}
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <img
                  src={image.url}
                  alt={`Imagem gerada ${image.order}`}
                  className="w-full h-auto rounded-lg"
                />
              </DialogContent>
            </Dialog>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        {selectedCount > maxImages && (
          <p className="text-xs text-destructive text-center">
            Limite de {maxImages} imagens. Desselecione algumas.
          </p>
        )}

        <Button
          onClick={handleAddToCarousel}
          disabled={disabled || !canAdd}
          className="w-full"
          size="lg"
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar {selectedCount} ao Carrossel
        </Button>

        <Button
          variant="outline"
          onClick={onStartOver}
          disabled={disabled}
          className="w-full"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Gerar Novas Imagens
        </Button>
      </div>
    </div>
  );
}
