import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useTemplates } from '@/hooks/useTemplates';
import { useTasks } from '@/hooks/useTasks';
import { useMilestones } from '@/hooks/useMilestones';
import { useDependencies } from '@/hooks/useDependencies';
import { toast } from 'sonner';
import { differenceInDays } from 'date-fns';

interface CreateTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectStartDate: string | null;
}

export const CreateTemplateModal = ({ open, onOpenChange, projectId, projectStartDate }: CreateTemplateModalProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  
  const { tasks } = useTasks(projectId);
  const { milestones } = useMilestones(projectId);
  const { dependencies } = useDependencies(projectId);
  const { createTemplate } = useTemplates();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    if (tasks.length === 0) {
      toast.error('O projeto precisa ter pelo menos uma tarefa');
      return;
    }

    const baseDate = projectStartDate ? new Date(projectStartDate) : new Date();

    // Convert tasks to relative structure
    const templateTasks = tasks.map((task) => {
      const relativeStart = task.start_date 
        ? differenceInDays(new Date(task.start_date), baseDate)
        : 0;
      
      const relativeDuration = task.start_date && task.due_date
        ? differenceInDays(new Date(task.due_date), new Date(task.start_date))
        : 1;

      return {
        title: task.title,
        description: task.description,
        priority: task.priority,
        estimated_hours: task.estimated_hours,
        relativeStart,
        relativeDuration,
      };
    });

    // Convert milestones to relative structure
    const templateMilestones = milestones.map((milestone) => ({
      title: milestone.title,
      description: milestone.description,
      relativeDueDate: milestone.due_date
        ? differenceInDays(new Date(milestone.due_date), baseDate)
        : 0,
    }));

    // Convert dependencies to index-based references
    const templateDependencies = dependencies.map((dep) => {
      const taskIndex = tasks.findIndex(t => t.id === dep.task_id);
      const dependsOnTaskIndex = tasks.findIndex(t => t.id === dep.depends_on_task_id);
      
      return {
        taskIndex,
        dependsOnTaskIndex,
        type: dep.type,
      };
    }).filter(dep => dep.taskIndex !== -1 && dep.dependsOnTaskIndex !== -1);

    const template = {
      name,
      description: description || null,
      is_public: isPublic,
      structure: {
        tasks: templateTasks,
        milestones: templateMilestones,
        dependencies: templateDependencies,
      },
    };

    createTemplate.mutate(template, {
      onSuccess: () => {
        onOpenChange(false);
        setName('');
        setDescription('');
        setIsPublic(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Criar Template</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome do Template *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Setup Inicial de Projeto"
            />
          </div>

          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o propósito deste template..."
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="public">Template Público</Label>
              <p className="text-xs text-muted-foreground">
                Permitir que outros utilizadores vejam e usem este template
              </p>
            </div>
            <Switch
              id="public"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>

          <div className="pt-2 text-sm text-muted-foreground">
            <p className="mb-1">O template incluirá:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>{tasks.length} tarefas</li>
              <li>{milestones.length} marcos</li>
              <li>{dependencies.length} dependências</li>
            </ul>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createTemplate.isPending}>
              {createTemplate.isPending ? 'A criar...' : 'Criar Template'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
