import { Lightbulb, TrendingUp, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface InsightBoxProps {
  title: string;
  description: string;
  insights: {
    forYou: string;
    fromData: string;
  };
  className?: string;
}

export function InsightBox({ title, description, insights, className }: InsightBoxProps) {
  return (
    <div 
      className={cn(
        "rounded-lg border-2 border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/40 p-3 space-y-2",
        className
      )}
    >
      <div className="flex items-start gap-2">
        <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
            O que é isto?
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-300">
            {description}
          </p>
        </div>
      </div>
      
      <div className="space-y-1.5 pl-6">
        <div className="flex items-start gap-2 text-xs">
          <User className="h-3 w-3 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <span className="text-amber-700 dark:text-amber-300">{insights.forYou}</span>
        </div>
        <div className="flex items-start gap-2 text-xs">
          <TrendingUp className="h-3 w-3 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <span className="text-amber-700 dark:text-amber-300">{insights.fromData}</span>
        </div>
      </div>
    </div>
  );
}
