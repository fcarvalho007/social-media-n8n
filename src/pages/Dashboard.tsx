import { useProjects } from '@/hooks/useProjects';
import { usePendingContent } from '@/hooks/usePendingContent';
import { useScheduledCounts } from '@/hooks/useScheduledCounts';
import { useCostTracking } from '@/hooks/useCostTracking';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileImage, ImagePlus, FileText, Calendar as CalendarIcon, ArrowRight, FolderKanban, Clock, AlertCircle, Euro, Edit3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const { projects } = useProjects();
  const { items: pendingItems, totalCount: pendingTotal, pendingApprovalCount, draftsCount, loading: loadingPending } = usePendingContent(6);
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

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'story': return 'Story';
      case 'carousel': return 'Carrossel';
      case 'post': return 'Post';
      case 'draft': return 'Rascunho';
      default: return type;
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'story': return 'bg-green-500/10 text-green-700 border-green-500/30';
      case 'carousel': return 'bg-blue-500/10 text-blue-700 border-blue-500/30';
      case 'post': return 'bg-purple-500/10 text-purple-700 border-purple-500/30';
      case 'draft': return 'bg-amber-500/10 text-amber-700 border-amber-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 bg-gradient-to-br from-background via-background to-muted/10">
      {/* Secção Principal: Por Aprovar & Rascunhos */}
      <Card className="border-2 border-amber-500/20 bg-gradient-to-br from-amber-50/30 dark:from-amber-950/10 to-background shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-base font-bold flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Edit3 className="h-5 w-5 text-white" />
              </div>
              Por Aprovar & Rascunhos
              {!loadingPending && (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30 ml-1">
                  {pendingTotal}
                </Badge>
              )}
            </CardTitle>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => navigate('/pending')} className="text-xs">
                🤖 Aprovar {!loadingPending && `(${pendingApprovalCount})`}
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate('/drafts')} className="text-xs">
                Rascunhos {!loadingPending && `(${draftsCount})`}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingPending ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))}
            </div>
          ) : pendingItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhum conteúdo pendente</p>
              <Button 
                variant="ghost" 
                size="sm" 
                className="mt-2"
                onClick={() => navigate('/manual-create')}
              >
                Criar novo conteúdo
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {pendingItems.map((item) => (
                  <div
                    key={`${item.type}-${item.id}`}
                    onClick={() => navigate(item.route)}
                    className="relative aspect-square rounded-lg overflow-hidden cursor-pointer 
                               hover:ring-2 hover:ring-primary transition-all group bg-muted"
                  >
                    {item.thumbnail ? (
                      <img 
                        src={item.thumbnail} 
                        alt="" 
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const fallback = target.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className={`w-full h-full flex items-center justify-center ${item.thumbnail ? 'hidden' : ''}`}>
                      {item.type === 'story' ? (
                        <FileImage className="h-8 w-8 text-muted-foreground/50" />
                      ) : item.type === 'carousel' ? (
                        <ImagePlus className="h-8 w-8 text-muted-foreground/50" />
                      ) : (
                        <FileText className="h-8 w-8 text-muted-foreground/50" />
                      )}
                    </div>
                    {/* Badge de tipo */}
                    <Badge 
                      className={`absolute top-1.5 left-1.5 text-[10px] px-1.5 py-0 h-5 border ${getTypeBadgeColor(item.type)}`}
                    >
                      {getTypeLabel(item.type)}
                    </Badge>
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 
                                    transition-opacity flex items-center justify-center">
                      <span className="text-white text-xs font-medium">Abrir</span>
                    </div>
                  </div>
                ))}
              </div>
              
              {pendingTotal > 6 && (
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  +{pendingTotal - 6} conteúdos por processar
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Custos */}
      <Card className="border border-border/50 bg-gradient-to-br from-card to-muted/5">
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md">
                <Euro className="h-4 w-4 text-white" />
              </div>
              Controlo de Custos
            </CardTitle>
            <div className="text-right px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-[10px] font-semibold text-primary/70 uppercase tracking-wide">Total</p>
              <p className="text-xl font-bold text-primary">
                {loadingCosts ? '...' : formatCurrency(costs.totalCost)}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {/* Stories */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border/50 hover:border-green-500/50 transition-colors">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/10">
                <FileImage className="h-4 w-4 text-green-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Stories</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-xl font-bold text-foreground">
                    {loadingCosts ? '...' : costs.storiesCount}
                  </p>
                  <p className="text-xs text-green-600 font-medium">
                    {loadingCosts ? '...' : formatCurrency(costs.storiesCost)}
                  </p>
                </div>
              </div>
            </div>

            {/* Carrosséis */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border/50 hover:border-blue-500/50 transition-colors">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                <ImagePlus className="h-4 w-4 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Carrosséis</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-xl font-bold text-foreground">
                    {loadingCosts ? '...' : costs.carouselsCount}
                  </p>
                  <p className="text-xs text-blue-600 font-medium">
                    {loadingCosts ? '...' : formatCurrency(costs.carouselsCost)}
                  </p>
                </div>
              </div>
            </div>

            {/* Posts */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border/50 opacity-60">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Posts</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-xl font-bold text-foreground">
                    {loadingCosts ? '...' : costs.postsCount}
                  </p>
                  <Badge variant="secondary" className="text-xs h-5">
                    Em breve
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Duas colunas: Calendário e Projetos */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Calendário */}
        <Card className="border border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md">
                  <CalendarIcon className="h-4 w-4 text-white" />
                </div>
                Calendário
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/calendar')}
                className="text-xs"
              >
                Ver Calendário
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm">Hoje</span>
              </div>
              <span className="text-lg font-bold text-foreground">
                {loadingScheduled ? '...' : scheduledCounts.today}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="text-sm">Esta semana</span>
              </div>
              <span className="text-lg font-bold text-foreground">
                {loadingScheduled ? '...' : scheduledCounts.thisWeek}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                <span className="text-sm capitalize">{currentMonth}</span>
              </div>
              <span className="text-lg font-bold text-foreground">
                {loadingScheduled ? '...' : scheduledCounts.thisMonth}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Projetos Consolidados */}
        <Card className="border border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md">
                  <FolderKanban className="h-4 w-4 text-white" />
                </div>
                Projetos
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/projects')}
                className="text-xs"
              >
                Ver Todos ({projects.length})
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Stats compactos */}
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span>{activeProjects} ativos</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-500" />
                <span>{inProgressProjects} em progresso</span>
              </div>
              {overdueProjects > 0 && (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span>{overdueProjects} atrasados</span>
                </div>
              )}
            </div>
            
            {/* Lista de projetos recentes */}
            {recentProjects.length > 0 ? (
              <div className="space-y-2">
                {recentProjects.map(project => (
                  <div 
                    key={project.id}
                    onClick={() => navigate(`/projects/${project.id}`)}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <div 
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-lg"
                      style={{ backgroundColor: project.color + '20' }}
                    >
                      {project.icon || '📁'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{project.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {project.status === 'active' ? 'Ativo' : 
                         project.status === 'on_hold' ? 'Em pausa' : 
                         project.status === 'completed' ? 'Concluído' : 'Arquivado'}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <p className="text-sm">Nenhum projeto criado</p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => navigate('/projects')}
                >
                  Criar projeto
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
