import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Task } from '@/hooks/useTasks';
import { DependencyManager } from './DependencyManager';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMilestones } from '@/hooks/useMilestones';
import { Checkbox } from '@/components/ui/checkbox';
import { useProfiles } from '@/hooks/useProfiles';

interface EditTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task;
  projectId: string;
  availableTasks: Task[];
  onUpdate: (updates: Partial<Task>) => void;
}

export function EditTaskModal({ open, onOpenChange, task, projectId, availableTasks, onUpdate }: EditTaskModalProps) {
  const { milestones, taskMilestones, addTaskToMilestone, removeTaskFromMilestone } = useMilestones(projectId);
  const { profiles } = useProfiles();
  
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState<Task['priority']>(task.priority);
  const [status, setStatus] = useState<Task['status']>(task.status);
  const [dueDate, setDueDate] = useState(task.due_date || '');
  const [startDate, setStartDate] = useState(task.start_date || '');
  const [estimatedHours, setEstimatedHours] = useState(task.estimated_hours?.toString() || '');
  const [assigneeId, setAssigneeId] = useState(task.assignee_id || '');

  // Get milestones associated with this task
  const taskMilestoneIds = taskMilestones
    .filter(tm => tm.task_id === task.id)
    .map(tm => tm.milestone_id);

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || '');
    setPriority(task.priority);
    setStatus(task.status);
    setDueDate(task.due_date || '');
    setStartDate(task.start_date || '');
    setEstimatedHours(task.estimated_hours?.toString() || '');
    setAssigneeId(task.assignee_id || '');
  }, [task]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    onUpdate({
      title,
      description: description || null,
      priority,
      status,
      assignee_id: assigneeId || null,
      due_date: dueDate || null,
      start_date: startDate || null,
      estimated_hours: estimatedHours ? parseInt(estimatedHours) : null,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] backdrop-blur-xl bg-background/95 border-2 max-h-[90vh]" aria-label="Modal de editar tarefa">
        <DialogHeader>
          <DialogTitle>Editar Tarefa</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título*</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nome da tarefa"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva a tarefa..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Task['status'])}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">A Fazer</SelectItem>
                  <SelectItem value="in_progress">Em Progresso</SelectItem>
                  <SelectItem value="review">Revisão</SelectItem>
                  <SelectItem value="done">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Prioridade</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Task['priority'])}>
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignee">Atribuir a</Label>
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger id="assignee">
                <SelectValue placeholder="Selecionar pessoa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Não atribuído</SelectItem>
                {profiles.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.full_name || profile.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Data de Início</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Data Limite</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimatedHours">Horas Estimadas</Label>
            <Input
              id="estimatedHours"
              type="number"
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(e.target.value)}
              placeholder="0"
              min="0"
            />
          </div>

          {/* Dependencies Section */}
          <div className="border-t pt-4">
            <DependencyManager
              taskId={task.id}
              projectId={projectId}
              availableTasks={availableTasks}
              currentStatus={status}
            />
          </div>

          {/* Milestones Association */}
          {milestones.length > 0 && (
            <div className="border-t pt-4 space-y-3">
              <Label>Marcos Associados</Label>
              <div className="space-y-2">
                {milestones.map((milestone) => {
                  const isAssociated = taskMilestoneIds.includes(milestone.id);
                  return (
                    <div key={milestone.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`milestone-${milestone.id}`}
                        checked={isAssociated}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            addTaskToMilestone.mutate({ taskId: task.id, milestoneId: milestone.id });
                          } else {
                            removeTaskFromMilestone.mutate({ taskId: task.id, milestoneId: milestone.id });
                          }
                        }}
                      />
                      <label
                        htmlFor={`milestone-${milestone.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {milestone.title}
                        <span className="text-xs text-muted-foreground ml-2">
                          ({new Date(milestone.due_date).toLocaleDateString('pt-PT')})
                        </span>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!title.trim()}>
              Guardar Alterações
            </Button>
          </DialogFooter>
        </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
