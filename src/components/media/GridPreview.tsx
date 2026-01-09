import { useCallback, useRef, useState, useEffect } from 'react';
import { DetectedImage, GridConfig } from '@/types/grid-splitter';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, GripVertical, ZoomIn, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

interface ImageRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

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
  onZoom: (image: DetectedImage) => void;
  disabled?: boolean;
}

function SortableThumbnail({ image, onToggleSelect, onRemove, onZoom, disabled }: SortableThumbnailProps) {
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

  // Calculate aspect ratio for display
  const aspectRatio = image.width && image.height 
    ? (image.width / image.height).toFixed(2) 
    : null;
  
  const is3x4 = aspectRatio && Math.abs(parseFloat(aspectRatio) - 0.75) < 0.02;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        aspectRatio: image.width && image.height ? `${image.width}/${image.height}` : '1/1',
      }}
      className={cn(
        "relative rounded-lg border-2 overflow-hidden group",
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

      {/* Dimensions Badge - Bottom Left */}
      {image.width && image.height && (
        <div className={cn(
          "absolute bottom-1 left-1 text-[9px] px-1 py-0.5 rounded bg-background/90 backdrop-blur-sm",
          is3x4 ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
        )}>
          {image.width}×{image.height}
        </div>
      )}

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

        {/* Zoom Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onZoom(image);
          }}
          className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 text-white"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>

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

  // State for zoomed image
  const [zoomedImage, setZoomedImage] = useState<DetectedImage | null>(null);

  const handleZoom = useCallback((image: DetectedImage) => {
    setZoomedImage(image);
  }, []);

  const handlePrevImage = useCallback(() => {
    if (!zoomedImage) return;
    const currentIndex = detectedImages.findIndex(img => img.id === zoomedImage.id);
    if (currentIndex > 0) {
      setZoomedImage(detectedImages[currentIndex - 1]);
    }
  }, [zoomedImage, detectedImages]);

  const handleNextImage = useCallback(() => {
    if (!zoomedImage) return;
    const currentIndex = detectedImages.findIndex(img => img.id === zoomedImage.id);
    if (currentIndex < detectedImages.length - 1) {
      setZoomedImage(detectedImages[currentIndex + 1]);
    }
  }, [zoomedImage, detectedImages]);

  const zoomedIndex = zoomedImage ? detectedImages.findIndex(img => img.id === zoomedImage.id) : -1;
  const isFirstImage = zoomedIndex === 0;
  const isLastImage = zoomedIndex === detectedImages.length - 1;

  // State for precise image rect calculation
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageRect, setImageRect] = useState<ImageRect | null>(null);

  // Calculate the actual rendered position of the image within the container
  // This accounts for object-contain scaling
  const calculateImageRect = useCallback(() => {
    const container = containerRef.current;
    const img = imageRef.current;
    
    if (!container || !img || !img.naturalWidth || !img.naturalHeight) {
      return;
    }

    const containerW = container.clientWidth;
    const containerH = container.clientHeight;
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const containerRatio = containerW / containerH;

    let renderW: number;
    let renderH: number;
    let offsetX: number;
    let offsetY: number;

    if (imgRatio > containerRatio) {
      // Image is wider than container - fits width, centered vertically
      renderW = containerW;
      renderH = containerW / imgRatio;
      offsetX = 0;
      offsetY = (containerH - renderH) / 2;
    } else {
      // Image is taller than container - fits height, centered horizontally
      renderH = containerH;
      renderW = containerH * imgRatio;
      offsetX = (containerW - renderW) / 2;
      offsetY = 0;
    }

    setImageRect({
      x: offsetX,
      y: offsetY,
      width: renderW,
      height: renderH,
    });
  }, []);

  // Recalculate on image load and window resize
  useEffect(() => {
    calculateImageRect();
    window.addEventListener('resize', calculateImageRect);
    return () => window.removeEventListener('resize', calculateImageRect);
  }, [calculateImageRect, uploadedImageUrl]);

  // Original image preview with PRECISE grid overlay
  if (uploadedImageUrl && detectedImages.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Pré-visualização da grelha:</p>
        <div 
          ref={containerRef}
          className="relative rounded-lg overflow-hidden border bg-muted/30"
          style={{ minHeight: '200px' }}
        >
          <img
            ref={imageRef}
            src={uploadedImageUrl}
            alt="Imagem original"
            className="w-full max-h-[300px] object-contain"
            onLoad={calculateImageRect}
          />
          {/* PRECISE Grid Overlay - positioned exactly over the rendered image */}
          {imageRect && (
            <div
              className="absolute pointer-events-none"
              style={{
                left: imageRect.x,
                top: imageRect.y,
                width: imageRect.width,
                height: imageRect.height,
                display: 'grid',
                gridTemplateColumns: `repeat(${manualConfig.cols}, 1fr)`,
                gridTemplateRows: `repeat(${manualConfig.rows}, 1fr)`,
              }}
            >
              {Array.from({ length: manualConfig.rows * manualConfig.cols }).map((_, idx) => {
                const row = Math.floor(idx / manualConfig.cols);
                const col = idx % manualConfig.cols;
                return (
                  <div
                    key={idx}
                    className="border-2 border-primary/70 bg-primary/5 flex items-center justify-center"
                    style={{ borderStyle: 'solid' }}
                  >
                    <span className="text-xs font-bold text-primary bg-background/80 px-1.5 py-0.5 rounded">
                      {idx + 1}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Dimension info */}
          {imageRef.current && (
            <div className="absolute bottom-2 right-2 text-[10px] bg-background/90 px-2 py-1 rounded text-muted-foreground">
              {imageRef.current.naturalWidth}×{imageRef.current.naturalHeight}px
            </div>
          )}
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
                  onZoom={handleZoom}
                  disabled={disabled}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <p className="text-xs text-muted-foreground text-center">
          Arraste para reordenar • Clique na checkbox para selecionar
        </p>

        {/* Zoom Dialog */}
        <Dialog open={!!zoomedImage} onOpenChange={() => setZoomedImage(null)}>
          <DialogContent className="max-w-4xl p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Imagem {zoomedIndex + 1} de {totalCount}</span>
                {zoomedImage?.width && zoomedImage?.height && (
                  <Badge variant="outline" className="ml-2">
                    {zoomedImage.width}×{zoomedImage.height}
                  </Badge>
                )}
              </DialogTitle>
            </DialogHeader>
            
            <div className="relative flex justify-center items-center bg-muted/30 rounded-lg p-2">
              {zoomedImage && (
                <img 
                  src={zoomedImage.dataUrl} 
                  alt={`Imagem ${zoomedIndex + 1}`}
                  className="max-h-[70vh] w-auto object-contain rounded-lg"
                />
              )}
            </div>
            
            {/* Navigation */}
            <div className="flex justify-between mt-4">
              <Button 
                variant="outline" 
                onClick={handlePrevImage} 
                disabled={isFirstImage}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" /> Anterior
              </Button>
              <Button 
                variant="outline" 
                onClick={handleNextImage} 
                disabled={isLastImage}
                className="gap-2"
              >
                Seguinte <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return null;
}
