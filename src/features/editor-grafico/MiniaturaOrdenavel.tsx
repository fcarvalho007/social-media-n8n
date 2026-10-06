import type { ReactNode } from "react";
import { GripVertical } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

interface Props {
  id: string;
  atual: boolean;
  children: ReactNode;
}

export function MiniaturaOrdenavel({ id, atual, children }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({ id });
  return (
    <li ref={setNodeRef} {...listeners} style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("relative shrink-0 touch-manipulation", isDragging && "z-20 opacity-60 ring-2 ring-primary rounded-md", isOver && !isDragging && "before:absolute before:-left-1.5 before:inset-y-1 before:w-0.5 before:rounded-full before:bg-primary")}>
      {children}
      <button type="button" {...attributes} {...listeners} aria-label={`Arrastar slide${atual ? " atual" : ""}`}
        className="absolute left-1 top-1 z-10 flex h-8 w-8 touch-none cursor-grab items-center justify-center rounded-sm border border-border bg-background/90 text-muted-foreground shadow-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing">
        <GripVertical className="h-4 w-4" aria-hidden />
      </button>
    </li>
  );
}