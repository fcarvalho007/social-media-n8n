import { Milestone } from '@/hooks/useMilestones';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MilestoneTimelineProps {
  milestones: Milestone[];
  taskCounts: Record<string, number>;
}

export function MilestoneTimeline({ milestones, taskCounts }: MilestoneTimelineProps) {
  const sortedMilestones = [...milestones].sort(
    (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  );

  const statusColors = {
    pending: 'bg-warning',
    achieved: 'bg-success',
    missed: 'bg-destructive',
  };

  const statusLabels = {
    pending: 'Pendente',
    achieved: 'Alcançado',
    missed: 'Perdido',
  };

  if (sortedMilestones.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center text-muted-foreground">
          <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Nenhum marco criado</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

        {/* Milestones */}
        <div className="space-y-8">
          {sortedMilestones.map((milestone, index) => {
            const isLast = index === sortedMilestones.length - 1;
            const taskCount = taskCounts[milestone.id] || 0;
            const isOverdue = new Date(milestone.due_date) < new Date() && milestone.status === 'pending';

            return (
              <div key={milestone.id} className="relative pl-16">
                {/* Timeline dot */}
                <div className={cn(
                  'absolute left-3 -translate-x-1/2 w-6 h-6 rounded-full border-4 border-background flex items-center justify-center',
                  statusColors[milestone.status]
                )}>
                  <Target className="h-3 w-3 text-background" />
                </div>

                {/* Content */}
                <div className={cn(
                  'bg-card rounded-lg border p-4 hover:shadow-md transition-all',
                  isOverdue && 'border-destructive/50'
                )}>
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-lg">{milestone.title}</h4>
                    <Badge className={cn(
                      'text-xs',
                      milestone.status === 'achieved' && 'bg-success/10 text-success border-success/20',
                      milestone.status === 'pending' && 'bg-warning/10 text-warning border-warning/20',
                      milestone.status === 'missed' && 'bg-destructive/10 text-destructive border-destructive/20'
                    )}>
                      {statusLabels[milestone.status]}
                    </Badge>
                  </div>

                  {milestone.description && (
                    <p className="text-sm text-muted-foreground mb-3">
                      {milestone.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-sm">
                    <div className={cn(
                      'flex items-center gap-1',
                      isOverdue ? 'text-destructive' : 'text-muted-foreground'
                    )}>
                      <Calendar className="h-4 w-4" />
                      {new Date(milestone.due_date).toLocaleDateString('pt-PT', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </div>

                    <Badge variant="outline" className="text-xs">
                      {taskCount} {taskCount === 1 ? 'tarefa' : 'tarefas'}
                    </Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
