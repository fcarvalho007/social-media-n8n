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
          <main className="flex-1 p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 animate-fade-in bg-gradient-to-br from-background via-background to-muted/10">
            {/* Hero Section */}
            <div className="space-y-1 sm:space-y-2 pb-2 border-b border-border/50">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent">Dashboard</h1>
              <p className="text-muted-foreground text-xs sm:text-sm">Visão geral dos seus conteúdos e projetos</p>
            </div>

            {/* Linha 0: Custos */}
            <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/[0.02] via-background to-secondary/[0.02] shadow-lg">
              <CardHeader className="pb-3 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold flex items-center gap-2.5">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
                      <Euro className="h-5 w-5 text-white" />
                    </div>
                    Controlo de Custos
                  </CardTitle>
                  <div className="text-right px-4 py-2 rounded-lg bg-primary/5 border border-primary/20">
                    <p className="text-[10px] font-semibold text-primary/70 uppercase tracking-wide">Total Acumulado</p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                      {loadingCosts ? '...' : formatCurrency(costs.totalCost)}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {/* Stories */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border/50 hover:border-green-500/50 transition-colors">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                      <FileImage className="h-5 w-5 text-green-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Stories Gerados</p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-bold text-foreground">
                          {loadingCosts ? '...' : costs.storiesCount}
                        </p>
                        <p className="text-xs text-green-600 font-medium">
                          {loadingCosts ? '...' : formatCurrency(costs.storiesCost)}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">€0,02/un</p>
                    </div>
                  </div>

                  {/* Carrosséis */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border/50 hover:border-blue-500/50 transition-colors">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                      <ImagePlus className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Carrosséis Gerados</p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-bold text-foreground">
                          {loadingCosts ? '...' : costs.carouselsCount}
                        </p>
                        <p className="text-xs text-blue-600 font-medium">
                          {loadingCosts ? '...' : formatCurrency(costs.carouselsCost)}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">€0,08/un</p>
                    </div>
                  </div>

                  {/* Posts */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border/50 opacity-60">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Posts Gerados</p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-bold text-foreground">
                          {loadingCosts ? '...' : costs.postsCount}
                        </p>
                        <Badge variant="secondary" className="text-xs h-5">
                          Em breve
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Em desenvolvimento</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Linha 1: Conteúdos */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-2 border-b border-border/30">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md">
                  <FileImage className="h-4 w-4 text-white" />
                </div>
                <h2 className="text-lg font-bold text-foreground">Conteúdos</h2>
              </div>
              <div className="grid gap-4 md:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 border-transparent hover:border-primary/20 bg-gradient-to-br from-card to-primary/[0.02] touch-active">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Stories por Aprovar/Agendar</CardTitle>
                    <FileImage className="h-5 w-5 text-primary flex-shrink-0" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl sm:text-3xl font-bold text-primary">
                      {loadingPending ? '...' : pendingCounts.stories}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="mt-3 text-xs hover:text-primary touch-target"
                      onClick={() => navigate('/pending')}
                    >
                      Ver mais
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-all duration-300 hover-scale border-l-4 border-l-secondary touch-active">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Carrosséis por Aprovar/Agendar</CardTitle>
                    <ImagePlus className="h-5 w-5 text-secondary flex-shrink-0" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl sm:text-3xl font-bold text-secondary">
                      {loadingPending ? '...' : pendingCounts.carousels}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="mt-3 text-xs hover:text-primary touch-target"
                      onClick={() => navigate('/review')}
                    >
                      Ver mais
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-all duration-300 hover-scale border-l-4 border-l-accent touch-active">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Posts na Feed por Aprovar/Agendar</CardTitle>
                    <FileText className="h-5 w-5 text-accent flex-shrink-0" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl sm:text-3xl font-bold text-accent">
                      {loadingPending ? '...' : pendingCounts.posts}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="mt-3 text-xs hover:text-primary touch-target"
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
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-2 border-b border-border/30">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md">
                  <CalendarIcon className="h-4 w-4 text-white" />
                </div>
                <h2 className="text-lg font-bold text-foreground">Calendário</h2>
              </div>
              <div className="grid gap-4 md:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 border-transparent hover:border-success/20 bg-gradient-to-br from-card to-success/[0.02]">
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
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-2 border-b border-border/30">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md">
                  <FolderKanban className="h-4 w-4 text-white" />
                </div>
                <h2 className="text-lg font-bold text-foreground">Projetos</h2>
              </div>
              <div className="grid gap-4 md:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 border-transparent hover:border-primary/20 bg-gradient-to-br from-card to-primary/[0.02]">
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
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border/30">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md">
                    <TrendingUp className="h-4 w-4 text-white" />
                  </div>
                  <h2 className="text-lg font-bold text-foreground">Projetos Recentes</h2>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate('/projects')}
                  className="hover:text-primary hover:bg-primary/5 gap-2"
                >
                  <span className="text-xs font-semibold">Ver todos</span>
                  <ArrowRight className="h-3.5 w-3.5" />
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
