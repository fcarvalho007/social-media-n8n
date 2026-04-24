import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface GlobalProgressBarStep {
  number: number;
  label: string;
}

interface GlobalProgressBarProps {
  steps: GlobalProgressBarStep[];
  currentStep: number;
  visitedSteps: number[];
  /** Passos completos (têm dados válidos). */
  completedSteps?: number[];
  onStepClick?: (step: number) => void;
  /** Quando true, fixa-se ao topo com backdrop-blur. */
  sticky?: boolean;
}

/**
 * Linha de progresso global de 5 bolas conectadas usada no fluxo de
 * `/manual-create` (substitui o antigo `StepProgress` de 3 etapas).
 *
 * - Bolas conectadas por linhas finas (border-muted ou primary se completo).
 * - Estado `complete`: primary preenchido + check.
 * - Estado `active`: primary com halo subtil (ring + animação de pulse).
 * - Estado `inactive`: border-muted, vazia.
 *
 * Altura total ~32px. Acessibilidade: cada bola é um botão se
 * `onStepClick` for fornecido E o passo já foi visitado.
 */
export function GlobalProgressBar({
  steps,
  currentStep,
  visitedSteps,
  completedSteps = [],
  onStepClick,
  sticky = false,
}: GlobalProgressBarProps) {
  return (
    <div
      role="navigation"
      aria-label="Progresso de criação"
      className={cn(
        'flex w-full items-center justify-center gap-1 px-2 py-2',
        sticky && 'sticky top-0 z-30 bg-background/80 backdrop-blur-md',
      )}
    >
      {steps.map((step, index) => {
        const isComplete = completedSteps.includes(step.number);
        const isActive = currentStep === step.number;
        const isVisited = visitedSteps.includes(step.number);
        const isClickable = !!onStepClick && isVisited && !isActive;
        const isLast = index === steps.length - 1;

        return (
          <div key={step.number} className="flex items-center">
            <button
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onStepClick?.(step.number)}
              aria-label={`Passo ${step.number}: ${step.label}${isComplete ? ' — completo' : isActive ? ' — actual' : ''}`}
              aria-current={isActive ? 'step' : undefined}
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold transition-all duration-[200ms]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                isComplete && 'bg-primary text-primary-foreground',
                isActive && !isComplete && 'bg-primary text-primary-foreground ring-4 ring-primary/20 animate-pulse-subtle',
                !isComplete && !isActive && 'border border-border bg-background text-muted-foreground',
                isClickable && 'cursor-pointer hover:bg-primary/10',
                !isClickable && 'cursor-default',
              )}
              title={step.label}
            >
              {isComplete ? <Check className="h-4 w-4" strokeWidth={2.5} /> : step.number}
            </button>
            {!isLast && (
              <span
                className={cn(
                  'mx-1 h-px w-6 sm:w-12 transition-colors duration-[200ms]',
                  completedSteps.includes(step.number) && completedSteps.includes(steps[index + 1].number)
                    ? 'bg-primary'
                    : completedSteps.includes(step.number)
                      ? 'bg-primary/50'
                      : 'bg-border',
                )}
                aria-hidden="true"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
