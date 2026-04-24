import { ReactNode, useEffect, useState } from 'react';
import { RotateCcw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface AIGeneratedFieldProps {
  children: ReactNode;
  generatedAt?: string | Date | null;
  onRegenerate?: () => void | Promise<void>;
  edited?: boolean;
  className?: string;
}

export function AIGeneratedField({ children, generatedAt, onRegenerate, edited = false, className }: AIGeneratedFieldProps) {
  const [visible, setVisible] = useState(Boolean(generatedAt) && !edited);

  useEffect(() => {
    setVisible(Boolean(generatedAt) && !edited);
  }, [generatedAt, edited]);

  const generatedLabel = generatedAt
    ? `Gerado por IA a ${new Intl.DateTimeFormat('pt-PT', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(generatedAt))}`
    : 'Gerado por IA';

  return (
    <div className={cn('relative rounded-md border bg-card', visible ? 'border-l-4 border-l-primary' : 'border-border', className)}>
      {visible && (
        <div className="absolute right-2 top-2 z-10 flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Sparkles className="h-4 w-4 text-primary" />
            </TooltipTrigger>
            <TooltipContent>{generatedLabel}</TooltipContent>
          </Tooltip>
          {onRegenerate && (
            <Button type="button" size="sm" variant="ghost" className="h-7 gap-1 px-2" onClick={() => onRegenerate()}>
              <RotateCcw className="h-3.5 w-3.5" />
              Regenerar
            </Button>
          )}
        </div>
      )}
      <div className={visible ? 'pt-9' : undefined}>{children}</div>
    </div>
  );
}
