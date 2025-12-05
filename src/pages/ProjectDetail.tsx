import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Plus } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { KanbanBoard } from '@/components/tasks/KanbanBoard';
import { CreateTaskModal } from '@/components/tasks/CreateTaskModal';
import { InlineEditableText } from '@/components/InlineEditableText';
import { InlineEditableSelect } from '@/components/InlineEditableSelect';
import { MilestonesList } from '@/components/milestones/MilestonesList';
import { TimelineView } from '@/components/projects/TimelineView';
import { CreateTemplateModal } from '@/components/projects/CreateTemplateModal';
import { EditProjectModal } from '@/components/projects/EditProjectModal';
import { ProjectActionsMenu } from '@/components/projects/ProjectActionsMenu';
import { ProjectStatsCard } from '@/components/projects/ProjectStatsCard';
import { useIsMobile } from '@/hooks/use-mobile';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { projects, updateProject, deleteProject } = useProjects();
  const { tasks, createTask, updateTask, deleteTask } = useTasks(id);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [createTemplateOpen, setCreateTemplateOpen] = useState(false);
  const [editProjectOpen, setEditProjectOpen] = useState(false);

  const project = projects.find((p) => p.id === id);

  if (!project) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold mb-4">Projeto não encontrado</h2>
        <Button onClick={() => navigate('/projects')}>
          Voltar aos Projetos
        </Button>
      </div>
    );
  }

  const handleDelete = async () => {
    await deleteProject.mutateAsync(project.id);
    navigate('/projects');
  };

  const statusLabels = {
    active: 'Ativo',
    on_hold: 'Em Pausa',
    completed: 'Concluído',
    archived: 'Arquivado',
  };

  const completedTasks = tasks.filter((t) => t.status === 'done').length;
  const completionPercentage = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  const daysRemaining = project.due_date 
    ? Math.ceil((new Date(project.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="space-y-3 md:space-y-4 lg:space-y-6">
      {/* Skip to main content for accessibility */}
      <a href="#main-content" className="skip-to-content">
        Ir para o conteúdo principal
      </a>

      <div id="main-content" className="space-y-3 md:space-y-4 lg:space-y-6">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => navigate('/projects')} 
          className="gap-2 min-h-[44px] active:scale-95 transition-transform -ml-2"
          aria-label="Voltar aos projetos"
        >
          <ArrowLeft className="h-4 w-4" />
          {!isMobile && <span>Voltar</span>}
        </Button>

        {/* Header - Mobile optimized */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-3 md:gap-4">
          <div className="flex items-start gap-3 md:gap-4 w-full md:w-auto">
            <span className="text-4xl md:text-5xl flex-shrink-0" role="img" aria-label="Ícone do projeto">
              {project.icon}
            </span>
            <div className="min-w-0 flex-1">
              <InlineEditableText
                value={project.name}
                onSave={(newName) => updateProject.mutate({ id: project.id, name: newName })}
                className="text-2xl md:text-3xl font-bold block"
                inputClassName="text-2xl md:text-3xl font-bold"
                as="h1"
              />
              <div className="mt-2">
                <InlineEditableSelect
                  value={project.status}
                  options={[
                    { value: 'active', label: 'Ativo' },
                    { value: 'on_hold', label: 'Em Pausa' },
                    { value: 'completed', label: 'Concluído' },
                    { value: 'archived', label: 'Arquivado' },
                  ]}
                  onSave={(newStatus) => updateProject.mutate({ id: project.id, status: newStatus })}
                />
              </div>
            </div>
          </div>
          
          <ProjectActionsMenu
            onSaveTemplate={() => setCreateTemplateOpen(true)}
            onEdit={() => setEditProjectOpen(true)}
            onArchive={() => {
              updateProject.mutate({ id: project.id, status: 'archived' });
            }}
            onDelete={() => setDeleteDialogOpen(true)}
          />
        </div>

        {/* Stats Card */}
        <ProjectStatsCard
          completionPercentage={completionPercentage}
          completedTasks={completedTasks}
          totalTasks={tasks.length}
          daysRemaining={daysRemaining}
          dueDate={project.due_date}
        />

        {/* Tabs - Mobile optimized with horizontal scroll */}
        <Tabs defaultValue="tasks" className="space-y-4 md:space-y-6">
          <div className="relative">
            <TabsList className="w-full justify-start overflow-x-auto scrollbar-hide bg-muted/50">
              <TabsTrigger 
                value="tasks" 
                className="min-h-[48px] px-4 md:px-6 active:scale-95 transition-transform whitespace-nowrap touch-target"
              >
                Tarefas
              </TabsTrigger>
              <TabsTrigger 
                value="milestones" 
                className="min-h-[48px] px-4 md:px-6 active:scale-95 transition-transform whitespace-nowrap touch-target"
              >
                Marcos
              </TabsTrigger>
              <TabsTrigger 
                value="timeline" 
                className="min-h-[48px] px-4 md:px-6 active:scale-95 transition-transform whitespace-nowrap touch-target"
              >
                Timeline
              </TabsTrigger>
              <TabsTrigger 
                value="activity" 
                className="min-h-[48px] px-4 md:px-6 active:scale-95 transition-transform whitespace-nowrap touch-target"
              >
                Atividade
              </TabsTrigger>
            </TabsList>
            {/* Scroll indicator gradient */}
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none md:hidden" />
          </div>

          <TabsContent value="tasks" className="space-y-4">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
              <div>
                <h2 className="text-xl md:text-2xl font-bold">Tarefas</h2>
                <p className="text-sm text-muted-foreground">Gerir tarefas com quadro Kanban</p>
              </div>
              <Button 
                onClick={() => setCreateTaskOpen(true)} 
                className="gap-2 min-h-[44px] active:scale-95 transition-transform w-full md:w-auto"
              >
                <Plus className="h-5 w-5" />
                <span className="md:hidden">Nova Tarefa</span>
                <span className="hidden md:inline">Nova Tarefa</span>
              </Button>
            </div>
            
            <KanbanBoard
              tasks={tasks}
              projectId={id!}
              onUpdateTask={(taskId, updates) => updateTask.mutate({ id: taskId, ...updates })}
              onDeleteTask={(taskId) => deleteTask.mutate(taskId)}
              onCreateTask={(task) => createTask.mutate(task)}
            />
          </TabsContent>

          <TabsContent value="milestones">
            <MilestonesList projectId={id!} />
          </TabsContent>

          <TabsContent value="timeline">
            <TimelineView tasks={tasks} />
          </TabsContent>

          <TabsContent value="activity">
            <Card className="p-6">
              <div className="text-center py-8">
                <p className="text-muted-foreground">Registo de atividade em breve</p>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Tens a certeza?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser revertida. O projeto "{project.name}" e todas as suas tarefas serão permanentemente eliminados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <CreateTaskModal
          open={createTaskOpen}
          onOpenChange={setCreateTaskOpen}
          projectId={id!}
          onCreate={(task) => createTask.mutate(task)}
        />

        <CreateTemplateModal
          open={createTemplateOpen}
          onOpenChange={setCreateTemplateOpen}
          projectId={id!}
          projectStartDate={project.start_date}
        />

        <EditProjectModal
          open={editProjectOpen}
          onOpenChange={setEditProjectOpen}
          project={project}
          onUpdate={(updates) => updateProject.mutate({ id: project.id, ...updates })}
        />
      </div>
    </div>
  );
}
