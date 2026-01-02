import { Trophy, TrendingUp, Heart, MessageCircle, BarChart3, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
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
}

interface AccountRankingProps {
  accounts: AccountStats[];
  sortBy?: "avgEngagement" | "totalLikes" | "postCount" | "avgLikes";
  myAccount?: string;
}

export function AccountRanking({ accounts, sortBy = "avgEngagement", myAccount }: AccountRankingProps) {
  const sortedAccounts = [...accounts].sort((a, b) => b[sortBy] - a[sortBy]);
  const maxValue = sortedAccounts[0]?.[sortBy] || 1;

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
            Selecione contas para ver o ranking
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
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
              Você está em {myAccountRank}º lugar
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
              <div className="flex items-center gap-3">
                <div className="w-6 flex justify-center">{getRankIcon(index)}</div>
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className={`font-medium flex-1 truncate ${isMyAccount ? "text-amber-700 dark:text-amber-300" : ""}`}>
                  @{account.username}
                </span>
                {isMyAccount && (
                  <Badge variant="outline" className="border-amber-400 text-amber-600 dark:text-amber-400 text-xs gap-1">
                    <Star className="h-3 w-3 fill-amber-500" />
                    Você
                  </Badge>
                )}
                <span className="text-sm font-semibold tabular-nums">
                  {formatValue(account[sortBy])}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6" />
                <div className="w-3" />
                <Progress 
                  value={progress} 
                  className={`flex-1 h-2 ${isMyAccount ? "[&>div]:bg-amber-500" : ""}`}
                />
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className="w-6" />
                <div className="w-3" />
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <BarChart3 className="h-3 w-3" />
                    {account.postCount} posts
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="h-3 w-3" />
                    {formatValue(account.avgLikes)}/post
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" />
                    {formatValue(account.avgComments)}/post
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
