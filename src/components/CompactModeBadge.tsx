import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Edit3, Sparkles, ChevronDown, ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompactModeBadgeProps {
  mode: 'manual' | 'ia';
  onChangeMode?: () => void;
  className?: string;
}

export const CompactModeBadge = ({ mode, onChangeMode, className }: CompactModeBadgeProps) => {
  const isManual = mode === 'manual';
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Badge 
          variant={isManual ? "default" : "secondary"}
          className={cn(
            "h-8 px-3 font-semibold text-xs cursor-pointer transition-all hover:opacity-90 gap-1.5",
            isManual ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground",
            className
          )}
        >
          {isManual ? (
            <Edit3 className="h-3.5 w-3.5" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          <span>{isManual ? 'Manual' : 'IA'}</span>
          <ChevronDown className="h-3 w-3 opacity-70" />
        </Badge>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-3">
        <div className="space-y-3">
          <div>
            <p className="font-medium text-sm">
              Modo {isManual ? 'Manual' : 'IA'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {isManual 
                ? 'Cria publicações com controlo total sobre cada detalhe.'
                : 'A IA ajuda a criar conteúdo automaticamente.'}
            </p>
          </div>
          
          {onChangeMode && (
            <Button
              variant="outline"
              size="sm"
              onClick={onChangeMode}
              className="w-full h-8 text-xs font-medium"
            >
              <ArrowLeftRight className="h-3.5 w-3.5 mr-1.5" />
              Mudar para Modo {isManual ? 'IA' : 'Manual'}
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
