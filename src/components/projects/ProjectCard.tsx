import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, Calendar } from 'lucide-react';
import { Project } from '@/hooks/useProjects';

interface ProjectCardProps {
  project: Project;
  completionPercentage: number;
  totalTasks: number;
  totalMembers: number;
  daysRemaining: number | null;
}

export const ProjectCard = ({
  project,
  completionPercentage,
  totalTasks,
  totalMembers,
  daysRemaining,
}: ProjectCardProps) => {
  const statusLabels = {
    active: 'Ativo',
    on_hold: 'Em Pausa',
    completed: 'Concluído',
    archived: 'Arquivado',
  };

  const statusColors = {
    active: 'bg-[hsl(var(--status-in-progress))]',
    on_hold: 'bg-[hsl(var(--status-review))]',
    completed: 'bg-[hsl(var(--status-done))]',
    archived: 'bg-[hsl(var(--muted))]',
  };

  return (
    <Link to={`/projects/${project.id}`} className="group block">
      <Card 
        className="relative p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 cursor-pointer border-l-4 overflow-hidden active:scale-98"
        style={{ borderLeftColor: project.color }}
      >
        <div className="space-y-4 relative z-10">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl" role="img" aria-label="Project icon">{project.icon}</span>
              <div>
                <h3 className="font-semibold text-lg truncate max-w-[200px]">
                  {project.name}
                </h3>
              </div>
            </div>
            <Badge 
              className={`${statusColors[project.status]} text-white`}
            >
              {statusLabels[project.status]}
            </Badge>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium text-foreground">Progresso</span>
              <span className="text-xs font-bold text-primary">{completionPercentage}%</span>
            </div>
            <Progress value={completionPercentage} className="h-2" />
          </div>

          {/* Stats - Quick Stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t border-border/50">
            <span className="flex items-center gap-1.5" title={`${totalTasks} tarefas`}>
              <span className="font-semibold text-foreground">{totalTasks}</span>
              tarefas
            </span>
            <span className="flex items-center gap-1.5" title={`${totalMembers} membros`}>
              <Users className="h-4 w-4" aria-hidden="true" />
              <span className="font-semibold text-foreground">{totalMembers}</span>
            </span>
            {daysRemaining !== null && (
              <span 
                className={`flex items-center gap-1.5 ${daysRemaining < 7 ? 'text-warning' : ''}`}
                title={`${daysRemaining} dias restantes`}
              >
                <Calendar className="h-4 w-4" aria-hidden="true" />
                <span className="font-semibold">{daysRemaining}</span> dias
              </span>
            )}
          </div>
        </div>

        {/* Hover Overlay - Improved */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-lg flex items-center justify-center backdrop-blur-[2px]">
          <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
            <span className="text-primary font-bold text-lg px-6 py-2 bg-background/90 rounded-full shadow-lg">
              Ver Projeto →
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
};