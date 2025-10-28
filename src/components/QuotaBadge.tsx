import { Instagram, Linkedin } from 'lucide-react';
import { usePublishingQuota } from '@/hooks/usePublishingQuota';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function QuotaBadge() {
  const { instagram, linkedin, planName, isUnlimited } = usePublishingQuota();

  if (instagram.isLoading || linkedin.isLoading) {
    return <Skeleton className="h-10 w-48" />;
  }

  const formatRemaining = (remaining: number, isUnlimited: boolean) => {
    if (isUnlimited) return '∞';
    return remaining;
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border">
        <span className="text-xs font-medium text-muted-foreground hidden md:inline">
          {isUnlimited ? 'Ilimitado' : 'Este mês'}:
        </span>
        
        {/* Instagram Badge */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors ${
              instagram.canPublish 
                ? 'bg-green-500/10 text-green-700 dark:text-green-400' 
                : 'bg-red-500/10 text-red-700 dark:text-red-400'
            }`}>
              <Instagram className="h-3.5 w-3.5" />
              <span className="text-xs font-semibold">{instagram.quotaText}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs">
              <p>Instagram: {formatRemaining(instagram.quota?.remaining || 0, isUnlimited)} publicações restantes</p>
              <p className="text-muted-foreground mt-1">Plano: {planName}</p>
            </div>
          </TooltipContent>
        </Tooltip>

        <div className="h-4 w-px bg-border" />

        {/* LinkedIn Badge */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors ${
              linkedin.canPublish 
                ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400' 
                : 'bg-red-500/10 text-red-700 dark:text-red-400'
            }`}>
              <Linkedin className="h-3.5 w-3.5" />
              <span className="text-xs font-semibold">{linkedin.quotaText}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs">
              <p>LinkedIn: {formatRemaining(linkedin.quota?.remaining || 0, isUnlimited)} publicações restantes</p>
              <p className="text-muted-foreground mt-1">Plano: {planName}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
