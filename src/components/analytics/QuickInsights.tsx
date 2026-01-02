import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, TrendingUp, Calendar, Zap, Target } from "lucide-react";
import type { AnalyticsStats, InstagramAnalyticsItem } from "@/hooks/useInstagramAnalytics";

interface QuickInsightsProps {
  stats: AnalyticsStats;
  analytics: InstagramAnalyticsItem[];
}

export function QuickInsights({ stats, analytics }: QuickInsightsProps) {
  const insights: { icon: React.ReactNode; text: string; highlight?: string }[] = [];

  // Best post insight
  if (stats.bestPost) {
    const bestEngagement = stats.bestPost.likes_count + stats.bestPost.comments_count;
    insights.push({
      icon: <TrendingUp className="h-4 w-4 text-green-500" />,
      text: "O melhor post teve",
      highlight: `${bestEngagement.toLocaleString()} interações`,
    });
  }

  // Posts per week
  const postsPerWeek = stats.totalPosts > 0 ? Math.round((stats.totalPosts / 30) * 7) : 0;
  if (postsPerWeek > 0) {
    insights.push({
      icon: <Calendar className="h-4 w-4 text-blue-500" />,
      text: "Publica em média",
      highlight: `${postsPerWeek}x por semana`,
    });
  }

  // Content type comparison
  if (stats.contentTypeBreakdown.length > 1) {
    const sorted = [...stats.contentTypeBreakdown].sort((a, b) => b.avgEngagement - a.avgEngagement);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    
    if (best && worst && best.type !== worst.type && best.avgEngagement > worst.avgEngagement * 1.2) {
      const typeLabels: Record<string, string> = {
        Image: "Imagens",
        Video: "Vídeos",
        Sidecar: "Carrosséis",
        Reel: "Reels",
      };
      const improvement = Math.round(((best.avgEngagement - worst.avgEngagement) / worst.avgEngagement) * 100);
      insights.push({
        icon: <Zap className="h-4 w-4 text-yellow-500" />,
        text: `${typeLabels[best.type] || best.type} têm`,
        highlight: `+${improvement}% mais engagement`,
      });
    }
  }

  // Engagement consistency
  if (stats.engagementOverTime.length >= 2) {
    const recentMonths = stats.engagementOverTime.slice(-3);
    const olderMonths = stats.engagementOverTime.slice(0, -3);
    
    if (recentMonths.length > 0 && olderMonths.length > 0) {
      const recentAvg = recentMonths.reduce((sum, m) => sum + m.likes + m.comments, 0) / recentMonths.reduce((sum, m) => sum + m.posts, 0);
      const olderAvg = olderMonths.reduce((sum, m) => sum + m.likes + m.comments, 0) / olderMonths.reduce((sum, m) => sum + m.posts, 0);
      
      if (recentAvg > olderAvg * 1.1) {
        const improvement = Math.round(((recentAvg - olderAvg) / olderAvg) * 100);
        insights.push({
          icon: <Target className="h-4 w-4 text-purple-500" />,
          text: "Últimos meses com",
          highlight: `+${improvement}% engagement`,
        });
      } else if (olderAvg > recentAvg * 1.1) {
        const decline = Math.round(((olderAvg - recentAvg) / olderAvg) * 100);
        insights.push({
          icon: <Target className="h-4 w-4 text-orange-500" />,
          text: "Engagement recente caiu",
          highlight: `-${decline}%`,
        });
      }
    }
  }

  // Top hashtag insight
  if (stats.topHashtags.length > 0) {
    const topHashtag = stats.topHashtags[0];
    insights.push({
      icon: <Lightbulb className="h-4 w-4 text-amber-500" />,
      text: `Hashtag mais usada:`,
      highlight: `#${topHashtag.tag} (${topHashtag.count}x)`,
    });
  }

  if (insights.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-amber-500" />
          Insights Rápidos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {insights.slice(0, 5).map((insight, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              {insight.icon}
              <span className="text-sm text-muted-foreground">
                {insight.text}{" "}
                <span className="font-semibold text-foreground">{insight.highlight}</span>
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
