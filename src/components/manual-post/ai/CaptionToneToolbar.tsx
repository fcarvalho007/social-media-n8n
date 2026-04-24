import { BookOpen, GraduationCap, Heart, Instagram, Linkedin, Loader2, Scissors, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type ToneAction = 'direct' | 'emotional' | 'technical' | 'shorter' | 'longer' | 'linkedin' | 'instagram';

const actions: Array<{ id: ToneAction; label: string; icon: typeof Scissors }> = [
  { id: 'shorter', label: 'Curto', icon: Scissors },
  { id: 'longer', label: 'Longo', icon: BookOpen },
  { id: 'direct', label: 'Direto', icon: Target },
  { id: 'emotional', label: 'Emocional', icon: Heart },
  { id: 'technical', label: 'Técnico', icon: GraduationCap },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { id: 'instagram', label: 'Instagram', icon: Instagram },
];

interface CaptionToneToolbarProps {
  loadingAction: ToneAction | null;
  disabled?: boolean;
  onRewrite: (action: ToneAction) => void;
}

export function CaptionToneToolbar({ loadingAction, disabled, onRewrite }: CaptionToneToolbarProps) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto rounded-lg border bg-muted/30 p-1.5 scrollbar-hide sm:flex-wrap">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Button
            key={action.id}
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 min-w-max gap-1.5 px-2 text-xs"
            disabled={disabled || !!loadingAction}
            onClick={() => onRewrite(action.id)}
            title={`Ajustar legenda: ${action.label}`}
          >
            {loadingAction === action.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} /> : <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />}
            {action.label}
          </Button>
        );
      })}
    </div>
  );
}
