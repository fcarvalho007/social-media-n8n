import type { ReactNode } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ItemStoryboard { id: string; papel: ReactNode; titulo: string }

function Linha({ item, i, sel, onSel }: { item: ItemStoryboard; i: number; sel: boolean; onSel: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn("shrink-0 lg:shrink", isDragging && "relative z-10 opacity-80")}>
      <div className={cn("mc-trans flex min-h-14 w-48 items-stretch rounded-[var(--mc-r-md)] border lg:w-full", sel ? "border-primary bg-primary/10" : "border-input hover:border-muted-foreground")}>
        <button type="button" {...attributes} {...listeners} aria-label={`Arrastar slide ${i + 1} para mudar a ordem`}
          className="flex w-7 shrink-0 cursor-grab touch-none items-center justify-center text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing">
          <GripVertical className="h-4 w-4" aria-hidden />
        </button>
        <button type="button" aria-current={sel ? "true" : undefined} onClick={onSel}
          className="flex min-w-0 flex-1 items-start gap-2 py-3 pr-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="w-5 shrink-0 text-xs tabular-nums text-muted-foreground">{i + 1}</span>
          <span className="min-w-0">
            <span className="block text-xs text-muted-foreground">{item.papel}</span>
            <span className="block truncate text-sm">{item.titulo || "Sem título"}</span>
          </span>
        </button>
      </div>
    </li>
  );
}

/** Drag-and-drop slide list (pointer + keyboard). Reports moves as narrative indices. */
export function StoryboardOrdenavel({ itens, iSel, onSel, onMover, rodape }: { itens: ItemStoryboard[]; iSel: number; onSel: (i: number) => void; onMover: (de: number, para: number) => void; rodape?: ReactNode }) {
  const sensores = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const fim = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const de = itens.findIndex((x) => x.id === e.active.id);
    const para = itens.findIndex((x) => x.id === e.over!.id);
    if (de >= 0 && para >= 0) onMover(de, para);
  };
  return (
    <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={fim}>
      <SortableContext items={itens.map((x) => x.id)} strategy={verticalListSortingStrategy}>
        <ol className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible" aria-label="Storyboard · arrasta para mudar a ordem">
          {itens.map((it, i) => <Linha key={it.id} item={it} i={i} sel={i === iSel} onSel={() => onSel(i)} />)}
          {rodape}
        </ol>
      </SortableContext>
    </DndContext>
  );
}
