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
    <div className="w-full px-4 py-4">
      <div className="flex items-center justify-between relative">
        {/* Background line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-border mx-12" />
        
        {/* Animated progress line */}
        <div 
          className="absolute top-5 left-0 h-0.5 bg-gradient-to-r from-primary to-primary/80 mx-12 transition-all duration-500 ease-out"
          style={{ 
            width: `calc(${((Math.max(1, currentStep) - 1) / (steps.length - 1)) * 100}% - 6rem)` 
          }}
        />

        {steps.map((step) => {
          const isCompleted = visitedSteps.includes(step.id) && step.id < currentStep;
          const isCurrent = step.id === currentStep;
          const isVisited = visitedSteps.includes(step.id);
          const isFuture = !isVisited && step.id > currentStep;
          const canClick = isVisited;

          return (
            <button
              key={step.id}
              onClick={() => canClick && onStepClick(step.id)}
              disabled={!canClick}
              className={cn(
                "flex flex-col items-center gap-2.5 relative z-10 transition-all duration-300",
                canClick && "cursor-pointer group",
                isFuture && "cursor-not-allowed opacity-50"
              )}
              aria-current={isCurrent ? 'step' : undefined}
              aria-label={`Passo ${step.id}: ${step.label}`}
            >
              {/* Circle with pulse animation for current step */}
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                  // Completed state - green with checkmark
                  isCompleted && "bg-emerald-500 border-emerald-500 text-white shadow-sm",
                  // Current state - primary with pulse animation
                  isCurrent && "bg-primary border-primary text-primary-foreground scale-110 animate-stepper-pulse shadow-lg",
                  // Visited but not current - subtle state
                  !isCompleted && !isCurrent && isVisited && "bg-muted border-muted-foreground/30 text-muted-foreground group-hover:border-primary/50 group-hover:bg-primary/5",
                  // Future state - disabled look
                  isFuture && "bg-muted/50 border-muted-foreground/20 text-muted-foreground/50"
                )}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5 animate-scale-in" />
                ) : (
                  <step.icon className="h-5 w-5" />
                )}
              </div>

              {/* Label with improved styling */}
              <span
                className={cn(
                  "text-xs font-medium transition-all duration-300",
                  isCurrent && "text-primary font-bold",
                  isCompleted && "text-emerald-600 dark:text-emerald-400",
                  !isCompleted && !isCurrent && isVisited && "text-muted-foreground group-hover:text-foreground",
                  isFuture && "text-muted-foreground/50"
                )}
              >
                {step.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
