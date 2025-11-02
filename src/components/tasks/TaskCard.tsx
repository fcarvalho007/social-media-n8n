import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '@/hooks/useTasks';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GripVertical, Calendar, Trash2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { EditTaskModal } from './EditTaskModal';

interface TaskCardProps {
  task: Task;
  onUpdate: (updates: Partial<Task>) => void;
  onDelete: () => void;
  isDragging?: boolean;
}

export function TaskCard({ task, onUpdate, onDelete, isDragging }: TaskCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priorityColors = {
    low: 'border-l-priority-low',
    medium: 'border-l-priority-medium',
    high: 'border-l-priority-high',
    urgent: 'border-l-priority-urgent',
  };

  const priorityLabels = {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    urgent: 'Urgente',
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';

  return (
    <>
      <Card
        ref={setNodeRef}
        style={style}
        className={cn(
          'p-4 cursor-pointer hover:shadow-md transition-all duration-200 border-l-4 group',
          priorityColors[task.priority],
          (isDragging || isSortableDragging) && 'opacity-50 rotate-2 scale-105 shadow-lg'
        )}
        onClick={() => setEditOpen(true)}
      >
        <div className="flex items-start gap-2">
          <button
            className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm mb-2 group-hover:text-primary transition-colors">
              {task.title}
            </h4>
            
            {task.description && (
              <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                {task.description}
              </p>
            )}

            <div className="flex flex-wrap gap-2 items-center">
              <Badge variant={task.priority === 'urgent' ? 'destructive' : 'secondary'} className="text-xs">
                {priorityLabels[task.priority]}
              </Badge>
              
              {task.due_date && (
                <div className={cn(
                  'flex items-center gap-1 text-xs',
                  isOverdue ? 'text-destructive' : 'text-muted-foreground'
                )}>
                  <Calendar className="h-3 w-3" />
                  {new Date(task.due_date).toLocaleDateString('pt-PT')}
                </div>
              )}

              {task.estimated_hours && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {task.estimated_hours}h
                </div>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </Card>

      <EditTaskModal
        open={editOpen}
        onOpenChange={setEditOpen}
        task={task}
        onUpdate={onUpdate}
      />
    </>
  );
}
