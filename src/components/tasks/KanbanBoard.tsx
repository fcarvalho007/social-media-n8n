import { useState } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Task } from '@/hooks/useTasks';
import { KanbanColumn } from './KanbanColumn';
import { TaskCard } from './TaskCard';

interface KanbanBoardProps {
  tasks: Task[];
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
  onCreateTask: () => void;
}

export function KanbanBoard({ tasks, onUpdateTask, onDeleteTask, onCreateTask }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const columns = [
    { id: 'todo', title: 'A Fazer', status: 'todo' as const },
    { id: 'in_progress', title: 'Em Progresso', status: 'in_progress' as const },
    { id: 'review', title: 'Revisão', status: 'review' as const },
    { id: 'done', title: 'Concluído', status: 'done' as const },
  ];

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;
    
    const taskId = active.id as string;
    const newStatus = over.id as Task['status'];
    
    if (newStatus !== activeTask?.status) {
      onUpdateTask(taskId, { status: newStatus });
    }
    
    setActiveTask(null);
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 min-h-[600px]">
        {columns.map((column) => {
          const columnTasks = tasks.filter((task) => task.status === column.status);
          return (
            <KanbanColumn
              key={column.id}
              id={column.id}
              title={column.title}
              status={column.status}
              tasks={columnTasks}
              onUpdateTask={onUpdateTask}
              onDeleteTask={onDeleteTask}
              onCreateTask={column.status === 'todo' ? onCreateTask : undefined}
            />
          );
        })}
      </div>

      <DragOverlay>
        {activeTask && (
          <div className="opacity-80 rotate-3 scale-105">
            <TaskCard task={activeTask} onUpdate={() => {}} onDelete={() => {}} isDragging />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
