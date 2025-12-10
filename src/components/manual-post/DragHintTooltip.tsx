import { useState, useEffect } from 'react';
import { GripVertical, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'manual-create-drag-hint-dismissed';

interface DragHintTooltipProps {
  show?: boolean;
  className?: string;
}

export function DragHintTooltip({ show = true, className }: DragHintTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Check if user has dismissed the hint before
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed && show) {
      // Small delay before showing for better UX
      const timer = setTimeout(() => {
        setIsVisible(true);
        setIsAnimating(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [show]);

  const handleDismiss = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      localStorage.setItem(STORAGE_KEY, 'true');
    }, 200);
  };

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl",
        "bg-primary/10 border border-primary/20",
        "transition-all duration-300 ease-out",
        isAnimating ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2",
        className
      )}
      role="tooltip"
    >
      <div className="flex items-center gap-2 text-sm">
        <span className="text-lg">💡</span>
        <GripVertical className="h-4 w-4 text-primary" />
        <span className="text-foreground">
          <strong>Arrasta os itens</strong> para alterar a ordem no carrossel
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-3 text-xs font-medium hover:bg-primary/10"
        onClick={handleDismiss}
      >
        Percebido
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-muted-foreground hover:text-foreground"
        onClick={handleDismiss}
        aria-label="Fechar dica"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// Hook to check if hint was dismissed
export function useDragHintDismissed() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const value = localStorage.getItem(STORAGE_KEY);
    setDismissed(!!value);
  }, []);

  return dismissed;
}
