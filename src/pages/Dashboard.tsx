import { useProjects } from '@/hooks/useProjects';
import { usePendingCounts } from '@/hooks/usePendingCounts';
import { useScheduledCounts } from '@/hooks/useScheduledCounts';
import { useCostTracking } from '@/hooks/useCostTracking';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { DashboardHeader } from '@/components/DashboardHeader';
import { FileImage, ImagePlus, FileText, Calendar as CalendarIcon, TrendingUp, ArrowRight, FolderKanban, Clock, AlertCircle, Euro } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

export default function Dashboard() {
  const { projects } = useProjects();
  const { counts: pendingCounts, loading: loadingPending } = usePendingCounts();
  const { counts: scheduledCounts, loading: loadingScheduled } = useScheduledCounts();
  const { costs, loading: loadingCosts } = useCostTracking();
  const navigate = useNavigate();

  const activeProjects = projects.filter((p) => p.status === 'active').length;
  const inProgressProjects = projects.filter((p) => p.status === 'active' || p.status === 'on_hold').length;
  const overdueProjects = projects.filter((p) => 
    p.due_date && new Date(p.due_date) < new Date() && p.status !== 'completed'
  ).length;

  const recentProjects = projects.slice(0, 3);
  
  const currentMonth = format(new Date(), 'MMMM', { locale: pt });

  // Formatar valores de custo
  const formatCurrency = (value: number) => `€${value.toFixed(2)}`;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <DashboardHeader />
          <main className="flex-1 p-4 md:p-6 space-y-8 animate-fade-in">
            {/* Hero Section */}
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground">Visão geral dos seus conteúdos e projetos</p>
            </div>

            {/* Linha 0: Custos */}
            <div className="space-y-3">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Euro className="h-5 w-5 text-primary" />
                Custos
              </h2>
              <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                <Card className="hover:shadow-lg transition-all duration-300 hover-scale border-l-4 border-l-green-500">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Stories Gerados</CardTitle>
                    <FileImage className="h-5 w-5 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600">
                      {loadingCosts ? '...' : costs.storiesCount}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Custo: €0,02/story
                    </p>
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm font-semibold text-green-600">
                        Total: {loadingCosts ? '...' : formatCurrency(costs.storiesCost)}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-all duration-300 hover-scale border-l-4 border-l-blue-500">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Carrosséis Gerados</CardTitle>
                    <ImagePlus className="h-5 w-5 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-600">
                      {loadingCosts ? '...' : costs.carouselsCount}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Custo: €0,08/carrossel
                    </p>
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm font-semibold text-blue-600">
                        Total: {loadingCosts ? '...' : formatCurrency(costs.carouselsCost)}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-all duration-300 hover-scale border-l-4 border-l-gray-400">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Posts Gerados</CardTitle>
                    <FileText className="h-5 w-5 text-gray-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-gray-500">
                      {loadingCosts ? '...' : costs.postsCount}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Em desenvolvimento
                    </p>
                    <div className="mt-3 pt-3 border-t">
                      <Badge variant="secondary" className="text-xs">
                        Em breve
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Total Geral */}
              <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Custo Total Acumulado</p>
                      <p className="text-3xl font-bold text-primary mt-1">
                        {loadingCosts ? '...' : formatCurrency(costs.totalCost)}
                      </p>
                    </div>
                    <Euro className="h-12 w-12 text-primary/20" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Linha 1: Conteúdos */}
            <div className="space-y-3">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <FileImage className="h-5 w-5 text-primary" />
                Conteúdos
              </h2>
              <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                <Card className="hover:shadow-lg transition-all duration-300 hover-scale border-l-4 border-l-primary">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Stories por Aprovar/Agendar</CardTitle>
                    <FileImage className="h-5 w-5 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-primary">
                      {loadingPending ? '...' : pendingCounts.stories}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="mt-3 text-xs hover:text-primary"
                      onClick={() => navigate('/pending')}
                    >
                      Ver mais
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-all duration-300 hover-scale border-l-4 border-l-secondary">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Carrosséis por Aprovar/Agendar</CardTitle>
                    <ImagePlus className="h-5 w-5 text-secondary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-secondary">
                      {loadingPending ? '...' : pendingCounts.carousels}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="mt-3 text-xs hover:text-primary"
                      onClick={() => navigate('/review')}
                    >
                      Ver mais
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-all duration-300 hover-scale border-l-4 border-l-accent">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Posts na Feed por Aprovar/Agendar</CardTitle>
                    <FileText className="h-5 w-5 text-accent" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-accent">
                      {loadingPending ? '...' : pendingCounts.posts}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="mt-3 text-xs hover:text-primary"
                      onClick={() => navigate('/review')}
                    >
                      Ver mais
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Linha 2: Calendário */}
            <div className="space-y-3">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-primary" />
                Calendário
              </h2>
              <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                <Card className="hover:shadow-lg transition-all duration-300 hover-scale border-l-4 border-l-success">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Posts agendados para hoje</CardTitle>
                    <CalendarIcon className="h-5 w-5 text-success" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-success">
                      {loadingScheduled ? '...' : scheduledCounts.today}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="mt-3 text-xs hover:text-primary"
                      onClick={() => navigate('/calendar')}
                    >
                      Ver mais
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-all duration-300 hover-scale border-l-4 border-l-warning">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Posts agendados para a semana</CardTitle>
                    <CalendarIcon className="h-5 w-5 text-warning" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-warning">
                      {loadingScheduled ? '...' : scheduledCounts.thisWeek}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="mt-3 text-xs hover:text-primary"
                      onClick={() => navigate('/calendar')}
                    >
                      Ver mais
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-all duration-300 hover-scale border-l-4 border-l-blue-500">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Posts agendados para {currentMonth}
                    </CardTitle>
                    <CalendarIcon className="h-5 w-5 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-600">
                      {loadingScheduled ? '...' : scheduledCounts.thisMonth}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="mt-3 text-xs hover:text-primary"
                      onClick={() => navigate('/calendar')}
                    >
                      Ver mais
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Linha 3: Projetos */}
            <div className="space-y-3">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <FolderKanban className="h-5 w-5 text-primary" />
                Projetos
              </h2>
              <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                <Card className="hover:shadow-lg transition-all duration-300 hover-scale border-l-4 border-l-primary">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Projetos Ativos</CardTitle>
                    <FolderKanban className="h-5 w-5 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-primary">{activeProjects}</div>
                    <p className="text-xs text-muted-foreground mt-1">de {projects.length} totais</p>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="mt-3 text-xs hover:text-primary"
                      onClick={() => navigate('/projects')}
                    >
                      Ver mais
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-all duration-300 hover-scale border-l-4 border-l-warning">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Em Progresso</CardTitle>
                    <Clock className="h-5 w-5 text-warning" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-warning">{inProgressProjects}</div>
                    <p className="text-xs text-muted-foreground mt-1">de {projects.length} totais</p>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="mt-3 text-xs hover:text-primary"
                      onClick={() => navigate('/projects')}
                    >
                      Ver mais
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-all duration-300 hover-scale border-l-4 border-l-destructive">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Atrasadas</CardTitle>
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-destructive">{overdueProjects}</div>
                    <p className="text-xs text-muted-foreground mt-1">requerem atenção</p>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="mt-3 text-xs hover:text-primary"
                      onClick={() => navigate('/projects')}
                    >
                      Ver mais
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Linha 4: Projetos Recentes */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Projetos Recentes
                </h2>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate('/projects')}
                  className="hover:text-primary"
                >
                  Ver todos
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>

              {recentProjects.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12 text-muted-foreground">
                    <p>Nenhum projeto encontrado</p>
                    <Button variant="outline" className="mt-4" onClick={() => navigate('/projects')}>
                      Criar Projeto
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {recentProjects.map((project) => (
                    <Card
                      key={project.id}
                      onClick={() => navigate(`/projects/${project.id}`)}
                      className="cursor-pointer hover:shadow-lg transition-all duration-300 hover-scale group"
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <span className="text-3xl">{project.icon}</span>
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base truncate group-hover:text-primary transition-colors">
                                {project.name}
                              </CardTitle>
                            </div>
                          </div>
                          <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                            {project.status === 'active' ? 'Ativo' : project.status === 'completed' ? 'Concluído' : 'Pausado'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {project.description || 'Sem descrição'}
                        </p>
                        {project.due_date && (
                          <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                            <CalendarIcon className="h-3 w-3" />
                            Prazo: {new Date(project.due_date).toLocaleDateString('pt-PT')}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
