import { Lightbulb, TrendingUp, User, Bot, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

interface InsightBoxProps {
  title: string;
  description: string;
  insights: {
    forYou: string;
    fromData: string;
  };
  aiInsights?: string[];
  aiGeneratedAt?: string;
  isAiLoading?: boolean;
  className?: string;
}

export function InsightBox({ 
  title, 
  description, 
  insights, 
  aiInsights,
  aiGeneratedAt,
  isAiLoading,
  className 
}: InsightBoxProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {/* What is this? Section */}
      <div className="rounded-lg border-2 border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/40 p-3 space-y-2">
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

      {/* AI Insights Section - only show if we have AI insights or are loading */}
      {(aiInsights || isAiLoading) && (
        <div className="rounded-lg border-2 border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-950/40 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <p className="text-xs font-medium text-blue-800 dark:text-blue-200">
                Insights IA
              </p>
            </div>
            <Badge variant="outline" className="text-[10px] border-blue-400 text-blue-600 dark:text-blue-400 gap-1">
              <Bot className="h-3 w-3" />
              Gerado por IA
            </Badge>
          </div>
          
          {isAiLoading ? (
            <div className="flex items-center gap-2 pl-6 text-xs text-blue-600 dark:text-blue-400">
              <div className="animate-spin h-3 w-3 border-2 border-blue-500 border-t-transparent rounded-full" />
              A gerar insights...
            </div>
          ) : aiInsights && aiInsights.length > 0 ? (
            <div className="space-y-1.5 pl-6">
              {aiInsights.map((insight, index) => (
                <div key={index} className="flex items-start gap-2 text-xs">
                  <span className="text-blue-500 font-medium">•</span>
                  <span className="text-blue-700 dark:text-blue-300">{insight}</span>
                </div>
              ))}
            </div>
          ) : null}

          {aiGeneratedAt && (
            <div className="flex items-center gap-1 pl-6 text-[10px] text-blue-500 dark:text-blue-400">
              <Clock className="h-3 w-3" />
              Guardado em: {format(new Date(aiGeneratedAt), "dd/MM/yyyy 'às' HH:mm", { locale: pt })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}