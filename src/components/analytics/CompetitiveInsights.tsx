import { Lightbulb, TrendingUp, TrendingDown, Target, Zap, Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AccountStats } from "./AccountRanking";

interface CompetitiveInsightsProps {
  myAccount: string;
  myStats: AccountStats | null;
  competitorStats: AccountStats[];
}

export function CompetitiveInsights({ myAccount, myStats, competitorStats }: CompetitiveInsightsProps) {
  if (!myStats || competitorStats.length === 0) {
    return (
      <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            Insights Competitivos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Seleccione a sua conta e concorrentes para ver insights
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calculate insights
  const allAccounts = [myStats, ...competitorStats].sort((a, b) => b.avgEngagement - a.avgEngagement);
  const myRank = allAccounts.findIndex(a => a.username === myAccount) + 1;
  const totalAccounts = allAccounts.length;

  const avgCompetitorEngagement = competitorStats.reduce((sum, c) => sum + c.avgEngagement, 0) / competitorStats.length;
  const engagementDiff = ((myStats.avgEngagement - avgCompetitorEngagement) / avgCompetitorEngagement) * 100;
  const isAboveAverage = engagementDiff > 0;

  const avgCompetitorPosts = competitorStats.reduce((sum, c) => sum + c.postCount, 0) / competitorStats.length;
  const postDiff = ((myStats.postCount - avgCompetitorPosts) / avgCompetitorPosts) * 100;

  const topCompetitor = competitorStats.reduce((best, c) => 
    c.avgEngagement > best.avgEngagement ? c : best
  , competitorStats[0]);

  const topCompetitorDiff = ((topCompetitor.avgEngagement - myStats.avgEngagement) / myStats.avgEngagement) * 100;

  // Find what I'm best at
  const myBestMetric = myStats.avgLikes > myStats.avgComments ? "likes" : "comentários";

  const insights = [
    {
      icon: myRank <= 3 ? Award : (myRank <= Math.ceil(totalAccounts / 2) ? TrendingUp : TrendingDown),
      color: myRank <= 3 ? "text-yellow-500" : (myRank <= Math.ceil(totalAccounts / 2) ? "text-green-500" : "text-red-500"),
      bgColor: myRank <= 3 ? "bg-yellow-50 dark:bg-yellow-950/30" : (myRank <= Math.ceil(totalAccounts / 2) ? "bg-green-50 dark:bg-green-950/30" : "bg-red-50 dark:bg-red-950/30"),
      text: myRank === 1 
        ? `🏆 Lidera o ranking em engagement médio!` 
        : `Está em ${myRank}º lugar de ${totalAccounts} contas em engagement médio`,
      badge: myRank <= 3 ? "Top 3" : null,
    },
    {
      icon: isAboveAverage ? TrendingUp : TrendingDown,
      color: isAboveAverage ? "text-green-500" : "text-red-500",
      bgColor: isAboveAverage ? "bg-green-50 dark:bg-green-950/30" : "bg-red-50 dark:bg-red-950/30",
      text: isAboveAverage
        ? `O seu engagement é ${Math.abs(engagementDiff).toFixed(0)}% acima da média dos concorrentes`
        : `O seu engagement está ${Math.abs(engagementDiff).toFixed(0)}% abaixo da média dos concorrentes`,
      badge: isAboveAverage ? "Acima" : "Abaixo",
    },
    {
      icon: Zap,
      color: "text-purple-500",
      bgColor: "bg-purple-50 dark:bg-purple-950/30",
      text: `O seu ponto forte são os ${myBestMetric} (${myBestMetric === "likes" ? myStats.avgLikes.toLocaleString() : myStats.avgComments.toLocaleString()} por post)`,
      badge: "Força",
    },
    {
      icon: Target,
      color: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
      text: topCompetitorDiff > 0
        ? `@${topCompetitor.username} tem ${topCompetitorDiff.toFixed(0)}% mais engagement - é o seu principal rival`
        : `Supera @${topCompetitor.username}, o segundo melhor, em ${Math.abs(topCompetitorDiff).toFixed(0)}%`,
      badge: "Rival",
    },
  ];

  // Add posting frequency insight
  if (Math.abs(postDiff) > 20) {
    insights.push({
      icon: postDiff > 0 ? TrendingUp : TrendingDown,
      color: "text-orange-500",
      bgColor: "bg-orange-50 dark:bg-orange-950/30",
      text: postDiff > 0
        ? `Publica ${Math.abs(postDiff).toFixed(0)}% mais que a média dos concorrentes`
        : `Concorrentes publicam ${Math.abs(postDiff).toFixed(0)}% mais que a sua conta`,
      badge: "Frequência",
    });
  }

  return (
    <Card className="border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50/50 to-transparent dark:from-amber-950/20 dark:to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-amber-500" />
          Insights Competitivos
          <Badge variant="outline" className="ml-auto border-amber-400 text-amber-600">
            @{myAccount}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight, index) => {
          const Icon = insight.icon;
          return (
            <div 
              key={index} 
              className={`flex items-start gap-3 p-3 rounded-lg ${insight.bgColor}`}
            >
              <Icon className={`h-5 w-5 ${insight.color} flex-shrink-0 mt-0.5`} />
              <span className="text-sm flex-1">{insight.text}</span>
              {insight.badge && (
                <Badge variant="secondary" className="text-xs flex-shrink-0">
                  {insight.badge}
                </Badge>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}