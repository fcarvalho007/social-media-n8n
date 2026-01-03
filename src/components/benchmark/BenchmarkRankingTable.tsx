import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, TrendingUp, TrendingDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AccountStat {
  username: string;
  profile?: { profile_pic_url?: string };
  postCount: number;
  avgEngagement: number;
  avgLikes: number;
  engagementRate: number;
  postsPerWeek: number;
  videoPercent: number;
  followers: number;
}

interface BenchmarkRankingTableProps {
  stats: AccountStat[];
  allStats: AccountStat[];
}

const RANK_ICONS = [Trophy, Medal, Award];
const RANK_COLORS = ["text-amber-500", "text-slate-400", "text-amber-700"];

export function BenchmarkRankingTable({ stats, allStats }: BenchmarkRankingTableProps) {
  // Calculate weighted score and rank
  const rankedStats = useMemo(() => {
    // Normalize and weight each metric
    const maxEngagement = Math.max(...allStats.map((s) => s.avgEngagement), 1);
    const maxRate = Math.max(...allStats.map((s) => s.engagementRate), 1);
    const maxFrequency = Math.max(...allStats.map((s) => s.postsPerWeek), 1);

    return stats
      .map((stat) => {
        // Weighted score: 40% engagement, 30% rate, 20% frequency, 10% video mix
        const engagementScore = (stat.avgEngagement / maxEngagement) * 40;
        const rateScore = (stat.engagementRate / maxRate) * 30;
        const frequencyScore = (stat.postsPerWeek / maxFrequency) * 20;
        const videoScore = (stat.videoPercent / 100) * 10;

        const totalScore = engagementScore + rateScore + frequencyScore + videoScore;

        return {
          ...stat,
          score: Math.round(totalScore),
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [stats, allStats]);

  return (
    <Card className="card-premium">
      <CardHeader className="card-premium-header">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="h-5 w-5 text-amber-500" />
          Ranking de Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[50px]">#</TableHead>
              <TableHead>Conta</TableHead>
              <TableHead className="text-right">Posts</TableHead>
              <TableHead className="text-right">Eng. Médio</TableHead>
              <TableHead className="text-right">Taxa</TableHead>
              <TableHead className="text-right">Posts/Sem</TableHead>
              <TableHead className="text-right">Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rankedStats.map((stat, index) => {
              const RankIcon = RANK_ICONS[index] || null;
              const rankColor = RANK_COLORS[index] || "text-muted-foreground";

              return (
                <TableRow key={stat.username} className="hover:bg-primary/5">
                  <TableCell>
                    {RankIcon ? (
                      <RankIcon className={`h-5 w-5 ${rankColor}`} />
                    ) : (
                      <span className="text-muted-foreground font-medium">
                        {index + 1}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {stat.profile?.profile_pic_url ? (
                        <img
                          src={stat.profile.profile_pic_url}
                          alt={stat.username}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-muted" />
                      )}
                      <span className="font-medium">@{stat.username}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {stat.postCount}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {stat.avgEngagement.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {stat.engagementRate.toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {stat.postsPerWeek.toFixed(1)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant="secondary"
                      className={`font-bold ${
                        stat.score >= 70
                          ? "bg-emerald-500/20 text-emerald-600"
                          : stat.score >= 40
                          ? "bg-amber-500/20 text-amber-600"
                          : "bg-rose-500/20 text-rose-600"
                      }`}
                    >
                      {stat.score}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
