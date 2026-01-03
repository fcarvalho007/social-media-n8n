import { Heart, MessageCircle, Eye, TrendingUp, BarChart3, ArrowUp, ArrowDown, Ratio, Calendar } from "lucide-react";
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

  // Calculate likes/comments ratio
  const likesCommentsRatio = stats.totalComments > 0 
    ? Math.round(stats.totalLikes / stats.totalComments) 
    : 0;

  // Calculate posts per week (assuming data covers at least a week)
  const postsPerWeek = stats.totalPosts > 0 
    ? Math.round((stats.totalPosts / 30) * 7) 
    : 0;

  // Calculate engagement rate
  const engagementRate = stats.totalPosts > 0 
    ? ((stats.totalLikes + stats.totalComments) / stats.totalPosts).toFixed(0)
    : "0";

  const kpis = [
    {
      label: "Total Posts",
      value: stats.totalPosts,
      previousValue: previousStats?.totalPosts,
      icon: BarChart3,
      gradient: "from-blue-500/20 to-blue-600/10",
      iconBg: "bg-blue-500/15",
      iconColor: "text-blue-500",
      tooltip: "Número total de publicações analisadas",
    },
    {
      label: "Total Likes",
      value: stats.totalLikes,
      previousValue: previousStats?.totalLikes,
      icon: Heart,
      gradient: "from-rose-500/20 to-rose-600/10",
      iconBg: "bg-rose-500/15",
      iconColor: "text-rose-500",
      tooltip: "Soma de todos os likes nas publicações",
    },
    {
      label: "Comentários",
      value: stats.totalComments,
      previousValue: previousStats?.totalComments,
      icon: MessageCircle,
      gradient: "from-emerald-500/20 to-emerald-600/10",
      iconBg: "bg-emerald-500/15",
      iconColor: "text-emerald-500",
      tooltip: "Soma de todos os comentários",
    },
    {
      label: "Eng. Médio",
      value: Number(engagementRate),
      previousValue: previousStats ? Math.round((previousStats.totalLikes + previousStats.totalComments) / (previousStats.totalPosts || 1)) : undefined,
      icon: TrendingUp,
      gradient: "from-orange-500/20 to-orange-600/10",
      iconBg: "bg-orange-500/15",
      iconColor: "text-orange-500",
      tooltip: "Engagement médio por post (likes + comentários)",
    },
    {
      label: "Visualizações",
      value: stats.totalViews,
      previousValue: previousStats?.totalViews,
      icon: Eye,
      gradient: "from-violet-500/20 to-violet-600/10",
      iconBg: "bg-violet-500/15",
      iconColor: "text-violet-500",
      tooltip: "Total de visualizações (vídeos)",
    },
    {
      label: "Posts/Semana",
      value: postsPerWeek,
      previousValue: undefined,
      icon: Calendar,
      gradient: "from-cyan-500/20 to-cyan-600/10",
      iconBg: "bg-cyan-500/15",
      iconColor: "text-cyan-500",
      tooltip: "Média de posts por semana (estimado)",
    },
  ];

  return (
    <TooltipProvider>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3" id="kpi-cards">
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
                  className={`relative overflow-hidden border-border/50 hover:border-border hover:shadow-lg transition-all duration-300 cursor-default group bg-gradient-to-br ${kpi.gradient}`}
                  style={{ 
                    animationDelay: `${index * 50}ms`,
                  }}
                >
                  <CardContent className="p-3 relative z-10">
                    <div className="flex items-start justify-between mb-2">
                      <div className={`p-1.5 rounded-lg ${kpi.iconBg} transition-transform group-hover:scale-110`}>
                        <kpi.icon className={`h-3.5 w-3.5 ${kpi.iconColor}`} />
                      </div>
                      {change !== null && Math.abs(change) >= 1 && (
                        <div
                          className={`flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                            isPositive
                              ? "text-emerald-600 bg-emerald-500/15"
                              : isNegative
                              ? "text-rose-500 bg-rose-500/15"
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
                    <p className="text-xl font-bold tracking-tight group-hover:scale-105 transition-transform origin-left">
                      {formatNumber(typeof kpi.value === "number" ? kpi.value : 0)}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {kpi.label}
                    </p>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[200px]">
                <p>{kpi.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}