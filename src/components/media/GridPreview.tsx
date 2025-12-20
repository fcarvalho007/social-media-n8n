import { useCallback } from 'react';
import { DetectedImage, GridConfig } from '@/types/grid-splitter';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface GridPreviewProps {
  uploadedImageUrl: string | null;
  manualConfig: GridConfig;
  detectedImages: DetectedImage[];
  onImagesChange: (images: DetectedImage[]) => void;
  disabled?: boolean;
}

interface SortableThumbnailProps {
  image: DetectedImage;
  onToggleSelect: (id: string) => void;
  onRemove: (id: string) => void;
  disabled?: boolean;
}

function SortableThumbnail({ image, onToggleSelect, onRemove, disabled }: SortableThumbnailProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative aspect-square rounded-lg border-2 overflow-hidden group",
        "bg-muted/50 transition-all duration-200",
        isDragging && "opacity-50 scale-105 z-50 shadow-lg",
        image.selected ? "border-primary" : "border-border",
        !disabled && "hover:border-primary/50"
      )}
    >
      {/* Thumbnail Image */}
      <img
        src={image.dataUrl}
        alt={`Imagem ${image.order + 1}`}
        className="w-full h-full object-cover"
      />

      {/* Selection Checkbox - Top Left */}
      <div className="absolute top-1.5 left-1.5">
        <Checkbox
          checked={image.selected}
          onCheckedChange={() => onToggleSelect(image.id)}
          disabled={disabled}
          className="h-5 w-5 bg-background/80 backdrop-blur-sm border-2"
        />
      </div>

      {/* Order Badge - Top Right */}
      <Badge
        variant="secondary"
        className="absolute top-1.5 right-1.5 h-5 min-w-[20px] px-1.5 text-xs font-bold bg-background/80 backdrop-blur-sm"
      >
        {image.order + 1}
      </Badge>

      {/* Hover Overlay with Controls */}
      <div className={cn(
        "absolute inset-0 bg-black/40 opacity-0 transition-opacity flex items-center justify-center gap-2",
        !disabled && "group-hover:opacity-100"
      )}>
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="p-2 rounded-full bg-white/20 hover:bg-white/30 cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4 text-white" />
        </div>

        {/* Remove Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onRemove(image.id)}
          disabled={disabled}
          className="h-8 w-8 rounded-full bg-destructive/80 hover:bg-destructive text-white"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Selection Overlay */}
      {!image.selected && (
        <div className="absolute inset-0 bg-background/50 pointer-events-none" />
      )}
    </div>
  );
}

export function GridPreview({
  uploadedImageUrl,
  manualConfig,
  detectedImages,
  onImagesChange,
  disabled = false,
}: GridPreviewProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = detectedImages.findIndex((img) => img.id === active.id);
      const newIndex = detectedImages.findIndex((img) => img.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(detectedImages, oldIndex, newIndex).map((img, idx) => ({
          ...img,
          order: idx,
        }));
        onImagesChange(reordered);
      }
    }
  }, [detectedImages, onImagesChange]);

  const handleToggleSelect = useCallback((id: string) => {
    const updated = detectedImages.map((img) =>
      img.id === id ? { ...img, selected: !img.selected } : img
    );
    onImagesChange(updated);
  }, [detectedImages, onImagesChange]);

  const handleRemove = useCallback((id: string) => {
    const updated = detectedImages
      .filter((img) => img.id !== id)
      .map((img, idx) => ({ ...img, order: idx }));
    onImagesChange(updated);
  }, [detectedImages, onImagesChange]);

  const selectedCount = detectedImages.filter((img) => img.selected).length;
  const totalCount = detectedImages.length;

  // Original image preview with grid overlay
  if (uploadedImageUrl && detectedImages.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Pré-visualização da grelha:</p>
        <div className="relative rounded-lg overflow-hidden border bg-muted/30">
          <img
            src={uploadedImageUrl}
            alt="Imagem original"
            className="w-full max-h-[300px] object-contain"
          />
          {/* Grid Overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${manualConfig.cols}, 1fr)`,
              gridTemplateRows: `repeat(${manualConfig.rows}, 1fr)`,
            }}
          >
            {Array.from({ length: manualConfig.rows * manualConfig.cols }).map((_, idx) => (
              <div
                key={idx}
                className="border border-dashed border-primary/50"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Detected images thumbnails
  if (detectedImages.length > 0) {
    return (
      <div className="space-y-3">
        {/* Counter */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            <strong className="text-foreground">{selectedCount}</strong> de {totalCount} selecionadas
          </span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onImagesChange(detectedImages.map(img => ({ ...img, selected: true })))}
              disabled={disabled || selectedCount === totalCount}
              className="h-7 text-xs"
            >
              Selecionar todas
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onImagesChange(detectedImages.map(img => ({ ...img, selected: false })))}
              disabled={disabled || selectedCount === 0}
              className="h-7 text-xs"
            >
              Desmarcar todas
            </Button>
          </div>
        </div>

        {/* Thumbnails Grid */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={detectedImages.map((img) => img.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-4 gap-2">
              {detectedImages.map((image) => (
                <SortableThumbnail
                  key={image.id}
                  image={image}
                  onToggleSelect={handleToggleSelect}
                  onRemove={handleRemove}
                  disabled={disabled}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <p className="text-xs text-muted-foreground text-center">
          Arraste para reordenar • Clique na checkbox para selecionar
        </p>
      </div>
    );
  }

  return null;
}
