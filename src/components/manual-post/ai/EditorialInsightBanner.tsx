import { Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AccountInsight } from '@/types/aiEditorial';

interface EditorialInsightBannerProps {
  insight: AccountInsight | null;
  visible: boolean;
  onAccept: () => void;
  onDismiss: () => void;
  onMute: () => void;
}

export function EditorialInsightBanner({ insight, visible, onAccept, onDismiss, onMute }: EditorialInsightBannerProps) {
  if (!visible || !insight) return null;
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-primary/25 bg-primary/5 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-2">
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-foreground">{insight.finding} Queres aplicar isto nesta legenda?</p>
      </div>
      <div className="flex flex-wrap gap-1.5 sm:justify-end">
        <Button type="button" size="sm" className="h-8" onClick={onAccept}>Sim, sugere uma</Button>
        <Button type="button" size="sm" variant="ghost" className="h-8" onClick={onDismiss}>Não, obrigado</Button>
        <Button type="button" size="sm" variant="outline" className="h-8" onClick={onMute}>Nunca mostrar</Button>
      </div>
    </div>
  );
}
