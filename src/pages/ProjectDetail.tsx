import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Edit, Archive, Trash2, CheckCircle2 } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { projects, deleteProject } = useProjects();
  const { tasks } = useTasks(id);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

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
    <div className="container mx-auto py-8 px-4 space-y-8">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => navigate('/projects')} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Button>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div className="flex items-start gap-4">
          <span className="text-4xl">{project.icon}</span>
          <div>
            <h1 className="text-3xl font-bold">{project.name}</h1>
            <Badge className="mt-2">{statusLabels[project.status]}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Edit className="h-4 w-4" />
            Editar
          </Button>
          <Button variant="outline" className="gap-2">
            <Archive className="h-4 w-4" />
            Arquivar
          </Button>
          <Button 
            variant="destructive" 
            className="gap-2"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            Eliminar
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="tasks">Tarefas</TabsTrigger>
          <TabsTrigger value="activity">Atividade</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Description */}
          {project.description && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Descrição</h2>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {project.description}
              </p>
            </Card>
          )}

          {/* Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-6">
              <div className="text-3xl font-bold text-primary">{tasks.length}</div>
              <p className="text-sm text-muted-foreground mt-1">Total de tarefas</p>
            </Card>
            <Card className="p-6">
              <div className="text-3xl font-bold text-success">{completionPercentage}%</div>
              <p className="text-sm text-muted-foreground mt-1">Tarefas concluídas</p>
            </Card>
            {daysRemaining !== null && (
              <Card className="p-6">
                <div className="text-3xl font-bold text-warning">{daysRemaining}</div>
                <p className="text-sm text-muted-foreground mt-1">Dias restantes</p>
              </Card>
            )}
            <Card className="p-6">
              <div className="text-3xl font-bold text-accent">2</div>
              <p className="text-sm text-muted-foreground mt-1">Membros da equipa</p>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tasks">
          <Card className="p-6">
            <div className="text-center py-8">
              <CheckCircle2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Sistema de tarefas em desenvolvimento</h3>
              <p className="text-muted-foreground">
                A gestão completa de tarefas estará disponível em breve
              </p>
            </div>
          </Card>
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
    </div>
  );
}