import { Lightbulb, X, EyeOff, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface Insight {
  id: string;
  finding: string;
  confidence?: number;
  insight_type?: string;
}

interface InsightBannerProps {
  insight: Insight;
  onAccept: () => void;
  onDismiss: () => void;
  onNeverShow: () => void;
}

export function InsightBanner({ insight, onAccept, onDismiss, onNeverShow }: InsightBannerProps) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 gap-3">
        <Lightbulb className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium">Insight de IA</p>
          <p className="text-sm text-muted-foreground">{insight.finding}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
        <Button type="button" size="sm" className="gap-1" onClick={onAccept}><Check className="h-4 w-4" />Aceitar</Button>
        <Button type="button" size="sm" variant="outline" className="gap-1" onClick={onDismiss}><X className="h-4 w-4" />Dispensar</Button>
        <Button type="button" size="sm" variant="ghost" className="gap-1" onClick={onNeverShow}><EyeOff className="h-4 w-4" />Nunca mostrar</Button>
      </div>
    </div>
  );
}
