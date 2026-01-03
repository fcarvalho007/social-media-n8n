import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, TrendingUp, Calendar, Zap, Target } from "lucide-react";
import type { AnalyticsStats, InstagramAnalyticsItem } from "@/hooks/useInstagramAnalytics";

interface QuickInsightsProps {
  stats: AnalyticsStats;
  analytics: InstagramAnalyticsItem[];
}

export function QuickInsights({ stats, analytics }: QuickInsightsProps) {
  const insights: { icon: React.ReactNode; text: string; highlight?: string; color: string }[] = [];

  // Best post insight
  if (stats.bestPost) {
    const bestEngagement = stats.bestPost.likes_count + stats.bestPost.comments_count;
    insights.push({
      icon: <TrendingUp className="h-4 w-4" />,
      text: "O melhor post teve",
      highlight: `${bestEngagement.toLocaleString()} interações`,
      color: "text-emerald-500 bg-emerald-500/15",
    });
  }

  // Posts per week - calculate actual weeks from data range
  const postsWithDates = analytics.filter(p => p.posted_at);
  if (postsWithDates.length > 0) {
    const dates = postsWithDates.map(p => new Date(p.posted_at!).getTime()).filter(d => !isNaN(d));
    if (dates.length > 0) {
      const minDate = Math.min(...dates);
      const maxDate = Math.max(...dates);
      const msPerWeek = 7 * 24 * 60 * 60 * 1000;
      const weeks = Math.max(1, Math.ceil((maxDate - minDate) / msPerWeek));
      const postsPerWeek = Math.round((stats.totalPosts / weeks) * 10) / 10;
      
      insights.push({
        icon: <Calendar className="h-4 w-4" />,
        text: `Publica em média`,
        highlight: `${postsPerWeek}x por semana`,
        color: "text-blue-500 bg-blue-500/15",
      });
    }
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
        icon: <Zap className="h-4 w-4" />,
        text: `${typeLabels[best.type] || best.type} têm`,
        highlight: `+${improvement}% mais engagement`,
        color: "text-amber-500 bg-amber-500/15",
      });
    }
  }

  // Engagement consistency
  if (stats.engagementOverTime.length >= 2) {
    const recentMonths = stats.engagementOverTime.slice(-3);
    const olderMonths = stats.engagementOverTime.slice(0, -3);
    
    if (recentMonths.length > 0 && olderMonths.length > 0) {
      const recentTotal = recentMonths.reduce((sum, m) => sum + m.posts, 0);
      const olderTotal = olderMonths.reduce((sum, m) => sum + m.posts, 0);
      
      if (recentTotal > 0 && olderTotal > 0) {
        const recentAvg = recentMonths.reduce((sum, m) => sum + m.likes + m.comments, 0) / recentTotal;
        const olderAvg = olderMonths.reduce((sum, m) => sum + m.likes + m.comments, 0) / olderTotal;
        
        if (recentAvg > olderAvg * 1.1) {
          const improvement = Math.round(((recentAvg - olderAvg) / olderAvg) * 100);
          insights.push({
            icon: <Target className="h-4 w-4" />,
            text: "Últimos meses com",
            highlight: `+${improvement}% engagement`,
            color: "text-violet-500 bg-violet-500/15",
          });
        } else if (olderAvg > recentAvg * 1.1) {
          const decline = Math.round(((olderAvg - recentAvg) / olderAvg) * 100);
          insights.push({
            icon: <Target className="h-4 w-4" />,
            text: "Engagement recente caiu",
            highlight: `-${decline}%`,
            color: "text-orange-500 bg-orange-500/15",
          });
        }
      }
    }
  }

  // Top hashtag insight
  if (stats.topHashtags.length > 0) {
    const topHashtag = stats.topHashtags[0];
    insights.push({
      icon: <Lightbulb className="h-4 w-4" />,
      text: `Hashtag mais usada:`,
      highlight: `#${topHashtag.tag} (${topHashtag.count}x)`,
      color: "text-rose-500 bg-rose-500/15",
    });
  }

  if (insights.length === 0) {
    return null;
  }

  return (
    <Card className="overflow-hidden bg-gradient-to-br from-card to-muted/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/15">
            <Lightbulb className="h-4 w-4 text-amber-500" />
          </div>
          Insights Rápidos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {insights.slice(0, 5).map((insight, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-2.5 rounded-xl bg-background/80 hover:bg-background transition-colors border border-transparent hover:border-border/50"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className={`p-2 rounded-lg ${insight.color}`}>
                {insight.icon}
              </div>
              <span className="text-sm text-muted-foreground flex-1">
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