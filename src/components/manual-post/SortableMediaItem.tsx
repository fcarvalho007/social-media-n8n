import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SortableMediaItemProps {
  id: string;
  url: string;
  index: number;
  total: number;
  disabled?: boolean;
  onRemove: (index: number) => void;
}

export function SortableMediaItem({ id, url, index, total, disabled, onRemove }: SortableMediaItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative aspect-square rounded-lg overflow-hidden border-2 group",
        isDragging ? "border-primary shadow-lg z-50 opacity-90" : "border-border",
        disabled && "opacity-50"
      )}
    >
      <img
        src={url}
        alt={`Imagem ${index + 1} de ${total}`}
        className="w-full h-full object-cover"
        draggable={false}
      />
      
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className={cn(
          "absolute top-1 left-1 p-1.5 rounded-md bg-background/90 backdrop-blur-sm cursor-move",
          "opacity-0 group-hover:opacity-100 transition-opacity",
          "touch-none select-none",
          disabled && "cursor-not-allowed"
        )}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Remove button */}
      <button
        type="button"
        onClick={() => onRemove(index)}
        disabled={disabled}
        aria-label={`Remover imagem ${index + 1}`}
        className={cn(
          "absolute top-1 right-1 p-1.5 rounded-full bg-destructive text-destructive-foreground",
          "opacity-0 group-hover:opacity-100 transition-opacity",
          "hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        <X className="h-3 w-3" />
      </button>

      {/* Position badge */}
      <div className="absolute bottom-1 left-1 bg-background/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-medium">
        {index + 1}/{total}
      </div>

      {/* Drag indicator */}
      {isDragging && (
        <div className="absolute inset-0 bg-primary/20 border-2 border-primary border-dashed rounded-lg" />
      )}
    </div>
  );
}
