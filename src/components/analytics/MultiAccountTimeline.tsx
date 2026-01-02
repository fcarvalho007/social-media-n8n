import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { getAccountColorChart } from "@/lib/analytics/colors";
import type { InstagramAnalyticsItem } from "@/hooks/useInstagramAnalytics";

interface MultiAccountTimelineProps {
  analytics: InstagramAnalyticsItem[];
  selectedAccounts: string[];
  accountColorMap: Map<string, number>;
}

type MetricType = "likes" | "engagement" | "posts";

export function MultiAccountTimeline({ 
  analytics, 
  selectedAccounts, 
  accountColorMap 
}: MultiAccountTimelineProps) {
  const [metric, setMetric] = useState<MetricType>("engagement");

  // Group data by month and account
  const timelineData = (() => {
    const monthMap = new Map<string, Map<string, { likes: number; comments: number; posts: number }>>();

    analytics
      .filter((post) => post.owner_username && selectedAccounts.includes(post.owner_username))
      .forEach((post) => {
        if (!post.posted_at || !post.owner_username) return;

        const date = new Date(post.posted_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

        if (!monthMap.has(monthKey)) {
          monthMap.set(monthKey, new Map());
        }

        const accountMap = monthMap.get(monthKey)!;
        const existing = accountMap.get(post.owner_username) || { likes: 0, comments: 0, posts: 0 };
        accountMap.set(post.owner_username, {
          likes: existing.likes + (post.likes_count || 0),
          comments: existing.comments + (post.comments_count || 0),
          posts: existing.posts + 1,
        });
      });

    return Array.from(monthMap.entries())
      .map(([month, accountMap]) => {
        const dataPoint: any = { month };
        selectedAccounts.forEach((username) => {
          const stats = accountMap.get(username);
          if (stats) {
            if (metric === "likes") {
              dataPoint[username] = Math.round(stats.likes / stats.posts);
            } else if (metric === "engagement") {
              dataPoint[username] = Math.round((stats.likes + stats.comments) / stats.posts);
            } else {
              dataPoint[username] = stats.posts;
            }
          }
        });
        return dataPoint;
      })
      .sort((a, b) => a.month.localeCompare(b.month));
  })();

  const formatMonth = (month: string) => {
    const [year, m] = month.split("-");
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return `${months[parseInt(m) - 1]} ${year.slice(2)}`;
  };

  const formatValue = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  const getMetricLabel = () => {
    switch (metric) {
      case "likes": return "Likes Médios";
      case "engagement": return "Engagement Médio";
      case "posts": return "Nº de Posts";
    }
  };

  if (selectedAccounts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Evolução Temporal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Selecione contas para ver a evolução temporal
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Evolução Temporal
          </CardTitle>
          <ToggleGroup
            type="single"
            value={metric}
            onValueChange={(v) => v && setMetric(v as MetricType)}
            className="justify-start"
          >
            <ToggleGroupItem value="engagement" size="sm">
              Engagement
            </ToggleGroupItem>
            <ToggleGroupItem value="likes" size="sm">
              Likes
            </ToggleGroupItem>
            <ToggleGroupItem value="posts" size="sm">
              Posts
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={timelineData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="month" 
              tickFormatter={formatMonth}
              className="text-xs"
            />
            <YAxis 
              tickFormatter={formatValue}
              className="text-xs"
            />
            <Tooltip
              formatter={(value: number, name: string) => [formatValue(value), `@${name}`]}
              labelFormatter={formatMonth}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Legend formatter={(value) => `@${value}`} />
            {selectedAccounts.map((username) => {
              const colorIndex = accountColorMap.get(username) || 0;
              return (
                <Line
                  key={username}
                  type="monotone"
                  dataKey={username}
                  name={username}
                  stroke={getAccountColorChart(colorIndex)}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
        <p className="text-xs text-muted-foreground text-center mt-2">
          {getMetricLabel()} por mês
        </p>
      </CardContent>
    </Card>
  );
}
