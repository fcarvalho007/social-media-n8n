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
        className="p-6 transition-all duration-200 hover:shadow-lg hover:-translate-y-1 cursor-pointer border-l-4"
        style={{ borderLeftColor: project.color }}
      >
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{project.icon}</span>
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
            <Progress value={completionPercentage} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {completionPercentage}% concluído
            </p>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{totalTasks} tarefas</span>
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {totalMembers}
            </span>
            {daysRemaining !== null && (
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {daysRemaining} dias
              </span>
            )}
          </div>
        </div>

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
          <span className="text-primary font-medium">Ver Projeto</span>
        </div>
      </Card>
    </Link>
  );
};