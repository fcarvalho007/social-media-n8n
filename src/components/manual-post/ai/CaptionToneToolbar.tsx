import { RotateCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type ToneAction = 'direct' | 'emotional' | 'technical' | 'shorter' | 'longer' | 'linkedin' | 'instagram';

const actions: Array<{ id: ToneAction; label: string }> = [
  { id: 'direct', label: 'Mais direto' },
  { id: 'emotional', label: 'Mais emocional' },
  { id: 'technical', label: 'Mais técnico' },
  { id: 'shorter', label: 'Mais curto' },
  { id: 'longer', label: 'Mais longo' },
  { id: 'linkedin', label: 'Tom LinkedIn' },
  { id: 'instagram', label: 'Tom Instagram' },
];

interface CaptionToneToolbarProps {
  loadingAction: ToneAction | null;
  canUndo: boolean;
  disabled?: boolean;
  onRewrite: (action: ToneAction) => void;
  onUndo: () => void;
}

export function CaptionToneToolbar({ loadingAction, canUndo, disabled, onRewrite, onUndo }: CaptionToneToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border bg-muted/30 p-1.5">
      {actions.map((action) => (
        <Button
          key={action.id}
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2 text-xs"
          disabled={disabled || !!loadingAction}
          onClick={() => onRewrite(action.id)}
        >
          {loadingAction === action.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <span aria-hidden>✨</span>}
          {action.label}
        </Button>
      ))}
      <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 px-2 text-xs" disabled={!canUndo || disabled || !!loadingAction} onClick={onUndo}>
        <RotateCcw className="h-3.5 w-3.5" />
        Desfazer
      </Button>
    </div>
  );
}
