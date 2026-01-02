import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Info, AlertCircle } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getAccountColorChart, MY_ACCOUNT_COLOR_CHART } from "@/lib/analytics/colors";
import type { InstagramAnalyticsItem } from "@/hooks/useInstagramAnalytics";

interface MultiAccountTimelineProps {
  analytics: InstagramAnalyticsItem[];
  selectedAccounts: string[];
  accountColorMap: Map<string, number>;
  myAccount?: string;
}

type MetricType = "likes" | "engagement" | "posts";

export function MultiAccountTimeline({ 
  analytics, 
  selectedAccounts, 
  accountColorMap,
  myAccount 
}: MultiAccountTimelineProps) {
  const [metric, setMetric] = useState<MetricType>("engagement");
  const [alignDates, setAlignDates] = useState(false);

  // Calculate date ranges per account
  const accountDateRanges = useMemo(() => {
    const ranges = new Map<string, { first: string; last: string }>();
    
    selectedAccounts.forEach(username => {
      const posts = analytics.filter(p => p.owner_username === username && p.posted_at);
      if (posts.length === 0) return;
      
      const dates = posts.map(p => new Date(p.posted_at!).getTime());
      const firstDate = new Date(Math.min(...dates));
      const lastDate = new Date(Math.max(...dates));
      
      ranges.set(username, {
        first: `${firstDate.getFullYear()}-${String(firstDate.getMonth() + 1).padStart(2, "0")}`,
        last: `${lastDate.getFullYear()}-${String(lastDate.getMonth() + 1).padStart(2, "0")}`
      });
    });
    
    return ranges;
  }, [analytics, selectedAccounts]);

  // Check if dates are misaligned
  const datesAreMisaligned = useMemo(() => {
    const firstDates = Array.from(accountDateRanges.values()).map(r => r.first);
    return new Set(firstDates).size > 1;
  }, [accountDateRanges]);

  // Find common period
  const commonPeriod = useMemo(() => {
    const ranges = Array.from(accountDateRanges.values());
    if (ranges.length === 0) return null;
    
    const latestFirst = ranges.reduce((max, r) => r.first > max ? r.first : max, "0000-00");
    const earliestLast = ranges.reduce((min, r) => r.last < min ? r.last : min, "9999-99");
    
    return latestFirst <= earliestLast ? { start: latestFirst, end: earliestLast } : null;
  }, [accountDateRanges]);

  // Group data by month and account
  const timelineData = useMemo(() => {
    const monthMap = new Map<string, Map<string, { likes: number; comments: number; posts: number }>>();

    analytics
      .filter((post) => post.owner_username && selectedAccounts.includes(post.owner_username))
      .forEach((post) => {
        if (!post.posted_at || !post.owner_username) return;

        const date = new Date(post.posted_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

        // Skip if aligning dates and outside common period
        if (alignDates && commonPeriod) {
          if (monthKey < commonPeriod.start || monthKey > commonPeriod.end) return;
        }

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
  }, [analytics, selectedAccounts, metric, alignDates, commonPeriod]);

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

  // Sort accounts so myAccount comes first in legend
  const sortedAccounts = myAccount 
    ? [myAccount, ...selectedAccounts.filter(a => a !== myAccount)]
    : selectedAccounts;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-3">
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
              <ToggleGroupItem value="engagement" size="sm" className="text-xs">
                Engagement
              </ToggleGroupItem>
              <ToggleGroupItem value="likes" size="sm" className="text-xs">
                Likes
              </ToggleGroupItem>
              <ToggleGroupItem value="posts" size="sm" className="text-xs">
                Posts
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {datesAreMisaligned && (
            <Alert className="py-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <span>
                    Dados começam em datas diferentes
                  </span>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="align-dates"
                      checked={alignDates}
                      onCheckedChange={setAlignDates}
                      disabled={!commonPeriod}
                    />
                    <Label htmlFor="align-dates" className="text-xs cursor-pointer">
                      Alinhar período comum
                    </Label>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto -mx-4 px-4">
          <div className="min-w-[400px]">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="month" 
                  tickFormatter={formatMonth}
                  className="text-xs"
                  tick={{ fontSize: 11 }}
                />
                <YAxis 
                  tickFormatter={formatValue}
                  className="text-xs"
                  tick={{ fontSize: 11 }}
                  width={40}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatValue(value), 
                    `@${name}${name === myAccount ? " ⭐" : ""}`
                  ]}
                  labelFormatter={formatMonth}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: "11px" }}
                  formatter={(value) => {
                    const isMyAccountLine = value === myAccount;
                    return (
                      <span className={isMyAccountLine ? "font-semibold text-amber-600" : ""}>
                        @{value} {isMyAccountLine ? "⭐" : ""}
                      </span>
                    );
                  }} 
                />
                {sortedAccounts.filter(a => selectedAccounts.includes(a)).map((username) => {
                  const colorIndex = accountColorMap.get(username) || 0;
                  const isMyAccountLine = username === myAccount;
                  const color = isMyAccountLine ? MY_ACCOUNT_COLOR_CHART : getAccountColorChart(colorIndex);
                  
                  return (
                    <Line
                      key={username}
                      type="monotone"
                      dataKey={username}
                      name={username}
                      stroke={color}
                      strokeWidth={isMyAccountLine ? 3 : 2}
                      strokeDasharray={alignDates ? undefined : undefined}
                      dot={{ r: isMyAccountLine ? 4 : 3, fill: color }}
                      activeDot={{ r: isMyAccountLine ? 7 : 5 }}
                      connectNulls={false}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          {getMetricLabel()} por mês {alignDates && commonPeriod && `(${formatMonth(commonPeriod.start)} - ${formatMonth(commonPeriod.end)})`}
        </p>
      </CardContent>
    </Card>
  );
}
