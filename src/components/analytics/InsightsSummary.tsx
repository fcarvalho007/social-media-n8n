import { Lightbulb, TrendingUp, Clock, Hash, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { AnalyticsStats, InstagramAnalyticsItem } from "@/hooks/useInstagramAnalytics";

interface InsightsSummaryProps {
  stats: AnalyticsStats;
  analytics: InstagramAnalyticsItem[];
}

interface Insight {
  icon: React.ReactNode;
  text: string;
  type: "positive" | "neutral" | "tip";
}

export function InsightsSummary({ stats, analytics }: InsightsSummaryProps) {
  const insights: Insight[] = [];

  // Content type comparison
  if (stats.contentTypeBreakdown.length > 1) {
    const sorted = [...stats.contentTypeBreakdown].sort(
      (a, b) => b.avgEngagement - a.avgEngagement
    );
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];

    if (best && worst && best.avgEngagement > worst.avgEngagement * 1.2) {
      const typeLabel =
        best.type === "Sidecar"
          ? "Carrosséis"
          : best.type === "Video"
          ? "Vídeos"
          : "Imagens";
      const ratio = (best.avgEngagement / worst.avgEngagement).toFixed(1);
      insights.push({
        icon: <Sparkles className="h-4 w-4 text-yellow-500" />,
        text: `${typeLabel} geram ${ratio}x mais engagement`,
        type: "positive",
      });
    }
  }

  // Best posting time analysis
  if (analytics.length >= 10) {
    const hourMap = new Map<number, { total: number; count: number }>();
    const dayMap = new Map<number, { total: number; count: number }>();

    analytics.forEach((post) => {
      if (!post.posted_at) return;
      const date = new Date(post.posted_at);
      const hour = date.getHours();
      const day = date.getDay();
      const engagement = (post.likes_count || 0) + (post.comments_count || 0);

      const hourData = hourMap.get(hour) || { total: 0, count: 0 };
      hourMap.set(hour, {
        total: hourData.total + engagement,
        count: hourData.count + 1,
      });

      const dayData = dayMap.get(day) || { total: 0, count: 0 };
      dayMap.set(day, {
        total: dayData.total + engagement,
        count: dayData.count + 1,
      });
    });

    // Find best hour
    let bestHour = 0;
    let bestHourAvg = 0;
    hourMap.forEach((data, hour) => {
      const avg = data.total / data.count;
      if (avg > bestHourAvg) {
        bestHourAvg = avg;
        bestHour = hour;
      }
    });

    // Find best day
    const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    let bestDay = 0;
    let bestDayAvg = 0;
    dayMap.forEach((data, day) => {
      const avg = data.total / data.count;
      if (avg > bestDayAvg) {
        bestDayAvg = avg;
        bestDay = day;
      }
    });

    insights.push({
      icon: <Clock className="h-4 w-4 text-blue-500" />,
      text: `Melhor horário: ${dayNames[bestDay]} às ${bestHour}h`,
      type: "tip",
    });
  }

  // Top hashtag insight
  if (stats.topHashtags.length > 0) {
    const topTag = stats.topHashtags[0];
    insights.push({
      icon: <Hash className="h-4 w-4 text-purple-500" />,
      text: `#${topTag.tag} é a hashtag mais usada (${topTag.count}x)`,
      type: "neutral",
    });
  }

  // Engagement trend (if we have time series data)
  if (stats.engagementOverTime.length >= 2) {
    const recent = stats.engagementOverTime.slice(-2);
    if (recent.length === 2) {
      const prevEngagement = recent[0].likes + recent[0].comments;
      const currEngagement = recent[1].likes + recent[1].comments;

      if (prevEngagement > 0) {
        const change = ((currEngagement - prevEngagement) / prevEngagement) * 100;
        if (Math.abs(change) >= 5) {
          insights.push({
            icon: <TrendingUp className={`h-4 w-4 ${change > 0 ? "text-green-500" : "text-red-500"}`} />,
            text: `${change > 0 ? "+" : ""}${change.toFixed(0)}% engagement vs mês anterior`,
            type: change > 0 ? "positive" : "neutral",
          });
        }
      }
    }
  }

  if (insights.length === 0) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-2 mb-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Insights</span>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {insights.map((insight, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              {insight.icon}
              <span>{insight.text}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
