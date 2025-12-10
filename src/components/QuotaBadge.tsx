import { Instagram, Linkedin, RefreshCw } from 'lucide-react';
import { usePublishingQuota } from '@/hooks/usePublishingQuota';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';

export function QuotaBadge() {
  const { 
    instagram, 
    linkedin, 
    planName, 
    isUnlimited, 
    accountBreakdown,
    lastUpdated,
    isRefreshing,
    refresh 
  } = usePublishingQuota();

  if (instagram.isLoading || linkedin.isLoading) {
    return <Skeleton className="h-10 w-48" />;
  }

  const formatRemaining = (remaining: number, isUnlimited: boolean) => {
    if (isUnlimited) return '∞';
    return remaining;
  };

  const getStatusClasses = (status: 'ok' | 'warning' | 'danger') => {
    switch (status) {
      case 'danger':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'warning':
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20';
      default:
        return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20';
    }
  };

  const instagramAccounts = accountBreakdown.filter(a => a.platform === 'instagram');
  const linkedinAccounts = accountBreakdown.filter(a => a.platform === 'linkedin');

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border">
        <span className="text-xs font-medium text-muted-foreground hidden md:inline">
          {isUnlimited ? 'Ilimitado' : 'Hoje'}:
        </span>
        
        {/* Instagram Badge */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded-md transition-all duration-300 border',
              getStatusClasses(instagram.status)
            )}>
              <Instagram className="h-3.5 w-3.5" />
              <span className="text-xs font-semibold tabular-nums">{instagram.quotaText}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="text-xs space-y-2">
              <div className="font-medium">Instagram</div>
              <p>{formatRemaining(instagram.quota?.remaining || 0, isUnlimited)} publicações restantes hoje</p>
              
              {instagramAccounts.length > 0 && (
                <div className="pt-1 border-t border-border/50">
                  <p className="text-muted-foreground mb-1">Por conta:</p>
                  {instagramAccounts.map(account => (
                    <div key={account.accountId} className="flex justify-between">
                      <span>@{account.username}</span>
                      <span className="font-medium">{account.postsToday} posts</span>
                    </div>
                  ))}
                </div>
              )}
              
              <p className="text-muted-foreground pt-1 border-t border-border/50">Plano: {planName}</p>
            </div>
          </TooltipContent>
        </Tooltip>

        <div className="h-4 w-px bg-border" />

        {/* LinkedIn Badge */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded-md transition-all duration-300 border',
              getStatusClasses(linkedin.status)
            )}>
              <Linkedin className="h-3.5 w-3.5" />
              <span className="text-xs font-semibold tabular-nums">{linkedin.quotaText}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="text-xs space-y-2">
              <div className="font-medium">LinkedIn</div>
              <p>{formatRemaining(linkedin.quota?.remaining || 0, isUnlimited)} publicações restantes hoje</p>
              
              {linkedinAccounts.length > 0 && (
                <div className="pt-1 border-t border-border/50">
                  <p className="text-muted-foreground mb-1">Por conta:</p>
                  {linkedinAccounts.map(account => (
                    <div key={account.accountId} className="flex justify-between">
                      <span>{account.username}</span>
                      <span className="font-medium">{account.postsToday} posts</span>
                    </div>
                  ))}
                </div>
              )}
              
              <p className="text-muted-foreground pt-1 border-t border-border/50">Plano: {planName}</p>
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Refresh Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => refresh()}
              disabled={isRefreshing}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                'text-muted-foreground hover:text-foreground hover:bg-muted',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              aria-label="Atualizar quotas"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <div className="text-xs">
              <p>Atualizar contadores</p>
              {lastUpdated && (
                <p className="text-muted-foreground">
                  Atualizado {formatDistanceToNow(lastUpdated, { addSuffix: true, locale: pt })}
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
