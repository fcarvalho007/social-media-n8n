import { Lightbulb, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AccountInsight } from '@/types/aiEditorial';

interface EditorialInsightBannerProps {
  insight: AccountInsight | null;
  visible: boolean;
  onAccept: () => void;
  onDismiss: () => void;
  onMute: () => void;
  onViewAll: () => void;
}

export function EditorialInsightBanner({ insight, visible, onAccept, onDismiss, onMute, onViewAll }: EditorialInsightBannerProps) {
  if (!visible || !insight) return null;
  return (
    <div className="flex flex-col gap-3 rounded-md border border-primary/25 bg-primary/5 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-2">
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-foreground">{insight.finding}</p>
      </div>
      <div className="flex flex-wrap gap-1.5 sm:justify-end">
        <Button type="button" size="sm" className="h-8" onClick={onAccept}>Sugere uma pergunta</Button>
        <Button type="button" size="sm" variant="ghost" className="h-8" onClick={onDismiss}>Dispensar</Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" size="icon" variant="outline" className="h-8 w-8" aria-label="Mais ações"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onMute}>Nunca mostrar este tipo</DropdownMenuItem>
            <DropdownMenuItem onClick={onViewAll}>Ver todos os insights</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
