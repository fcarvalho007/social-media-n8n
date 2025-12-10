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
    <div className="w-full px-4 py-3">
      <div className="flex items-center justify-between relative">
        {/* Connecting line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-border mx-12" />
        
        {/* Progress line */}
        <div 
          className="absolute top-5 left-0 h-0.5 bg-primary mx-12 transition-all duration-500"
          style={{ 
            width: `calc(${((Math.max(1, currentStep) - 1) / (steps.length - 1)) * 100}% - 6rem)` 
          }}
        />

        {steps.map((step) => {
          const isCompleted = visitedSteps.includes(step.id) && step.id < currentStep;
          const isCurrent = step.id === currentStep;
          const isVisited = visitedSteps.includes(step.id);
          const canClick = isVisited;

          return (
            <button
              key={step.id}
              onClick={() => canClick && onStepClick(step.id)}
              disabled={!canClick}
              className={cn(
                "flex flex-col items-center gap-2 relative z-10 transition-all duration-300",
                canClick ? "cursor-pointer" : "cursor-default"
              )}
            >
              {/* Circle */}
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                  isCompleted && "bg-green-500 border-green-500 text-white",
                  isCurrent && "bg-primary border-primary text-primary-foreground scale-110",
                  !isCompleted && !isCurrent && isVisited && "bg-muted border-muted-foreground/30 text-muted-foreground",
                  !isCompleted && !isCurrent && !isVisited && "bg-muted border-muted-foreground/20 text-muted-foreground/50"
                )}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <step.icon className="h-5 w-5" />
                )}
              </div>

              {/* Label */}
              <span
                className={cn(
                  "text-xs font-medium transition-colors duration-300",
                  isCurrent && "text-primary font-semibold",
                  isCompleted && "text-green-600",
                  !isCompleted && !isCurrent && "text-muted-foreground"
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
