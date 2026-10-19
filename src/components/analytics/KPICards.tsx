import { memo, useMemo } from "react";
import { Heart, MessageCircle, Eye, TrendingUp, BarChart3, ArrowUp, ArrowDown, Layers } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AnimatedNumber, formatCompactNumber } from "./AnimatedNumber";
import type { AnalyticsStats } from "@/hooks/useInstagramAnalytics";

interface KPICardsProps {
  stats: AnalyticsStats;
  previousStats?: AnalyticsStats | null;
}

export const KPICards = memo(function KPICards({ stats, previousStats }: KPICardsProps) {
  const calculateChange = (current: number, previous: number | undefined) => {
    if (!previous || previous === 0) return null;
    return ((current - previous) / previous) * 100;
  };

  // Calculate engagement rate
  const engagementRate = stats.totalPosts > 0 
    ? Math.round((stats.totalLikes + stats.totalComments) / stats.totalPosts)
    : 0;

  const kpis = useMemo(() => [
    {
      label: "Publicações",
      value: stats.totalPosts,
      previousValue: previousStats?.totalPosts,
      icon: BarChart3,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      tooltip: "Número total de publicações analisadas",
    },
    {
      label: "Gostos",
      value: stats.totalLikes,
      previousValue: previousStats?.totalLikes,
      icon: Heart,
      iconBg: "bg-rose-500/10",
      iconColor: "text-rose-500",
      tooltip: "Soma de todos os likes nas publicações",
    },
    {
      label: "Comentários",
      value: stats.totalComments,
      previousValue: previousStats?.totalComments,
      icon: MessageCircle,
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-500",
      tooltip: "Soma de todos os comentários",
    },
    {
      label: "Interações / publicação",
      value: engagementRate,
      previousValue: previousStats ? Math.round((previousStats.totalLikes + previousStats.totalComments) / (previousStats.totalPosts || 1)) : undefined,
      icon: TrendingUp,
      iconBg: "bg-orange-500/10",
      iconColor: "text-orange-500",
      tooltip: "Engagement médio por post (likes + comentários)",
    },
    {
      label: "Visualizações registadas",
      value: stats.totalViews > 0 ? stats.totalViews : null,
      previousValue: previousStats?.totalViews,
      icon: Eye,
      iconBg: "bg-accent",
      iconColor: "text-primary",
      tooltip: "Soma das visualizações no ficheiro. Sem valores positivos, o histórico não permite distinguir zero de dados ausentes.",
    },
    {
      label: "Formatos na amostra",
      value: stats.contentTypeBreakdown.length,
      previousValue: undefined,
      icon: Layers,
      iconBg: "bg-cyan-500/10",
      iconColor: "text-cyan-500",
      tooltip: "Quantidade de formatos diferentes presentes nas publicações importadas",
    },
  ], [stats, previousStats, engagementRate]);

  return (
    <TooltipProvider>
      <div 
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4" 
        id="kpi-cards"
        role="region"
        aria-label="Indicadores de performance"
      >
        {kpis.map((kpi, index) => {
          const change = calculateChange(
            typeof kpi.value === "number" ? kpi.value : 0,
            kpi.previousValue
          );
          const isPositive = change !== null && change > 0;
          const isNegative = change !== null && change < 0;

          return (
            <Tooltip key={kpi.label}>
              <TooltipTrigger asChild>
                <Card 
                  className="relative overflow-hidden border-border bg-card hover:border-primary/30 transition-colors cursor-default group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  style={{ 
                    animationDelay: `${index * 50}ms`,
                  }}
                  tabIndex={0}
                  role="article"
                  aria-label={`${kpi.label}: ${typeof kpi.value === "number" ? formatCompactNumber(kpi.value) : "indisponível"}${change !== null ? `, ${isPositive ? 'aumento' : 'diminuição'} de ${Math.abs(change).toFixed(0)}%` : ''}`}
                >
                  <CardContent className="p-4 sm:p-5">
                    {/* Header with icon and change badge */}
                    <div className="flex items-center justify-between mb-3">
                      <div className={`p-2.5 rounded-xl ${kpi.iconBg} `} aria-hidden="true">
                        <kpi.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${kpi.iconColor}`} />
                      </div>
                      {change !== null && Math.abs(change) >= 1 && (
                        <div
                          className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-1 rounded-full ${
                            isPositive
                              ? "text-emerald-600 bg-emerald-500/10"
                              : isNegative
                              ? "text-rose-500 bg-rose-500/10"
                              : "text-muted-foreground"
                          }`}
                          aria-label={`${isPositive ? 'Aumento' : 'Diminuição'} de ${Math.abs(change).toFixed(0)} por cento`}
                        >
                          {isPositive ? (
                            <ArrowUp className="h-3 w-3" aria-hidden="true" />
                          ) : (
                            <ArrowDown className="h-3 w-3" aria-hidden="true" />
                          )}
                          {Math.abs(change).toFixed(0)}%
                        </div>
                      )}
                    </div>
                    
                    {/* Value - large and bold with animation */}
                    <p className="text-2xl sm:text-3xl font-semibold tracking-tight tabular-nums text-foreground mb-1">
                      {typeof kpi.value === "number" ? <AnimatedNumber value={kpi.value} formatFn={formatCompactNumber} /> : <span>—</span>}
                    </p>
                    
                    {/* Label - uppercase tracking */}
                    <p className="text-xs tracking-normal text-muted-foreground font-medium">
                      {kpi.label}
                    </p>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent 
                side="bottom" 
                className="max-w-[200px] rounded-xl shadow-xl"
              >
                <p>{kpi.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
});
