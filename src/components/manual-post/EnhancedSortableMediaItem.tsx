import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronUp, ChevronDown, X, GripVertical, Image, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface EnhancedSortableMediaItemProps {
  id: string;
  url: string;
  index: number;
  total: number;
  isVideo?: boolean;
  disabled?: boolean;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export function EnhancedSortableMediaItem({
  id,
  url,
  index,
  total,
  isVideo = false,
  disabled,
  onRemove,
  onMoveUp,
  onMoveDown,
}: EnhancedSortableMediaItemProps) {
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
        "relative aspect-square rounded-xl overflow-hidden border-2 group",
        "transition-all duration-200 ease-out",
        isDragging && "sortable-dragging opacity-80 scale-105 shadow-2xl ring-2 ring-primary",
        isOver && !isDragging && "sortable-item-over border-dashed border-primary bg-primary/5",
        !isDragging && !isOver && "border-border hover:border-primary/50 shadow-sm",
        disabled && "opacity-50 pointer-events-none"
      )}
    >
      {/* Media content */}
      {isVideo ? (
        <video
          src={url}
          className="w-full h-full object-cover"
          muted
          loop
          autoPlay
          playsInline
          draggable={false}
        />
      ) : (
        <img
          src={url}
          alt={`Media ${index + 1} de ${total}`}
          className="w-full h-full object-cover"
          draggable={false}
        />
      )}

      {/* Gradient overlay */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30",
        "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
        isDragging && "opacity-100"
      )} />

      {/* Drag handle - top left */}
      <div
        {...attributes}
        {...listeners}
        className={cn(
          "absolute top-2 left-2 p-1.5 rounded-lg bg-background/90 backdrop-blur-sm cursor-grab",
          "opacity-0 group-hover:opacity-100 transition-all duration-200",
          "hover:bg-background hover:scale-110 active:cursor-grabbing",
          "touch-none select-none",
          isDragging && "opacity-100 cursor-grabbing",
          disabled && "cursor-not-allowed"
        )}
        aria-label="Arrastar para reordenar"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Position badge - top right */}
      <div className={cn(
        "absolute top-2 right-2 transition-all duration-200",
        isDragging && "scale-110"
      )}>
        <div className="min-w-6 h-6 px-1.5 rounded-md bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-lg">
          [{index + 1}]
        </div>
      </div>

      {/* Arrow buttons for reordering - show on hover */}
      <div className={cn(
        "absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1",
        "opacity-0 group-hover:opacity-100 transition-opacity duration-200"
      )}>
        <Button
          variant="secondary"
          size="icon"
          className={cn(
            "h-7 w-7 rounded-md bg-background/90 backdrop-blur-sm shadow-md",
            "hover:bg-background hover:scale-110 transition-all",
            !canMoveUp && "opacity-30 cursor-not-allowed"
          )}
          onClick={(e) => {
            e.stopPropagation();
            if (canMoveUp) onMoveUp();
          }}
          disabled={!canMoveUp || disabled}
          aria-label="Mover para cima"
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className={cn(
            "h-7 w-7 rounded-md bg-background/90 backdrop-blur-sm shadow-md",
            "hover:bg-background hover:scale-110 transition-all",
            !canMoveDown && "opacity-30 cursor-not-allowed"
          )}
          onClick={(e) => {
            e.stopPropagation();
            if (canMoveDown) onMoveDown();
          }}
          disabled={!canMoveDown || disabled}
          aria-label="Mover para baixo"
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>

      {/* Remove button */}
      <Button
        variant="destructive"
        size="icon"
        className={cn(
          "absolute bottom-2 right-2 h-7 w-7 rounded-full shadow-lg",
          "opacity-0 group-hover:opacity-100 transition-all duration-200",
          "hover:scale-110"
        )}
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        disabled={disabled}
        aria-label={`Remover item ${index + 1}`}
      >
        <X className="h-3.5 w-3.5" />
      </Button>

      {/* Type indicator - bottom left */}
      <div className="absolute bottom-2 left-2">
        <Badge 
          variant="secondary" 
          className="text-[10px] px-1.5 py-0.5 bg-background/80 backdrop-blur-sm"
        >
          {isVideo ? (
            <><Video className="h-2.5 w-2.5 mr-1" />Vídeo</>
          ) : (
            <><Image className="h-2.5 w-2.5 mr-1" />Imagem</>
          )}
        </Badge>
      </div>

      {/* Drag indicator overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-primary/10 border-2 border-primary border-dashed rounded-xl pointer-events-none" />
      )}
    </div>
  );
}

// Drag overlay preview component
export function MediaDragOverlay({ url, isVideo }: { url: string; isVideo?: boolean }) {
  return (
    <div className="aspect-square w-32 rounded-xl overflow-hidden shadow-2xl ring-2 ring-primary rotate-3 scale-105">
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
  );
}
