import { Trophy, TrendingUp, Heart, MessageCircle, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getAccountColor } from "@/lib/analytics/colors";

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
}

export function AccountRanking({ accounts, sortBy = "avgEngagement" }: AccountRankingProps) {
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
      </CardHeader>
      <CardContent className="space-y-3">
        {sortedAccounts.map((account, index) => {
          const progress = (account[sortBy] / maxValue) * 100;
          const color = getAccountColor(account.colorIndex);

          return (
            <div key={account.username} className="space-y-1.5">
              <div className="flex items-center gap-3">
                <div className="w-6 flex justify-center">{getRankIcon(index)}</div>
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="font-medium flex-1 truncate">@{account.username}</span>
                <span className="text-sm font-semibold tabular-nums">
                  {formatValue(account[sortBy])}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6" />
                <div className="w-3" />
                <Progress value={progress} className="flex-1 h-2" />
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
