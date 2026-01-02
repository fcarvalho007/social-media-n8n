import { Heart, MessageCircle, Eye, TrendingUp, Award, BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { AnalyticsStats } from "@/hooks/useInstagramAnalytics";

interface KPICardsProps {
  stats: AnalyticsStats;
}

export function KPICards({ stats }: KPICardsProps) {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const kpis = [
    {
      label: "Total Posts",
      value: stats.totalPosts,
      icon: BarChart3,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Total Likes",
      value: formatNumber(stats.totalLikes),
      icon: Heart,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
    {
      label: "Total Comentários",
      value: formatNumber(stats.totalComments),
      icon: MessageCircle,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      label: "Visualizações",
      value: formatNumber(stats.totalViews),
      icon: Eye,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      label: "Média Likes",
      value: formatNumber(stats.avgLikes),
      icon: TrendingUp,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      label: "Média Engagement",
      value: formatNumber(stats.avgEngagement),
      icon: Award,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
