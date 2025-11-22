import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Clock, Calendar, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface ProjectStatsCardProps {
  completionPercentage: number;
  completedTasks: number;
  totalTasks: number;
  daysRemaining: number | null;
  dueDate: string | null;
}

export function ProjectStatsCard({
  completionPercentage,
  completedTasks,
  totalTasks,
  daysRemaining,
  dueDate,
}: ProjectStatsCardProps) {
  const [isOpen, setIsOpen] = useState(true);
  const isMobile = useIsMobile();

  const getTimeStatus = () => {
    if (!daysRemaining) return null;
    if (daysRemaining < 0) return { label: 'Atrasado', variant: 'destructive' as const };
    if (daysRemaining <= 7) return { label: 'Urgente', variant: 'secondary' as const };
    return { label: 'No Prazo', variant: 'default' as const };
  };

  const timeStatus = getTimeStatus();

  const content = (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <TrendingUp className="h-4 w-4" />
          <span>Progresso</span>
        </div>
        <div className="space-y-1">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">{completionPercentage}%</span>
          </div>
          <Progress value={completionPercentage} className="h-2" />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4" />
          <span>Tarefas</span>
        </div>
        <div className="space-y-1">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">{completedTasks}</span>
            <span className="text-sm text-muted-foreground">/ {totalTasks}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {totalTasks - completedTasks} por fazer
          </p>
        </div>
      </div>

      {daysRemaining !== null && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Tempo Restante</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{Math.abs(daysRemaining)}</span>
              <span className="text-sm text-muted-foreground">dias</span>
            </div>
            {timeStatus && (
              <Badge variant={timeStatus.variant} className="text-xs">
                {timeStatus.label}
              </Badge>
            )}
          </div>
        </div>
      )}

      {dueDate && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Data Limite</span>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {new Date(dueDate).toLocaleDateString('pt-PT', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className="p-4">
          <CollapsibleTrigger className="flex items-center justify-between w-full">
            <h3 className="text-sm font-semibold">Estatísticas do Projeto</h3>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${
                isOpen ? 'transform rotate-180' : ''
              }`}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4">
            {content}
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  }

  return (
    <Card className="p-4 md:p-6">
      {content}
    </Card>
  );
}
