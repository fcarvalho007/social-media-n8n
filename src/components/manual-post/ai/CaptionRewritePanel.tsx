import { Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CaptionRewriteTone } from '@/types/aiEditorial';

export const captionRewriteToneLabels: Record<CaptionRewriteTone, string> = {
  direto: 'Direto',
  emocional: 'Emocional',
  técnico: 'Técnico',
  neutro: 'Neutro',
  humor: 'Humor',
  mais_curto: 'Mais curto',
  mais_forte: 'Mais forte',
};

interface CaptionRewritePanelProps {
  tone: CaptionRewriteTone;
  onToneChange: (tone: CaptionRewriteTone) => void;
  onRewrite: () => void;
  loading: boolean;
  disabled?: boolean;
}

export function CaptionRewritePanel({ tone, onToneChange, onRewrite, loading, disabled }: CaptionRewritePanelProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1.5 sm:min-w-[220px]">
        <Label htmlFor="caption-rewrite-tone" className="text-xs font-medium">Tom da reescrita</Label>
        <Select value={tone} onValueChange={(value) => onToneChange(value as CaptionRewriteTone)} disabled={disabled || loading}>
          <SelectTrigger id="caption-rewrite-tone" className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(captionRewriteToneLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="button" size="sm" className="gap-2" onClick={onRewrite} disabled={disabled || loading}>
        <Wand2 className="h-4 w-4" />
        {loading ? 'A reescrever…' : 'Reescrever com IA'}
      </Button>
    </div>
  );
}