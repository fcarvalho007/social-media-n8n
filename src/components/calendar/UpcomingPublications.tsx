import { useScheduledJobs } from '@/hooks/useScheduledJobs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Clock, 
  Calendar, 
  AlertTriangle, 
  RefreshCw, 
  X,
  Instagram,
  Linkedin,
  Video,
  LayoutGrid,
  Loader2,
  CheckCircle,
  XCircle,
  ArrowRight
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface UpcomingPublicationsProps {
  compact?: boolean;
}

export function UpcomingPublications({ compact = false }: UpcomingPublicationsProps) {
  const { upcomingJobs, attentionJobs, stats, isLoading, cancelJob, retryJob } = useScheduledJobs();

  if (isLoading) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const hasContent = upcomingJobs.length > 0 || attentionJobs.length > 0;

  if (!hasContent && compact) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Attention Required Section */}
      {attentionJobs.length > 0 && (
        <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertTriangle className="h-4 w-4" />
              Requerem Atenção ({attentionJobs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className={compact ? "max-h-32" : "max-h-48"}>
              <div className="space-y-2">
                {attentionJobs.slice(0, compact ? 3 : 5).map((job) => (
                  <div 
                    key={job.id} 
                    className="flex items-center justify-between p-2 bg-background rounded-lg border border-red-200 dark:border-red-800"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                        <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {job.post?.tema || job.story?.tema || 'Publicação'}
                        </p>
                        <p className="text-xs text-red-600 dark:text-red-400 truncate">
                          {job.error_message || 'Falhou após múltiplas tentativas'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-primary"
                              onClick={() => retryJob.mutate(job.id)}
                              disabled={retryJob.isPending}
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Tentar novamente</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => cancelJob.mutate(job.id)}
                              disabled={cancelJob.isPending}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Cancelar</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Publications Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              Próximas 24 horas
            </span>
            {upcomingJobs.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {upcomingJobs.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingJobs.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma publicação agendada</p>
            </div>
          ) : (
            <ScrollArea className={compact ? "max-h-40" : "max-h-64"}>
              <div className="space-y-2">
                {upcomingJobs.map((job) => {
                  const scheduledDate = new Date(job.scheduled_for);
                  const networks = job.post?.selected_networks || [];
                  
                  return (
                    <div 
                      key={job.id} 
                      className="flex items-center justify-between p-2 bg-muted/30 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                          {job.job_type === 'story' ? (
                            <Video className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          ) : (
                            <LayoutGrid className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {job.post?.tema || job.story?.tema || 'Publicação'}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{format(scheduledDate, "HH:mm", { locale: pt })}</span>
                            <span>•</span>
                            <span>{formatDistanceToNow(scheduledDate, { locale: pt, addSuffix: true })}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {networks.includes('instagram') && (
                          <Instagram className="h-3.5 w-3.5 text-pink-500" />
                        )}
                        {networks.includes('linkedin') && (
                          <Linkedin className="h-3.5 w-3.5 text-sky-500" />
                        )}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => cancelJob.mutate(job.id)}
                                disabled={cancelJob.isPending}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Cancelar agendamento</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Queue Status */}
      {stats.pending > 0 && (
        <div className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-lg text-xs">
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground">{stats.pending}</span> na fila
            {stats.processing > 0 && (
              <span className="ml-2">
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {stats.processing} a processar
                </span>
              </span>
            )}
          </span>
          {stats.failed > 0 && (
            <Badge variant="destructive" className="text-xs">
              {stats.failed} falhados
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
