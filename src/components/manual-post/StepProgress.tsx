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
  return (
    <div className="w-full py-1 sm:py-2">
      <div className="flex items-center justify-between px-1 sm:justify-center sm:gap-2">
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
                  "flex items-center gap-0.5 xs:gap-1 sm:gap-1.5 px-1 py-0.5 xs:px-1.5 xs:py-1 sm:px-2 sm:py-1.5 rounded-full transition-all duration-200",
                  canClick && "cursor-pointer hover:bg-muted/50 active:scale-95",
                  isFuture && "cursor-not-allowed opacity-50",
                  isCurrent && "bg-primary/10"
                )}
                aria-current={isCurrent ? 'step' : undefined}
                aria-label={`Passo ${step.id}: ${step.label}`}
              >
                {/* Compact circle */}
                <div
                  className={cn(
                    "w-5 h-5 xs:w-6 xs:h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center border-2 transition-all duration-200 shrink-0",
                    isCompleted && "bg-emerald-500 border-emerald-500 text-white",
                    isCurrent && "bg-primary border-primary text-primary-foreground",
                    !isCompleted && !isCurrent && isVisited && "bg-muted border-muted-foreground/30 text-muted-foreground",
                    isFuture && "bg-muted/50 border-muted-foreground/20 text-muted-foreground/50"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <step.icon className="h-3 w-3" />
                  )}
                </div>

                {/* Label - only show for current step on mobile, all on sm+ */}
                <span
                  className={cn(
                    "text-[10px] sm:text-xs font-medium transition-all duration-200",
                    isCurrent ? "inline" : "hidden sm:inline",
                    isCurrent && "text-primary font-semibold",
                    isCompleted && "text-emerald-600 dark:text-emerald-400",
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
                    "flex-1 sm:w-8 h-0.5 mx-0.5 sm:mx-1 transition-all duration-200 min-w-2",
                    step.id < currentStep ? "bg-emerald-500" : "bg-border"
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
