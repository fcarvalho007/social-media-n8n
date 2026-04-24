import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface AltTextPanelProps {
  visible: boolean;
  value: string;
  isCarousel: boolean;
  applyAll: boolean;
  loading: boolean;
  onChange: (value: string) => void;
  onRegenerate: () => void;
  onApplyAllChange: (value: boolean) => void;
}

export function AltTextPanel({ visible, value, isCarousel, applyAll, loading, onChange, onRegenerate, onApplyAllChange }: AltTextPanelProps) {
  if (!visible) return null;
  const over = value.length > 125;
  return (
    <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="alt-text-ai">Alt text</Label>
        <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" onClick={onRegenerate} disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Regenerar
        </Button>
      </div>
      <Textarea id="alt-text-ai" value={value} onChange={(e) => onChange(e.target.value.slice(0, 180))} className={cn('min-h-20 resize-none', over && 'border-destructive')} placeholder="Descrição acessível da imagem ou do primeiro frame." />
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className={cn(over && 'font-medium text-destructive')}>{value.length}/125 caracteres</span>
        {isCarousel && (
          <label className="flex items-center gap-2">
            <Checkbox checked={applyAll} onCheckedChange={(checked) => onApplyAllChange(checked === true)} />
            Aplicar a todas as imagens do carrossel
          </label>
        )}
      </div>
    </div>
  );
}
