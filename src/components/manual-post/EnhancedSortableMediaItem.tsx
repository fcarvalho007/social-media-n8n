import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronUp, ChevronDown, X, GripVertical, Image, Video, Sparkles, Grid3x3, ZoomIn } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MediaSource } from '@/types/media';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useState } from 'react';

export type AspectRatioType = '1:1' | '3:4' | '4:5' | '4:3' | '16:9' | '9:16' | 'auto';

interface EnhancedSortableMediaItemProps {
  id: string;
  url: string;
  index: number;
  total: number;
  isVideo?: boolean;
  disabled?: boolean;
  source?: MediaSource;
  aspectRatio?: AspectRatioType;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

// Helper to get aspect ratio CSS class
const getAspectClass = (aspectRatio?: AspectRatioType): string => {
  switch (aspectRatio) {
    case '1:1': return 'aspect-square';
    case '3:4': return 'aspect-[3/4]';
    case '4:5': return 'aspect-[4/5]';
    case '4:3': return 'aspect-[4/3]';
    case '16:9': return 'aspect-video';
    case '9:16': return 'aspect-[9/16]';
    case 'auto': return 'aspect-video'; // Default to 16:9 for auto
    default: return 'aspect-[4/5]'; // Instagram default
  }
};

export function EnhancedSortableMediaItem({
  id,
  url,
  index,
  total,
  isVideo = false,
  disabled,
  source,
  aspectRatio,
  onRemove,
  onMoveUp,
  onMoveDown,
}: EnhancedSortableMediaItemProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  const aspectClass = getAspectClass(aspectRatio);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  const canMoveUp = index > 0;
  const canMoveDown = index < total - 1;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex flex-col rounded-xl overflow-hidden border-2 bg-card",
        "transition-all duration-200 ease-out",
        isDragging && "sortable-dragging scale-105 shadow-2xl ring-4 ring-primary/50 z-50",
        isOver && !isDragging && "sortable-item-over border-dashed border-primary bg-primary/5 scale-[1.02]",
        !isDragging && !isOver && "border-border hover:border-primary/50 shadow-sm",
        disabled && "opacity-50 pointer-events-none"
      )}
    >
      {/* Top Bar - More compact on mobile */}
      <div className="flex items-center justify-between px-1.5 sm:px-2 py-1 sm:py-1.5 bg-muted/50 border-b border-border/50">
        {/* Left: Drag handle + Slide number */}
        <div className="flex items-center gap-1 sm:gap-2">
          <div
            {...attributes}
            {...listeners}
            className={cn(
              "p-0.5 sm:p-1 rounded cursor-grab hover:bg-background/80 active:cursor-grabbing",
              "touch-none select-none transition-colors",
              isDragging && "cursor-grabbing",
              disabled && "cursor-not-allowed"
            )}
            aria-label="Arrastar para reordenar"
          >
            <GripVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
          </div>
          <span className="text-[10px] sm:text-xs font-medium text-foreground">
            {index + 1}/{total}
          </span>
        </div>

        {/* Center: Type and Source badges - hidden on mobile */}
        <div className="hidden sm:flex items-center gap-1">
          <Badge 
            variant="outline" 
            className="text-[10px] px-1.5 py-0 h-5 font-normal"
          >
            {isVideo ? (
              <><Video className="h-2.5 w-2.5 mr-1" />Vídeo</>
            ) : (
              <><Image className="h-2.5 w-2.5 mr-1" />Img</>
            )}
          </Badge>
          {source && source !== 'upload' && (
            <Badge 
              variant={source === 'ai' ? 'default' : 'secondary'}
              className={cn(
                "text-[10px] px-1.5 py-0 h-5 font-normal",
                source === 'ai' 
                  ? "bg-violet-500/90 text-white hover:bg-violet-500" 
                  : "bg-blue-500/90 text-white hover:bg-blue-500"
              )}
            >
              {source === 'ai' ? (
                <><Sparkles className="h-2.5 w-2.5 mr-0.5" />IA</>
              ) : (
                <><Grid3x3 className="h-2.5 w-2.5 mr-0.5" />Grid</>
              )}
            </Badge>
          )}
        </div>

        {/* Right: Remove button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 bg-red-500/15 text-red-500 hover:bg-red-500/25 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          disabled={disabled}
          aria-label={`Remover slide ${index + 1}`}
        >
          <X className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
        </Button>
      </div>

      {/* Clean Media Area - No overlays */}
      <div className={cn("relative overflow-hidden bg-muted/20 group/media", aspectClass)}>
        {isVideo ? (
          <video
            src={url}
            className="w-full h-full object-contain bg-black/5"
            muted
            loop
            autoPlay
            playsInline
            draggable={false}
          />
        ) : (
          <img
            src={url}
            alt={`Slide ${index + 1} de ${total}`}
            className="w-full h-full object-contain"
            draggable={false}
          />
        )}

        {/* Zoom button - visible on hover/always on mobile */}
        <Button
          variant="secondary"
          size="icon"
          className={cn(
            "absolute bottom-2 right-2 h-7 w-7 rounded-full shadow-lg transition-all z-10",
            "bg-background/90 hover:bg-background border",
            "opacity-100 sm:opacity-0 sm:group-hover/media:opacity-100"
          )}
          onClick={(e) => {
            e.stopPropagation();
            setIsZoomed(true);
          }}
          aria-label="Ampliar imagem"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>

        {/* Drag indicator overlay - only when dragging */}
        {isDragging && (
          <div className="absolute inset-0 bg-primary/10 border-2 border-primary border-dashed pointer-events-none" />
        )}
      </div>

      {/* Zoom Modal */}
      <Dialog open={isZoomed} onOpenChange={setIsZoomed}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none overflow-hidden">
          <DialogTitle className="sr-only">Visualizar slide {index + 1}</DialogTitle>
          <div className="relative w-full h-[90vh] flex items-center justify-center p-4">
            {isVideo ? (
              <video
                src={url}
                className="max-w-full max-h-full object-contain"
                controls
                autoPlay
                playsInline
              />
            ) : (
              <img
                src={url}
                alt={`Slide ${index + 1} ampliado`}
                className="max-w-full max-h-full object-contain"
              />
            )}
            {/* Slide indicator */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
              <Badge variant="secondary" className="bg-white/10 backdrop-blur-sm text-white text-sm px-3 py-1">
                Slide {index + 1} de {total}
              </Badge>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bottom Bar - Compact reorder controls */}
      <div className="flex items-center justify-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-1 sm:py-1.5 bg-muted/30 border-t border-border/50">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-6 sm:h-7 w-8 sm:w-auto px-0 sm:px-2 text-xs gap-0.5",
            !canMoveUp && "opacity-40 cursor-not-allowed"
          )}
          onClick={(e) => {
            e.stopPropagation();
            if (canMoveUp) onMoveUp();
          }}
          disabled={!canMoveUp || disabled}
          aria-label="Mover para cima"
        >
          <ChevronUp className="h-4 w-4" />
          <span className="hidden sm:inline text-xs">Subir</span>
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-6 sm:h-7 w-8 sm:w-auto px-0 sm:px-2 text-xs gap-0.5",
            !canMoveDown && "opacity-40 cursor-not-allowed"
          )}
          onClick={(e) => {
            e.stopPropagation();
            if (canMoveDown) onMoveDown();
          }}
          disabled={!canMoveDown || disabled}
          aria-label="Mover para baixo"
        >
          <span className="hidden sm:inline text-xs">Descer</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Drag overlay preview component - simplified
export function MediaDragOverlay({ url, isVideo }: { url: string; isVideo?: boolean }) {
  return (
    <div className="w-28 sm:w-32 rounded-xl overflow-hidden shadow-2xl ring-4 ring-primary rotate-3 scale-105 bg-card">
      <div className="aspect-square">
        {isVideo ? (
          <video
            src={url}
            className="w-full h-full object-cover"
            muted
            draggable={false}
          />
        ) : (
          <img
            src={url}
            alt="A arrastar"
            className="w-full h-full object-cover"
            draggable={false}
          />
        )}
      </div>
      <div className="absolute inset-0 bg-primary/20 pointer-events-none" />
    </div>
  );
}
