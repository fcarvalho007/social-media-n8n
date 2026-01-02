import { Heart, MessageCircle, Eye, TrendingUp, Award, BarChart3, ArrowUp, ArrowDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AnalyticsStats } from "@/hooks/useInstagramAnalytics";

interface KPICardsProps {
  stats: AnalyticsStats;
  previousStats?: AnalyticsStats | null;
}

export function KPICards({ stats, previousStats }: KPICardsProps) {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const calculateChange = (current: number, previous: number | undefined) => {
    if (!previous || previous === 0) return null;
    return ((current - previous) / previous) * 100;
  };

  const kpis = [
    {
      label: "Total Posts",
      value: stats.totalPosts,
      previousValue: previousStats?.totalPosts,
      icon: BarChart3,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      tooltip: "Número total de publicações analisadas",
    },
    {
      label: "Total Likes",
      value: stats.totalLikes,
      previousValue: previousStats?.totalLikes,
      icon: Heart,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      tooltip: "Soma de todos os likes nas publicações",
    },
    {
      label: "Comentários",
      value: stats.totalComments,
      previousValue: previousStats?.totalComments,
      icon: MessageCircle,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      tooltip: "Soma de todos os comentários",
    },
    {
      label: "Visualizações",
      value: stats.totalViews,
      previousValue: previousStats?.totalViews,
      icon: Eye,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      tooltip: "Total de visualizações (vídeos)",
    },
    {
      label: "Média Likes",
      value: stats.avgLikes,
      previousValue: previousStats?.avgLikes,
      icon: TrendingUp,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      tooltip: "Média de likes por publicação",
    },
    {
      label: "Média Engagement",
      value: stats.avgEngagement,
      previousValue: previousStats?.avgEngagement,
      icon: Award,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
      tooltip: "Média de likes + comentários por post",
    },
  ];

  return (
    <TooltipProvider>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((kpi) => {
          const change = calculateChange(
            typeof kpi.value === "number" ? kpi.value : 0,
            kpi.previousValue
          );
          const isPositive = change !== null && change > 0;
          const isNegative = change !== null && change < 0;

          return (
            <Tooltip key={kpi.label}>
              <TooltipTrigger asChild>
                <Card className="border-border/50 hover:border-border transition-colors cursor-default group">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className={`p-1.5 rounded-lg ${kpi.bgColor}`}>
                        <kpi.icon className={`h-3.5 w-3.5 ${kpi.color}`} />
                      </div>
                      {change !== null && Math.abs(change) >= 1 && (
                        <div
                          className={`flex items-center gap-0.5 text-xs font-medium ${
                            isPositive
                              ? "text-green-600"
                              : isNegative
                              ? "text-red-500"
                              : "text-muted-foreground"
                          }`}
                        >
                          {isPositive ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          )}
                          {Math.abs(change).toFixed(0)}%
                        </div>
                      )}
                    </div>
                    <p className="text-xl font-bold tracking-tight">
                      {formatNumber(typeof kpi.value === "number" ? kpi.value : 0)}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {kpi.label}
                    </p>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{kpi.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
