import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { useMilestones } from '@/hooks/useMilestones';
import { useDependencies } from '@/hooks/useDependencies';
import { ProjectTemplate } from '@/hooks/useTemplates';
import { TemplateSelector } from './TemplateSelector';
import { addDays, format } from 'date-fns';

interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
}

const PROJECT_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#64748b', // slate
];

const PROJECT_ICONS = ['📁', '🚀', '💼', '🎯', '📊', '🔧', '💡', '🎨', '📱', '🏆', '🌟', '⚡'];

export const CreateProjectModal = ({ open, onClose }: CreateProjectModalProps) => {
  const { createProject } = useProjects();
  const { createTask } = useTasks();
  const { createMilestone } = useMilestones();
  const { createDependency } = useDependencies();
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: PROJECT_COLORS[0],
    icon: PROJECT_ICONS[0],
    status: 'active' as const,
    start_date: '',
    due_date: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const project = await createProject.mutateAsync({
      ...formData,
      start_date: formData.start_date || format(new Date(), 'yyyy-MM-dd'),
      due_date: formData.due_date || null,
    });

    // Apply template if selected
    if (selectedTemplate && project) {
      const baseDate = new Date(project.start_date || new Date());
      const createdTaskIds: string[] = [];

      // Create tasks from template
      for (const taskTemplate of selectedTemplate.structure.tasks) {
        const taskStartDate = format(addDays(baseDate, taskTemplate.relativeStart), 'yyyy-MM-dd');
        const taskDueDate = format(
          addDays(baseDate, taskTemplate.relativeStart + taskTemplate.relativeDuration),
          'yyyy-MM-dd'
        );

        try {
          const result = await new Promise<any>((resolve, reject) => {
            createTask.mutate(
              {
                project_id: project.id,
                title: taskTemplate.title,
                description: taskTemplate.description,
                priority: taskTemplate.priority,
                estimated_hours: taskTemplate.estimated_hours,
                start_date: taskStartDate,
                due_date: taskDueDate,
                status: 'todo',
                assignee_id: null,
              },
              {
                onSuccess: (data) => resolve(data),
                onError: (error) => reject(error),
              }
            );
          });
          createdTaskIds.push(result.id);
        } catch (error) {
          console.error('Error creating task:', error);
        }
      }

      // Create milestones from template
      for (const milestoneTemplate of selectedTemplate.structure.milestones) {
        const milestoneDueDate = format(
          addDays(baseDate, milestoneTemplate.relativeDueDate),
          'yyyy-MM-dd'
        );

        createMilestone.mutate({
          project_id: project.id,
          title: milestoneTemplate.title,
          description: milestoneTemplate.description,
          due_date: milestoneDueDate,
          status: 'pending',
        });
      }

      // Create dependencies from template
      for (const depTemplate of selectedTemplate.structure.dependencies) {
        if (
          createdTaskIds[depTemplate.taskIndex] &&
          createdTaskIds[depTemplate.dependsOnTaskIndex]
        ) {
          createDependency.mutate({
            task_id: createdTaskIds[depTemplate.taskIndex],
            depends_on_task_id: createdTaskIds[depTemplate.dependsOnTaskIndex],
            type: depTemplate.type,
          });
        }
      }
    }

    onClose();
    setFormData({
      name: '',
      description: '',
      color: PROJECT_COLORS[0],
      icon: PROJECT_ICONS[0],
      status: 'active',
      start_date: '',
      due_date: '',
    });
    setSelectedTemplate(null);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto backdrop-blur-xl bg-background/95 border-2" aria-label="Modal de criar projeto">
        <DialogHeader>
          <DialogTitle>Criar Projeto</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nome */}
          <div>
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nome do projeto"
              required
              maxLength={100}
            />
          </div>

          {/* Descrição */}
          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descreve o teu projeto..."
              rows={4}
            />
          </div>

          {/* Cor e Ícone - Stack on mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Cor</Label>
              <div className="flex gap-2 flex-wrap mt-2">
                {PROJECT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 transition-all ${
                      formData.color === color ? 'border-primary scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                    aria-label={`Selecionar cor ${color}`}
                  />
                ))}
              </div>
            </div>

            <div>
              <Label>Ícone</Label>
              <div className="flex gap-1.5 sm:gap-2 flex-wrap mt-2 max-h-24 overflow-y-auto">
                {PROJECT_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    className={`text-xl sm:text-2xl p-1.5 sm:p-2 rounded-lg border-2 transition-all ${
                      formData.icon === icon ? 'border-primary bg-primary/10' : 'border-transparent hover:bg-accent'
                    }`}
                    onClick={() => setFormData({ ...formData, icon })}
                    aria-label={`Selecionar ícone ${icon}`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Status */}
          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="on_hold">Em Pausa</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
                <SelectItem value="archived">Arquivado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Datas - Stack on mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_date">Data de Início</Label>
              <Input
                id="start_date"
                type="date"
                className="w-full"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="due_date">Data de Entrega</Label>
              <Input
                id="due_date"
                type="date"
                className="w-full"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
          </div>

          {/* Template Selector */}
          <TemplateSelector
            selectedTemplate={selectedTemplate}
            onSelect={setSelectedTemplate}
          />

          {/* Buttons */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createProject.isPending}>
              {createProject.isPending ? 'A criar...' : 'Criar Projeto'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};