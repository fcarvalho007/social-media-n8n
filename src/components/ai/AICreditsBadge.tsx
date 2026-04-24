import { Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAICredits } from '@/hooks/useAICredits';
import { cn } from '@/lib/utils';

export function AICreditsBadge() {
  const { credits, loading } = useAICredits();
  const allowance = Math.max(credits.credits_monthly_allowance, 0);
  const remaining = Math.max(credits.credits_remaining, 0);
  const progress = allowance > 0 ? Math.min(100, Math.round((remaining / allowance) * 100)) : 0;
  const isLow = allowance > 0 && progress < 20;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link to="/ai-settings" aria-label="Créditos de IA">
          <Badge
            variant="outline"
            className={cn(
              'h-9 gap-2 rounded-lg border-border bg-card px-2.5 font-medium hover:bg-accent',
              isLow && 'border-destructive/50 text-destructive'
            )}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>{loading ? '—' : remaining}</span>
          </Badge>
        </Link>
      </TooltipTrigger>
      <TooltipContent align="end" className="w-64 space-y-3 p-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold">Créditos de IA</p>
          <p className="text-xs text-muted-foreground">
            {remaining} de {allowance} créditos disponíveis este mês.
          </p>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Plano {credits.plan_tier}</span>
          {isLow && <Link to="/ai-settings" className="text-primary underline-offset-4 hover:underline">Ver planos</Link>}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
