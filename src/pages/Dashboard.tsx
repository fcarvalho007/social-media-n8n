import { useProjects } from '@/hooks/useProjects';
import { usePendingContent } from '@/hooks/usePendingContent';
import { useScheduledCounts } from '@/hooks/useScheduledCounts';
import { useCostTracking } from '@/hooks/useCostTracking';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileImage, ImagePlus, FileText, Calendar as CalendarIcon, ArrowRight, FolderKanban, AlertCircle, Euro, Edit3, CheckCircle2, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { PendingThumbnail } from '@/components/PendingThumbnail';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function Dashboard() {
  const { projects } = useProjects();
  const {
    items: pendingItems,
    totalCount: pendingTotal,
    pendingApprovalCount,
    draftsCount,
    scheduledCount,
    loading: loadingPending,
  } = usePendingContent(6);
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
  const currentMonthLabel = format(new Date(), "MMMM 'de' yyyy", { locale: pt });

  const formatCurrency = (value: number) => `€${value.toFixed(2)}`;

  return (
    <TooltipProvider>
      <div className="space-y-4 sm:space-y-6 bg-gradient-to-br from-background via-background to-muted/10">
        {/* Conteúdo a Tratar (Por Aprovar + Agendados + Rascunhos) */}
        <Card className="border-2 border-amber-500/20 bg-gradient-to-br from-amber-50/30 dark:from-amber-950/10 to-background shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-base font-bold flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <Edit3 className="h-5 w-5 text-white" />
                </div>
                Conteúdo a Tratar
                {!loadingPending && (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30 ml-1">
                    {pendingTotal}
                  </Badge>
                )}
              </CardTitle>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => navigate('/pending')}
                  disabled={loadingPending || pendingApprovalCount === 0}
                  className="text-xs"
                >
                  ✅ Aprovar {!loadingPending && `(${pendingApprovalCount})`}
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate('/calendar')}
                  className="text-xs"
                >
                  📅 Agendados {!loadingPending && `(${scheduledCount})`}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate('/drafts')}
                  className="text-xs"
                >
                  📝 Rascunhos {!loadingPending && `(${draftsCount})`}
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
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500/60" />
                <p className="text-sm font-medium text-foreground">Tudo em dia</p>
                <p className="text-xs mt-1">Sem aprovações, agendamentos ou rascunhos pendentes.</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3"
                  onClick={() => navigate('/manual-create')}
                >
                  Criar novo conteúdo
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {pendingItems.map((item) => (
                    <PendingThumbnail
                      key={`${item.type}-${item.id}`}
                      id={item.id}
                      type={item.type}
                      thumbnail={item.thumbnail}
                      mediaUrl={item.mediaUrl}
                      mediaType={item.mediaType}
                      hasPosterPreview={item.hasPosterPreview}
                      mediaCount={item.mediaCount}
                      caption={item.caption}
                      createdAt={item.createdAt}
                      scheduledDate={item.scheduledDate}
                      route={item.route}
                      onNavigate={navigate}
                    />
                  ))}
                </div>

                {pendingTotal > 6 && (
                  <p className="text-xs text-muted-foreground mt-3 text-center">
                    +{pendingTotal - 6} itens não mostrados
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Controlo de Custos n8n */}
        <Card className="border border-border/50 bg-gradient-to-br from-card to-muted/5">
          <CardHeader className="pb-3 border-b border-border/50">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md">
                    <Euro className="h-4 w-4 text-white" />
                  </div>
                  Controlo de Custos n8n
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <p className="text-xs">
                        Custos referem-se exclusivamente a conteúdo gerado
                        automaticamente via fluxos n8n (carrosséis e stories).
                        Não inclui posts criados manualmente.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
                <p className="text-[11px] text-muted-foreground mt-1 ml-12 capitalize">
                  Geração automática · {currentMonthLabel}
                </p>
              </div>
              <div className="flex gap-2">
                <div className="text-right px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30">
                  <p className="text-[10px] font-semibold text-primary/70 uppercase tracking-wide">Este mês</p>
                  <p className="text-xl font-bold text-primary">
                    {loadingCosts ? '...' : formatCurrency(costs.totalCostMonth)}
                  </p>
                </div>
                <div className="text-right px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Histórico</p>
                  <p className="text-xl font-bold text-foreground">
                    {loadingCosts ? '...' : formatCurrency(costs.totalCost)}
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {/* Stories */}
              <div className="p-3 rounded-lg bg-card border border-border/50 hover:border-green-500/50 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/10">
                    <FileImage className="h-4 w-4 text-green-500" />
                  </div>
                  <p className="text-sm font-medium">Stories</p>
                </div>
                <div className="space-y-1 ml-12">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[11px] text-muted-foreground">Este mês</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm font-bold">{loadingCosts ? '...' : costs.storiesCountMonth}</span>
                      <span className="text-[11px] text-green-600 font-medium">{loadingCosts ? '' : formatCurrency(costs.storiesCostMonth)}</span>
                    </div>
                  </div>
                  <div className="flex items-baseline justify-between opacity-60">
                    <span className="text-[11px] text-muted-foreground">Histórico</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xs">{loadingCosts ? '...' : costs.storiesCount}</span>
                      <span className="text-[11px] text-muted-foreground">{loadingCosts ? '' : formatCurrency(costs.storiesCost)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Carrosséis */}
              <div className="p-3 rounded-lg bg-card border border-border/50 hover:border-blue-500/50 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                    <ImagePlus className="h-4 w-4 text-blue-500" />
                  </div>
                  <p className="text-sm font-medium">Carrosséis</p>
                </div>
                <div className="space-y-1 ml-12">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[11px] text-muted-foreground">Este mês</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm font-bold">{loadingCosts ? '...' : costs.carouselsCountMonth}</span>
                      <span className="text-[11px] text-blue-600 font-medium">{loadingCosts ? '' : formatCurrency(costs.carouselsCostMonth)}</span>
                    </div>
                  </div>
                  <div className="flex items-baseline justify-between opacity-60">
                    <span className="text-[11px] text-muted-foreground">Histórico</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xs">{loadingCosts ? '...' : costs.carouselsCount}</span>
                      <span className="text-[11px] text-muted-foreground">{loadingCosts ? '' : formatCurrency(costs.carouselsCost)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Posts (manual) */}
              <div className="p-3 rounded-lg bg-card border border-border/50 opacity-60">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">Posts</p>
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5">Em breve</Badge>
                </div>
                <div className="space-y-1 ml-12">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[11px] text-muted-foreground">Este mês</span>
                    <span className="text-sm font-bold">{loadingCosts ? '...' : costs.postsCountMonth}</span>
                  </div>
                  <div className="flex items-baseline justify-between opacity-60">
                    <span className="text-[11px] text-muted-foreground">Histórico</span>
                    <span className="text-xs">{loadingCosts ? '...' : costs.postsCount}</span>
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
    </TooltipProvider>
  );
}
