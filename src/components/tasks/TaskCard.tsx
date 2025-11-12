import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '@/hooks/useTasks';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GripVertical, Calendar, Trash2, Clock, Lock, Link2, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { EditTaskModal } from './EditTaskModal';
import { InlineEditableText } from '../InlineEditableText';
import { useDependencies } from '@/hooks/useDependencies';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useProfiles } from '@/hooks/useProfiles';
import { UserAvatar } from './UserAvatar';

interface TaskCardProps {
  task: Task;
  projectId: string;
  availableTasks: Task[];
  onUpdate: (updates: Partial<Task>) => void;
  onDelete: () => void;
  isDragging?: boolean;
}

export function TaskCard({ task, projectId, availableTasks, onUpdate, onDelete, isDragging }: TaskCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const { dependencies } = useDependencies(task.id);
  const { profiles } = useProfiles();
  
  const assignedProfile = profiles.find(p => p.id === task.assignee_id);
  
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
  
  // Check for blocking dependencies
  const unfinishedDependencies = dependencies.filter(dep => {
    const depTask = availableTasks.find(t => t.id === dep.depends_on_task_id);
    return depTask && depTask.status !== 'done';
  });
  
  const isBlocked = unfinishedDependencies.length > 0;
  const hasDependencies = dependencies.length > 0;

  return (
    <>
      <TooltipProvider>
      <Card
        ref={setNodeRef}
        style={style}
        className={cn(
          'p-4 cursor-pointer hover:shadow-md transition-all duration-200 border-l-4 group relative',
          priorityColors[task.priority],
          (isDragging || isSortableDragging) && 'opacity-50 rotate-2 scale-105 shadow-lg',
          isBlocked && 'opacity-75'
        )}
        onClick={() => setEditOpen(true)}
      >
        {/* Blocked/Dependencies indicators */}
        {(isBlocked || hasDependencies) && (
          <div className="absolute top-2 right-2 flex gap-1">
            {isBlocked && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="bg-destructive text-destructive-foreground rounded-full p-1">
                    <Lock className="h-3 w-3" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">🔒 Bloqueada - Aguarda {unfinishedDependencies.length} {unfinishedDependencies.length === 1 ? 'tarefa' : 'tarefas'}</p>
                </TooltipContent>
              </Tooltip>
            )}
            {hasDependencies && !isBlocked && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="bg-muted text-muted-foreground rounded-full p-1">
                    <Link2 className="h-3 w-3" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">🔗 {dependencies.length} {dependencies.length === 1 ? 'dependência' : 'dependências'}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        )}
      
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
            <InlineEditableText
              value={task.title}
              onSave={(newTitle) => onUpdate({ title: newTitle })}
              className="font-semibold text-sm mb-2 group-hover:text-primary transition-colors block"
              inputClassName="font-semibold text-sm"
              as="h4"
            />
            
            {task.description && (
              <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                {task.description}
              </p>
            )}

            <div className="flex flex-wrap gap-2 items-center mb-3">
              {assignedProfile ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/5 rounded-md border border-primary/20 hover:bg-primary/10 transition-colors">
                      <UserAvatar profile={assignedProfile} size="sm" />
                      <span className="text-xs font-medium text-foreground">
                        {assignedProfile.full_name || assignedProfile.email.split('@')[0]}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Atribuído a {assignedProfile.full_name || assignedProfile.email}</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <div className="flex items-center gap-1 px-2 py-1 bg-muted/50 rounded-md border border-border/50">
                  <User className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Não atribuído</span>
                </div>
              )}
            </div>

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
      </TooltipProvider>

      <EditTaskModal
        open={editOpen}
        onOpenChange={setEditOpen}
        task={task}
        projectId={projectId}
        availableTasks={availableTasks}
        onUpdate={onUpdate}
      />
    </>
  );
}
