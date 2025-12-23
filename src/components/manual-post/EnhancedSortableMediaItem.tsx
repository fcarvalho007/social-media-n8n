import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronUp, ChevronDown, X, GripVertical, Image, Video, Sparkles, Grid3x3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MediaSource } from '@/types/media';

type AspectRatioType = '1:1' | '3:4' | '4:5' | '4:3' | '16:9' | '9:16' | 'auto';

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
    case 'auto': return ''; // Let browser determine
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
        "relative rounded-xl overflow-hidden border-2 group",
        aspectClass,
        "transition-all duration-200 ease-out",
        isDragging && "sortable-dragging scale-105 shadow-2xl ring-4 ring-primary/50 z-50",
        isOver && !isDragging && "sortable-item-over border-dashed border-primary bg-primary/5 scale-[1.02]",
        !isDragging && !isOver && "border-border hover:border-primary/50 shadow-sm active:border-primary active:scale-[0.98]",
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
          alt={`Slide ${index + 1} de ${total}`}
          className="w-full h-full object-cover"
          draggable={false}
        />
      )}

      {/* Gradient overlay - always visible on mobile, hover on desktop */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40",
        "sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200",
        isDragging && "opacity-100"
      )} />

      {/* Slide number badge - Compact on mobile */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 translate-y-1 sm:translate-y-2">
        <div className={cn(
          "px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-full bg-primary text-primary-foreground font-bold shadow-lg",
          "text-[10px] sm:text-xs",
          isDragging && "scale-110"
        )}>
          <span className="xs:hidden">{index + 1}</span>
          <span className="hidden xs:inline">Slide {index + 1}</span>
        </div>
      </div>

      {/* Drag handle - ALWAYS visible on mobile, hover on desktop */}
      <div
        {...attributes}
        {...listeners}
        className={cn(
          "absolute top-2 left-2 p-2 sm:p-1.5 rounded-lg bg-background/90 backdrop-blur-sm cursor-grab",
          "sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200",
          "hover:bg-background hover:scale-110 active:cursor-grabbing active:scale-95",
          "touch-none select-none",
          isDragging && "opacity-100 cursor-grabbing",
          disabled && "cursor-not-allowed"
        )}
        aria-label="Arrastar para reordenar"
      >
        <GripVertical className="h-5 w-5 sm:h-4 sm:w-4 text-foreground sm:text-muted-foreground" />
      </div>

      {/* Arrow buttons for reordering - ALWAYS visible on mobile */}
      <div className={cn(
        "absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 sm:gap-1",
        "sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200"
      )}>
        <Button
          variant="secondary"
          size="icon"
          className={cn(
            "h-9 w-9 sm:h-7 sm:w-7 rounded-md bg-background/90 backdrop-blur-sm shadow-md",
            "hover:bg-background hover:scale-110 active:scale-95 transition-all",
            !canMoveUp && "opacity-30 cursor-not-allowed"
          )}
          onClick={(e) => {
            e.stopPropagation();
            if (canMoveUp) onMoveUp();
          }}
          disabled={!canMoveUp || disabled}
          aria-label="Mover para cima"
        >
          <ChevronUp className="h-5 w-5 sm:h-4 sm:w-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className={cn(
            "h-9 w-9 sm:h-7 sm:w-7 rounded-md bg-background/90 backdrop-blur-sm shadow-md",
            "hover:bg-background hover:scale-110 active:scale-95 transition-all",
            !canMoveDown && "opacity-30 cursor-not-allowed"
          )}
          onClick={(e) => {
            e.stopPropagation();
            if (canMoveDown) onMoveDown();
          }}
          disabled={!canMoveDown || disabled}
          aria-label="Mover para baixo"
        >
          <ChevronDown className="h-5 w-5 sm:h-4 sm:w-4" />
        </Button>
      </div>

      {/* Remove button - ALWAYS visible on mobile */}
      <Button
        variant="destructive"
        size="icon"
        className={cn(
          "absolute bottom-2 right-2 h-9 w-9 sm:h-7 sm:w-7 rounded-full shadow-lg",
          "sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200",
          "hover:scale-110 active:scale-95"
        )}
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        disabled={disabled}
        aria-label={`Remover slide ${index + 1}`}
      >
        <X className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
      </Button>

      {/* Type and Source indicator - bottom left */}
      <div className="absolute bottom-2 left-2 flex gap-1">
        <Badge 
          variant="secondary" 
          className="text-[10px] px-1.5 py-0.5 bg-background/80 backdrop-blur-sm"
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
              "text-[10px] px-1.5 py-0.5 backdrop-blur-sm",
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
    <div className="aspect-square w-28 sm:w-32 rounded-xl overflow-hidden shadow-2xl ring-4 ring-primary rotate-3 scale-105">
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
      <div className="absolute inset-0 bg-primary/20" />
    </div>
  );
}
