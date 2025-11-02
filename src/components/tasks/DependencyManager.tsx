import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Link2, AlertCircle } from 'lucide-react';
import { useDependencies, TaskDependency } from '@/hooks/useDependencies';
import { Task } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DependencyManagerProps {
  taskId: string;
  projectId: string;
  availableTasks: Task[];
  currentStatus: Task['status'];
}

const dependencyTypeLabels = {
  finish_to_start: { label: 'Terminar-Iniciar', icon: '🔗', description: 'Esta tarefa começa quando a outra termina' },
  start_to_start: { label: 'Iniciar-Iniciar', icon: '🔗', description: 'Esta tarefa começa quando a outra inicia' },
  finish_to_finish: { label: 'Terminar-Terminar', icon: '🔗', description: 'Esta tarefa termina quando a outra termina' },
};

export function DependencyManager({ taskId, projectId, availableTasks, currentStatus }: DependencyManagerProps) {
  const { dependencies, createDependency, deleteDependency, checkCircularDependency } = useDependencies(taskId);
  const [isAddingDependency, setIsAddingDependency] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [selectedType, setSelectedType] = useState<TaskDependency['type']>('finish_to_start');
  const [open, setOpen] = useState(false);

  // Filter out current task and already dependent tasks
  const dependentTaskIds = new Set(dependencies.map(d => d.depends_on_task_id));
  const selectableTasks = availableTasks.filter(
    t => t.id !== taskId && !dependentTaskIds.has(t.id)
  );

  // Check if current task has unfinished dependencies
  const unfinishedDependencies = dependencies.filter(dep => {
    const depTask = availableTasks.find(t => t.id === dep.depends_on_task_id);
    return depTask && depTask.status !== 'done';
  });

  const hasBlockingDependencies = unfinishedDependencies.length > 0;

  const handleAddDependency = async () => {
    if (!selectedTaskId) return;

    try {
      await createDependency.mutateAsync({
        task_id: taskId,
        depends_on_task_id: selectedTaskId,
        type: selectedType,
      });

      setSelectedTaskId('');
      setSelectedType('finish_to_start');
      setIsAddingDependency(false);
    } catch (error) {
      // Error already handled by hook
    }
  };

  const getDependentTaskTitle = (depTaskId: string) => {
    const task = availableTasks.find(t => t.id === depTaskId);
    return task?.title || 'Tarefa não encontrada';
  };

  const getDependentTaskStatus = (depTaskId: string) => {
    const task = availableTasks.find(t => t.id === depTaskId);
    return task?.status || 'todo';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Dependências</Label>
        {!isAddingDependency && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsAddingDependency(true)}
            className="gap-2"
            aria-label="Adicionar dependência"
          >
            <Plus className="h-4 w-4" />
            Adicionar Dependência
          </Button>
        )}
      </div>

      {/* Warning if trying to change status with blocking dependencies */}
      {hasBlockingDependencies && currentStatus !== 'done' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            🔒 Esta tarefa está bloqueada. Aguarda conclusão de {unfinishedDependencies.length} {unfinishedDependencies.length === 1 ? 'tarefa' : 'tarefas'}.
          </AlertDescription>
        </Alert>
      )}

      {/* Add Dependency Form */}
      {isAddingDependency && (
        <div className="space-y-3 p-4 border rounded-lg bg-muted/50 animate-slide-in-right">
          <div className="space-y-2">
            <Label htmlFor="dependency-task">Tarefa Dependente</Label>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between"
                >
                  {selectedTaskId
                    ? getDependentTaskTitle(selectedTaskId)
                    : "Selecionar tarefa..."}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Pesquisar tarefas..." />
                  <CommandEmpty>Nenhuma tarefa encontrada.</CommandEmpty>
                  <CommandGroup className="max-h-64 overflow-auto">
                    {selectableTasks.map((task) => (
                      <CommandItem
                        key={task.id}
                        value={task.id}
                        onSelect={() => {
                          setSelectedTaskId(task.id);
                          setOpen(false);
                        }}
                        className="flex items-center gap-2"
                      >
                        <Badge variant="secondary" className="text-xs">
                          {task.status === 'done' ? '✓' : task.status === 'in_progress' ? '▶' : '○'}
                        </Badge>
                        <span className="flex-1 truncate">{task.title}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dependency-type">Tipo de Dependência</Label>
            <Select value={selectedType} onValueChange={(v) => setSelectedType(v as TaskDependency['type'])}>
              <SelectTrigger id="dependency-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(dependencyTypeLabels).map(([key, { label, icon, description }]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex flex-col">
                      <span>{icon} {label}</span>
                      <span className="text-xs text-muted-foreground">{description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsAddingDependency(false);
                setSelectedTaskId('');
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleAddDependency}
              disabled={!selectedTaskId || createDependency.isPending}
            >
              {createDependency.isPending ? 'A adicionar...' : 'Adicionar'}
            </Button>
          </div>
        </div>
      )}

      {/* Existing Dependencies List */}
      {dependencies.length > 0 && (
        <div className="space-y-2">
          {dependencies.map((dep) => {
            const depTask = availableTasks.find(t => t.id === dep.depends_on_task_id);
            const isCompleted = depTask?.status === 'done';
            
            return (
              <div
                key={dep.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-colors group hover:bg-accent/50",
                  isCompleted ? 'bg-success-light border-success' : 'bg-background'
                )}
              >
                <Link2 className={cn("h-4 w-4 flex-shrink-0", isCompleted ? "text-success" : "text-muted-foreground")} aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-medium truncate", isCompleted && "line-through text-muted-foreground")}>
                    {getDependentTaskTitle(dep.depends_on_task_id)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {dependencyTypeLabels[dep.type].label}
                    {isCompleted && <span className="ml-2 text-success">✓ Concluída</span>}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => deleteDependency.mutate(dep.id)}
                  aria-label="Remover dependência"
                >
                  <X className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {dependencies.length === 0 && !isAddingDependency && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhuma dependência definida
        </p>
      )}
    </div>
  );
}
