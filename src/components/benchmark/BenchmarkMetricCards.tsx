import { Heart, MessageCircle, Eye, Calendar, TrendingUp, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AccountStat {
  username: string;
  avgEngagement: number;
  avgLikes: number;
  engagementRate: number;
  postsPerWeek: number;
  followers: number;
  profile?: { profile_pic_url?: string };
}

interface BenchmarkMetricCardsProps {
  stats: AccountStat[];
}

const COLORS = [
  "from-indigo-500 to-purple-500",
  "from-rose-500 to-pink-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-violet-500 to-purple-500",
];

export function BenchmarkMetricCards({ stats }: BenchmarkMetricCardsProps) {
  const metrics = [
    {
      label: "Engagement Médio",
      icon: Heart,
      getValue: (s: AccountStat) => s.avgEngagement.toLocaleString(),
      getBest: () => {
        const best = stats.reduce((a, b) => (a.avgEngagement > b.avgEngagement ? a : b));
        return best.username;
      },
    },
    {
      label: "Taxa Engagement",
      icon: TrendingUp,
      getValue: (s: AccountStat) => `${s.engagementRate.toFixed(2)}%`,
      getBest: () => {
        const best = stats.reduce((a, b) => (a.engagementRate > b.engagementRate ? a : b));
        return best.username;
      },
    },
    {
      label: "Posts/Semana",
      icon: Calendar,
      getValue: (s: AccountStat) => s.postsPerWeek.toFixed(1),
      getBest: () => {
        const best = stats.reduce((a, b) => (a.postsPerWeek > b.postsPerWeek ? a : b));
        return best.username;
      },
    },
    {
      label: "Seguidores",
      icon: Users,
      getValue: (s: AccountStat) => s.followers.toLocaleString(),
      getBest: () => {
        const best = stats.reduce((a, b) => (a.followers > b.followers ? a : b));
        return best.username;
      },
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => {
        const bestAccount = metric.getBest();
        return (
          <Card key={metric.label} className="card-premium">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <metric.icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  {metric.label}
                </span>
              </div>
              <div className="space-y-2">
                {stats.map((stat, index) => (
                  <div
                    key={stat.username}
                    className={`flex items-center justify-between p-2 rounded-lg ${
                      stat.username === bestAccount
                        ? "bg-primary/10 border border-primary/20"
                        : "bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full bg-gradient-to-r ${
                          COLORS[index % COLORS.length]
                        }`}
                      />
                      <span className="text-xs font-medium truncate max-w-[80px]">
                        @{stat.username}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-bold font-mono">
                        {metric.getValue(stat)}
                      </span>
                      {stat.username === bestAccount && (
                        <Badge className="h-4 px-1 text-[10px] bg-primary">
                          Top
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
