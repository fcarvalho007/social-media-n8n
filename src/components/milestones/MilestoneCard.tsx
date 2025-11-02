import { Milestone } from '@/hooks/useMilestones';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Edit, Trash2, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MilestoneCardProps {
  milestone: Milestone;
  taskCount: number;
  onEdit: () => void;
  onDelete: () => void;
}

export function MilestoneCard({ milestone, taskCount, onEdit, onDelete }: MilestoneCardProps) {
  const isOverdue = new Date(milestone.due_date) < new Date() && milestone.status === 'pending';
  const daysRemaining = Math.ceil((new Date(milestone.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  const statusColors = {
    pending: 'bg-warning/10 text-warning border-warning/20',
    achieved: 'bg-success/10 text-success border-success/20',
    missed: 'bg-destructive/10 text-destructive border-destructive/20',
  };

  const statusLabels = {
    pending: 'Pendente',
    achieved: 'Alcançado',
    missed: 'Perdido',
  };

  return (
    <Card className={cn(
      'p-6 hover:shadow-md transition-all duration-200 group relative',
      isOverdue && 'border-destructive/50'
    )}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="p-2 rounded-lg bg-primary/10">
            <Target className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1">{milestone.title}</h3>
            {milestone.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {milestone.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" onClick={onEdit}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Badge className={statusColors[milestone.status]}>
          {statusLabels[milestone.status]}
        </Badge>
        
        <div className={cn(
          'flex items-center gap-1 text-sm',
          isOverdue ? 'text-destructive' : 'text-muted-foreground'
        )}>
          <Calendar className="h-3 w-3" />
          {new Date(milestone.due_date).toLocaleDateString('pt-PT')}
          {milestone.status === 'pending' && (
            <span className="ml-1">
              ({daysRemaining > 0 ? `${daysRemaining}d` : 'Vencido'})
            </span>
          )}
        </div>

        <Badge variant="outline" className="text-xs">
          {taskCount} {taskCount === 1 ? 'tarefa' : 'tarefas'}
        </Badge>
      </div>
    </Card>
  );
}
