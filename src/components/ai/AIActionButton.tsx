import { ReactNode, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAICredits } from '@/hooks/useAICredits';
import { handleAIError } from '@/lib/errorHandler';

interface AIActionButtonProps {
  icon: ReactNode;
  label: string;
  onClick: () => Promise<unknown>;
  creditCost: number;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
}

const variantMap = {
  primary: 'default',
  secondary: 'secondary',
  ghost: 'ghost',
} as const;

export function AIActionButton({ icon, label, onClick, creditCost, disabled, variant = 'primary' }: AIActionButtonProps) {
  const [loading, setLoading] = useState(false);
  const { credits, refresh } = useAICredits();
  const lacksCredits = credits.credits_remaining < creditCost;
  const isDisabled = disabled || loading || lacksCredits;

  const handleClick = async () => {
    if (lacksCredits) {
      toast.error('Não tens créditos suficientes. Vê planos.');
      return;
    }

    setLoading(true);
    try {
      await onClick();
      await refresh();
    } catch (error) {
      handleAIError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>
          <Button type="button" variant={variantMap[variant]} disabled={isDisabled} onClick={handleClick} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
            <span>{label}</span>
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>{creditCost} crédito{creditCost === 1 ? '' : 's'} de IA</p>
      </TooltipContent>
    </Tooltip>
  );
}
