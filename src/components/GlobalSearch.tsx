import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search, FolderOpen, CheckSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { projects } = useProjects();
  const { tasks } = useTasks();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(true);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [onOpenChange]);

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(query.toLowerCase()) ||
    project.description?.toLowerCase().includes(query.toLowerCase())
  );

  const filteredTasks = tasks.filter((task) =>
    task.title.toLowerCase().includes(query.toLowerCase()) ||
    task.description?.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (type: 'project' | 'task', id: string, projectId?: string) => {
    if (type === 'project') {
      navigate(`/projects/${id}`);
    } else {
      navigate(`/projects/${projectId}`);
    }
    onOpenChange(false);
    setQuery('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 backdrop-blur-xl bg-background/95" aria-label="Pesquisa global">
        <div className="flex items-center border-b px-4 py-3">
          <Search className="h-5 w-5 text-muted-foreground mr-2" aria-hidden="true" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar projetos e tarefas... (Cmd+K)"
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
            autoFocus
            aria-label="Campo de pesquisa"
          />
        </div>

        <div className="max-h-[400px] overflow-y-auto p-2">
          {query.trim() === '' ? (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-3 opacity-50" aria-hidden="true" />
              <p>Escreve para pesquisar projetos e tarefas</p>
            </div>
          ) : (
            <>
              {filteredProjects.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-muted-foreground px-2 mb-2">PROJETOS</h3>
                  {filteredProjects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => handleSelect('project', project.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors text-left"
                    >
                      <span className="text-xl" role="img" aria-label="Project icon">{project.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{project.name}</p>
                        {project.description && (
                          <p className="text-xs text-muted-foreground truncate">{project.description}</p>
                        )}
                      </div>
                      <FolderOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                    </button>
                  ))}
                </div>
              )}

              {filteredTasks.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground px-2 mb-2">TAREFAS</h3>
                  {filteredTasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => handleSelect('task', task.id, task.project_id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors text-left"
                    >
                      <CheckSquare className="h-5 w-5 text-primary flex-shrink-0" aria-hidden="true" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{task.title}</p>
                        {task.description && (
                          <p className="text-xs text-muted-foreground truncate">{task.description}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {filteredProjects.length === 0 && filteredTasks.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <p>Nenhum resultado encontrado</p>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
