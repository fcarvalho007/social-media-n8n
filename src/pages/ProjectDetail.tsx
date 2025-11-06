import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Edit, Archive, Trash2, CheckCircle2, Plus, Save } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { KanbanBoard } from '@/components/tasks/KanbanBoard';
import { CreateTaskModal } from '@/components/tasks/CreateTaskModal';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { DashboardHeader } from '@/components/DashboardHeader';
import { InlineEditableText } from '@/components/InlineEditableText';
import { InlineEditableSelect } from '@/components/InlineEditableSelect';
import { MilestonesList } from '@/components/milestones/MilestonesList';
import { TimelineView } from '@/components/projects/TimelineView';
import { CreateTemplateModal } from '@/components/projects/CreateTemplateModal';
import { EditProjectModal } from '@/components/projects/EditProjectModal';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { projects, updateProject, deleteProject } = useProjects();
  const { tasks, createTask, updateTask, deleteTask } = useTasks(id);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [createTemplateOpen, setCreateTemplateOpen] = useState(false);
  const [editProjectOpen, setEditProjectOpen] = useState(false);

  const project = projects.find((p) => p.id === id);

  if (!project) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Projeto não encontrado</h2>
          <Button onClick={() => navigate('/projects')}>
            Voltar aos Projetos
          </Button>
        </div>
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
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        {/* Skip to main content for accessibility */}
        <a href="#main-content" className="skip-to-content">
          Ir para o conteúdo principal
        </a>
        
        <AppSidebar />
        <SidebarInset className="flex-1">
          <DashboardHeader />
          <main id="main-content" className="flex-1 p-4 md:p-6 space-y-6 animate-fade-in">
      <div className="space-y-8">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => navigate('/projects')} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Button>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div className="flex items-start gap-4">
          <span className="text-4xl" role="img" aria-label="Project icon">{project.icon}</span>
          <div>
            <InlineEditableText
              value={project.name}
              onSave={(newName) => updateProject.mutate({ id: project.id, name: newName })}
              className="text-3xl font-bold block"
              inputClassName="text-3xl font-bold"
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
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="gap-2" 
            onClick={() => setCreateTemplateOpen(true)}
            aria-label="Guardar como template"
          >
            <Save className="h-4 w-4" />
            Template
          </Button>
          <Button 
            variant="outline" 
            className="gap-2" 
            onClick={() => setEditProjectOpen(true)}
            aria-label="Editar projeto"
          >
            <Edit className="h-4 w-4" />
            Editar
          </Button>
          <Button variant="outline" className="gap-2" aria-label="Arquivar projeto">
            <Archive className="h-4 w-4" />
            Arquivar
          </Button>
          <Button 
            variant="destructive" 
            className="gap-2"
            onClick={() => setDeleteDialogOpen(true)}
            aria-label="Eliminar projeto"
          >
            <Trash2 className="h-4 w-4" />
            Eliminar
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tasks" className="space-y-6">
        <TabsList>
          <TabsTrigger value="tasks">Tarefas</TabsTrigger>
          <TabsTrigger value="milestones">Marcos</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="activity">Atividade</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Tarefas</h2>
              <p className="text-muted-foreground">Gerir tarefas com quadro Kanban</p>
            </div>
            <Button onClick={() => setCreateTaskOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Tarefa
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
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}