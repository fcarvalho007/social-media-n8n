import { RotateCcw, Sparkles } from 'lucide-react';
import { AIActionButton } from '@/components/ai/AIActionButton';
import { Button } from '@/components/ui/button';
import { CaptionRewriteTone } from '@/types/aiEditorial';

export const captionRewriteToneLabels: Partial<Record<CaptionRewriteTone, string>> = {
  direct: 'Direto',
  emotional: 'Emocional',
  technical: 'Técnico',
  shorter: 'Curto',
  longer: 'Longo',
  linkedin: 'Tom LinkedIn',
  instagram: 'Tom Instagram',
};

const toneOrder: CaptionRewriteTone[] = ['direct', 'emotional', 'technical', 'shorter', 'longer', 'linkedin', 'instagram'];

interface CaptionRewritePanelProps {
  onRewrite: (tone: CaptionRewriteTone) => Promise<unknown>;
  onRevert: () => void;
  canRevert: boolean;
  disabled?: boolean;
}

export function CaptionRewritePanel({ onRewrite, onRevert, canRevert, disabled }: CaptionRewritePanelProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto rounded-lg border bg-muted/30 p-2 scrollbar-hide">
      <div className="flex min-w-max items-center gap-2">
        {toneOrder.map((tone) => (
          <AIActionButton
            key={tone}
            icon={<Sparkles className="h-4 w-4" />}
            label={captionRewriteToneLabels[tone] ?? 'Reescrever'}
            creditCost={1}
            variant="secondary"
            disabled={disabled}
            onClick={() => onRewrite(tone)}
          />
        ))}
      </div>
      <Button type="button" variant="ghost" size="sm" className="min-w-max gap-2" onClick={onRevert} disabled={disabled || !canRevert}>
        <RotateCcw className="h-4 w-4" />
        Reverter
      </Button>
    </div>
  );
}