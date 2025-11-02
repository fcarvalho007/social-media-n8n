import { useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { DashboardHeader } from '@/components/DashboardHeader';
import { FolderKanban, CheckCircle2, Clock, AlertCircle, TrendingUp, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { projects } = useProjects();
  const { tasks } = useTasks();
  const navigate = useNavigate();

  const activeProjects = projects.filter((p) => p.status === 'active').length;
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'done').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length;
  const overdueTasksCount = tasks.filter((t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length;

  const recentProjects = projects.slice(0, 4);
  const urgentTasks = tasks.filter((t) => t.priority === 'urgent' && t.status !== 'done').slice(0, 5);
  
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <DashboardHeader />
          <main className="flex-1 p-4 md:p-6 space-y-6 animate-fade-in">
            {/* Hero Section */}
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground">Visão geral dos seus projetos e tarefas</p>
            </div>

            {/* Stats Grid - Bento Layout */}
            <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="hover:shadow-lg transition-all duration-300 hover-scale border-l-4 border-l-primary">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Projetos Ativos</CardTitle>
                  <FolderKanban className="h-5 w-5 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">{activeProjects}</div>
                  <p className="text-xs text-muted-foreground mt-1">de {projects.length} totais</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all duration-300 hover-scale border-l-4 border-l-success">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Tarefas Concluídas</CardTitle>
                  <CheckCircle2 className="h-5 w-5 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-success">{completedTasks}</div>
                  <p className="text-xs text-muted-foreground mt-1">{completionRate}% de conclusão</p>
                  <Progress value={completionRate} className="mt-2" />
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all duration-300 hover-scale border-l-4 border-l-warning">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Em Progresso</CardTitle>
                  <Clock className="h-5 w-5 text-warning" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-warning">{inProgressTasks}</div>
                  <p className="text-xs text-muted-foreground mt-1">tarefas ativas</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all duration-300 hover-scale border-l-4 border-l-destructive">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Atrasadas</CardTitle>
                  <AlertCircle className="h-5 w-5 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-destructive">{overdueTasksCount}</div>
                  <p className="text-xs text-muted-foreground mt-1">requerem atenção</p>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Grid */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Recent Projects */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Projetos Recentes
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>
                      Ver todos
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {recentProjects.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Nenhum projeto encontrado</p>
                      <Button variant="outline" className="mt-4" onClick={() => navigate('/projects')}>
                        Criar Projeto
                      </Button>
                    </div>
                  ) : (
                    recentProjects.map((project) => (
                      <div
                        key={project.id}
                        onClick={() => navigate(`/projects/${project.id}`)}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent cursor-pointer transition-all duration-200 hover-scale group"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <span className="text-2xl">{project.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate group-hover:text-primary transition-colors">
                              {project.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{project.description}</p>
                          </div>
                        </div>
                        <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                          {project.status === 'active' ? 'Ativo' : project.status === 'completed' ? 'Concluído' : 'Pausado'}
                        </Badge>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Urgent Tasks */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    Tarefas Urgentes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {urgentTasks.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-success" />
                      <p>Sem tarefas urgentes! 🎉</p>
                    </div>
                  ) : (
                    urgentTasks.map((task) => {
                      const project = projects.find((p) => p.id === task.project_id);
                      return (
                        <div
                          key={task.id}
                          className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-accent cursor-pointer transition-all duration-200 group"
                          onClick={() => navigate(`/projects/${task.project_id}`)}
                        >
                          <Badge variant="destructive" className="mt-0.5">URGENTE</Badge>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold group-hover:text-primary transition-colors">{task.title}</p>
                            {project && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {project.icon} {project.name}
                              </p>
                            )}
                            {task.due_date && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Prazo: {new Date(task.due_date).toLocaleDateString('pt-PT')}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
