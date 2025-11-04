import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Calendar, CheckSquare } from 'lucide-react';
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
  return (
    <Link to={`/projects/${project.id}`}>
      <Card className="group relative overflow-hidden hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/40 h-full hover:scale-[1.02]">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div 
                className="p-3 rounded-xl text-2xl transition-transform group-hover:scale-110 duration-300"
                style={{ backgroundColor: `${project.color}15` }}
              >
                {project.icon}
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg group-hover:text-primary transition-colors duration-300">
                  {project.name}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                  {project.description}
                </p>
              </div>
            </div>
            <Badge 
              variant={
                project.status === 'completed' ? 'default' : 
                project.status === 'active' ? 'secondary' : 
                'outline'
              }
              className="text-xs shrink-0"
            >
              {project.status === 'completed' && '✓ Concluído'}
              {project.status === 'active' && '● Ativo'}
              {project.status === 'on_hold' && '⏸ Pausado'}
              {project.status === 'archived' && '📦 Arquivado'}
            </Badge>
          </div>
          
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground font-medium">Progresso</span>
              <span className="font-bold text-primary">{completionPercentage}%</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-700 ease-out"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center mb-4">
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1 text-muted-foreground">
                <CheckSquare className="h-4 w-4" />
              </div>
              <p className="text-2xl font-bold text-primary">{totalTasks}</p>
              <p className="text-xs text-muted-foreground">Tarefas</p>
            </div>
            
            <div className="space-y-1 border-x border-border/50">
              <div className="flex items-center justify-center gap-1 text-muted-foreground">
                <Users className="h-4 w-4" />
              </div>
              <p className="text-2xl font-bold text-primary">{totalMembers}</p>
              <p className="text-xs text-muted-foreground">Membros</p>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1 text-muted-foreground">
                <Calendar className="h-4 w-4" />
              </div>
              <p className="text-2xl font-bold text-primary">{daysRemaining}</p>
              <p className="text-xs text-muted-foreground">Dias</p>
            </div>
          </div>

          {/* Owner Info */}
          <div className="pt-3 border-t border-border/50">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span>Responsável: ID {project.owner_id.substring(0, 8)}...</span>
            </div>
          </div>
        </CardContent>

        {/* Sutil hover indicator no canto */}
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="flex items-center gap-1 text-primary text-xs font-semibold">
            <span>Ver projeto</span>
            <span>→</span>
          </div>
        </div>
      </Card>
    </Link>
  );
};