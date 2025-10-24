import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit3, Sparkles, ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModeBadgeProps {
  mode: 'manual' | 'ia';
  onChangeMode?: () => void;
  className?: string;
}

export const ModeBadge = ({ mode, onChangeMode, className }: ModeBadgeProps) => {
  const isManual = mode === 'manual';
  
  return (
    <div className={cn("flex items-center gap-3 p-3 sm:p-4 bg-card/80 backdrop-blur-sm border-2 border-border rounded-xl shadow-sm", className)}>
      <Badge 
        variant={isManual ? "default" : "secondary"}
        className={cn(
          "h-7 px-3 font-bold text-xs uppercase tracking-wide",
          isManual ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"
        )}
      >
        {isManual ? (
          <>
            <Edit3 className="h-3.5 w-3.5 mr-1.5" />
            Modo Manual
          </>
        ) : (
          <>
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            Modo IA
          </>
        )}
      </Badge>
      
      <div className="flex-1 text-xs text-muted-foreground">
        <span className="hidden sm:inline">
          Está a usar o <span className="font-bold">{isManual ? 'MODO MANUAL' : 'MODO IA'}</span>. 
        </span>
        <span className="font-semibold"> Pode mudar de modo a qualquer momento.</span>
      </div>
      
      {onChangeMode && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onChangeMode}
          className="h-8 px-3 text-xs font-semibold hover:bg-primary/10"
        >
          <ArrowLeftRight className="h-3.5 w-3.5 mr-1.5" />
          <span className="hidden sm:inline">Mudar modo</span>
          <span className="sm:hidden">Mudar</span>
        </Button>
      )}
    </div>
  );
};
