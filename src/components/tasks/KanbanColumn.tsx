import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Task } from '@/hooks/useTasks';
import { TaskCard } from './TaskCard';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  id: string;
  title: string;
  status: Task['status'];
  tasks: Task[];
  projectId: string;
  allTasks: Task[];
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
  onCreateTask?: () => void;
}

export function KanbanColumn({ id, title, status, tasks, projectId, allTasks, onUpdateTask, onDeleteTask, onCreateTask }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  
  const statusColors = {
    todo: 'border-l-status-todo',
    in_progress: 'border-l-status-in-progress',
    review: 'border-l-status-review',
    done: 'border-l-status-done',
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col bg-card rounded-lg border-2 border-l-4 p-4 transition-all duration-200',
        statusColors[status],
        isOver && 'bg-accent/50 border-primary'
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-sm text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{tasks.length} tarefas</p>
        </div>
        {onCreateTask && (
          <Button variant="ghost" size="icon" onClick={onCreateTask} className="h-8 w-8">
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-3 overflow-y-auto min-h-[400px]">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              projectId={projectId}
              availableTasks={allTasks}
              onUpdate={(updates) => onUpdateTask(task.id, updates)}
              onDelete={() => onDeleteTask(task.id)}
            />
          ))}
          {tasks.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8">
              Sem tarefas
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
