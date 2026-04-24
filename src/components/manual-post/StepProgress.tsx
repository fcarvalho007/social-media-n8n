import { Check, Share2, Image as ImageIcon, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  id: number;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const steps: Step[] = [
  { id: 1, label: 'Plataformas', icon: Share2 },
  { id: 2, label: 'Conteúdo', icon: ImageIcon },
  { id: 3, label: 'Publicar', icon: Calendar },
];

interface StepProgressProps {
  currentStep: number;
  visitedSteps: number[];
  onStepClick: (step: number) => void;
}

export function StepProgress({ currentStep, visitedSteps, onStepClick }: StepProgressProps) {
  const activeStep = steps.find((step) => step.id === currentStep) ?? steps[0];
  const progress = `${(currentStep / steps.length) * 100}%`;

  return (
    <div className="w-full">
      <div className="sticky top-0 z-40 flex h-11 items-center border-b border-border/60 bg-background/85 px-4 backdrop-blur-md md:hidden">
        <div className="w-full space-y-2" aria-label={`Passo ${currentStep} de ${steps.length}: ${activeStep.label}`}>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-semibold text-foreground">{currentStep} de {steps.length} · {activeStep.label}</span>
            <span className="manual-microcopy">{Math.round((currentStep / steps.length) * 100)}%</span>
          </div>
          <div className="h-0.5 overflow-hidden rounded-full bg-border">
            <div className="h-full rounded-full bg-primary transition-[width] duration-manual-expand ease-out" style={{ width: progress }} />
          </div>
        </div>
      </div>

      <div className="hidden items-center justify-between px-1 py-1 sm:justify-center sm:gap-3 md:flex md:py-2">
        {steps.map((step, index) => {
          const isCompleted = visitedSteps.includes(step.id) && step.id < currentStep;
          const isCurrent = step.id === currentStep;
          const isVisited = visitedSteps.includes(step.id);
          const isFuture = !isVisited && step.id > currentStep;
          const canClick = isVisited;
          const isLast = index === steps.length - 1;

          return (
            <div key={step.id} className="flex items-center flex-1 sm:flex-none last:flex-none">
              <button
                onClick={() => canClick && onStepClick(step.id)}
                disabled={!canClick}
                className={cn(
                  "flex items-center gap-1.5 px-1 py-1 transition-all duration-200",
                  canClick && "cursor-pointer hover:text-foreground",
                  isFuture && "cursor-not-allowed opacity-60"
                )}
                aria-current={isCurrent ? 'step' : undefined}
                aria-label={`Passo ${step.id}: ${step.label}`}
              >
                {/* Compact circle */}
                <div
                  className={cn(
                    "h-5 w-5 rounded-full flex items-center justify-center border transition-all duration-200 shrink-0",
                    isCompleted && "border-success text-success",
                    isCurrent && "border-primary text-primary",
                    !isCompleted && !isCurrent && isVisited && "border-muted-foreground/30 text-muted-foreground",
                    isFuture && "border-muted-foreground/20 text-muted-foreground/50"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-3 w-3" />
                  ) : isCurrent ? (
                    <span className="h-2 w-2 rounded-full bg-primary" />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                  )}
                </div>

                {/* Label - only show for current step on mobile, all on sm+ */}
                <span
                  className={cn(
                    "text-xs sm:text-sm font-medium transition-all duration-200",
                    isCurrent ? "inline" : "hidden sm:inline",
                    isCurrent && "text-foreground font-semibold",
                    isCompleted && "text-muted-foreground",
                    !isCompleted && !isCurrent && isVisited && "text-muted-foreground",
                    isFuture && "text-muted-foreground/50"
                  )}
                >
                  {step.label}
                </span>
              </button>

              {/* Connector line - responsive width */}
              {!isLast && (
                <div 
                  className={cn(
                    "flex-1 sm:w-10 h-px mx-1 transition-all duration-200 min-w-2",
                    step.id < currentStep ? "bg-success/70" : "bg-border"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
