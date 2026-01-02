import { Trophy, Heart, MessageCircle, BarChart3, Star, Lightbulb, TrendingUp, ChevronDown, ChevronUp, HelpCircle } from "lucide-react";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getAccountColor, MY_ACCOUNT_COLOR } from "@/lib/analytics/colors";

export interface AccountStats {
  username: string;
  postCount: number;
  totalLikes: number;
  totalComments: number;
  totalViews: number;
  avgLikes: number;
  avgComments: number;
  avgEngagement: number;
  colorIndex: number;
  contentTypes?: { image: number; video: number; sidecar: number };
}

interface AccountRankingProps {
  accounts: AccountStats[];
  sortBy?: "avgEngagement" | "totalLikes" | "postCount" | "avgLikes";
  myAccount?: string;
}

export function AccountRanking({ accounts, sortBy = "avgEngagement", myAccount }: AccountRankingProps) {
  const [showInsights, setShowInsights] = useState(true);
  
  const sortedAccounts = [...accounts].sort((a, b) => b[sortBy] - a[sortBy]);
  const maxValue = sortedAccounts[0]?.[sortBy] || 1;

  // Calculate insights
  const insights = useMemo(() => {
    if (!myAccount || sortedAccounts.length < 2) return [];
    
    const myStats = sortedAccounts.find(a => a.username === myAccount);
    const myRank = sortedAccounts.findIndex(a => a.username === myAccount) + 1;
    const leader = sortedAccounts[0];
    
    if (!myStats) return [];
    
    const insightsList: { icon: React.ReactNode; text: string; highlight?: string }[] = [];
    
    // Insight 1: Engagement comparison with leader
    if (leader.username !== myAccount) {
      const engagementDiff = leader.avgEngagement - myStats.avgEngagement;
      const multiplier = leader.avgEngagement / Math.max(myStats.avgEngagement, 1);
      if (multiplier > 1.5) {
        insightsList.push({
          icon: <TrendingUp className="h-4 w-4 text-amber-500" />,
          text: `@${leader.username} tem`,
          highlight: `${multiplier.toFixed(0)}x mais engagement`
        });
      } else if (engagementDiff > 0) {
        insightsList.push({
          icon: <TrendingUp className="h-4 w-4 text-amber-500" />,
          text: `@${leader.username} tem +${Math.round(engagementDiff)} engagement médio`
        });
      }
    }
    
    // Insight 2: Likes comparison
    if (leader.username !== myAccount) {
      const likesDiff = leader.avgLikes - myStats.avgLikes;
      if (likesDiff > 50) {
        insightsList.push({
          icon: <Heart className="h-4 w-4 text-red-500" />,
          text: `Líder recebe`,
          highlight: `+${Math.round(likesDiff)} likes/post`
        });
      }
    }
    
    // Insight 3: Comments comparison
    if (leader.username !== myAccount) {
      const commentsDiff = leader.avgComments - myStats.avgComments;
      if (commentsDiff > 10) {
        insightsList.push({
          icon: <MessageCircle className="h-4 w-4 text-blue-500" />,
          text: `Líder recebe`,
          highlight: `+${Math.round(commentsDiff)} comentários/post`
        });
      }
    }
    
    // Insight 4: Content type insight
    if (leader.contentTypes && myStats.contentTypes) {
      const leaderTotal = leader.contentTypes.image + leader.contentTypes.video + leader.contentTypes.sidecar;
      const leaderVideoPercent = (leader.contentTypes.video / Math.max(leaderTotal, 1)) * 100;
      const myTotal = myStats.contentTypes.image + myStats.contentTypes.video + myStats.contentTypes.sidecar;
      const myVideoPercent = (myStats.contentTypes.video / Math.max(myTotal, 1)) * 100;
      
      if (leaderVideoPercent > myVideoPercent + 20) {
        insightsList.push({
          icon: <BarChart3 className="h-4 w-4 text-purple-500" />,
          text: `Líder publica`,
          highlight: `${Math.round(leaderVideoPercent - myVideoPercent)}% mais vídeos`
        });
      }
    }
    
    // Limit to 3 insights
    return insightsList.slice(0, 3);
  }, [sortedAccounts, myAccount]);

  const getRankIcon = (index: number) => {
    if (index === 0) return <span className="text-lg">🥇</span>;
    if (index === 1) return <span className="text-lg">🥈</span>;
    if (index === 2) return <span className="text-lg">🥉</span>;
    return <span className="text-sm font-bold text-muted-foreground">{index + 1}</span>;
  };

  const formatValue = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toLocaleString();
  };

  const getSortLabel = () => {
    switch (sortBy) {
      case "avgEngagement": return "engagement médio";
      case "totalLikes": return "total de likes";
      case "postCount": return "número de posts";
      case "avgLikes": return "média de likes";
      default: return sortBy;
    }
  };

  // Find my account rank
  const myAccountRank = myAccount 
    ? sortedAccounts.findIndex(a => a.username === myAccount) + 1 
    : null;

  if (accounts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Ranking de Contas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Seleccione contas para ver o ranking
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Ranking de Contas
            </CardTitle>
            <span className="text-xs text-muted-foreground">por {getSortLabel()}</span>
          </div>
          {myAccount && myAccountRank && (
            <div className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
              <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                Está em {myAccountRank}º lugar
              </span>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {sortedAccounts.map((account, index) => {
            const progress = (account[sortBy] / maxValue) * 100;
            const isMyAccount = account.username === myAccount;
            const color = isMyAccount ? MY_ACCOUNT_COLOR : getAccountColor(account.colorIndex);

            return (
              <div 
                key={account.username} 
                className={`space-y-1.5 p-2 rounded-lg transition-all ${
                  isMyAccount 
                    ? "bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-700" 
                    : ""
                }`}
              >
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="w-5 md:w-6 flex justify-center">{getRankIcon(index)}</div>
                  <div
                    className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className={`font-medium flex-1 truncate text-sm ${isMyAccount ? "text-amber-700 dark:text-amber-300" : ""}`}>
                    @{account.username}
                  </span>
                  {isMyAccount && (
                    <Badge variant="outline" className="border-amber-400 text-amber-600 dark:text-amber-400 text-xs gap-1 hidden sm:flex">
                      <Star className="h-3 w-3 fill-amber-500" />
                      A sua conta
                    </Badge>
                  )}
                  <span className="text-sm font-semibold tabular-nums">
                    {formatValue(account[sortBy])}
                  </span>
                </div>
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="w-5 md:w-6" />
                  <div className="w-2.5 md:w-3" />
                  <Progress 
                    value={progress} 
                    className={`flex-1 h-1.5 md:h-2 ${isMyAccount ? "[&>div]:bg-amber-500" : ""}`}
                  />
                </div>
                <div className="flex items-center gap-2 md:gap-3 text-xs text-muted-foreground">
                  <div className="w-5 md:w-6" />
                  <div className="w-2.5 md:w-3" />
                  <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="flex items-center gap-1 cursor-help">
                          <BarChart3 className="h-3 w-3" />
                          {account.postCount}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Posts publicados</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="flex items-center gap-1 cursor-help">
                          <Heart className="h-3 w-3" />
                          {formatValue(account.avgLikes)}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Média de likes por post</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="flex items-center gap-1 cursor-help hidden sm:flex">
                          <MessageCircle className="h-3 w-3" />
                          {formatValue(account.avgComments)}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Média de comentários por post</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 pt-3 border-t text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <BarChart3 className="h-3 w-3" /> Posts
            </span>
            <span className="flex items-center gap-1">
              <Heart className="h-3 w-3" /> Likes/post
            </span>
            <span className="flex items-center gap-1 hidden sm:flex">
              <MessageCircle className="h-3 w-3" /> Comentários/post
            </span>
          </div>

          {/* Insights Section */}
          {insights.length > 0 && (
            <Collapsible open={showInsights} onOpenChange={setShowInsights} className="mt-4">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-3 h-auto bg-muted/50 hover:bg-muted">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium">O que os líderes fazem melhor</span>
                  </div>
                  {showInsights ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-2">
                {insights.map((insight, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-start gap-2 p-2 rounded-lg bg-muted/30 text-sm"
                  >
                    {insight.icon}
                    <span className="text-muted-foreground">
                      {insight.text}{" "}
                      {insight.highlight && (
                        <span className="font-semibold text-foreground">{insight.highlight}</span>
                      )}
                    </span>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}