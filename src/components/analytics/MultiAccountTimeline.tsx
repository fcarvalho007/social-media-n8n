import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, AlertCircle } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getAccountColorChart, MY_ACCOUNT_COLOR_CHART } from "@/lib/analytics/colors";
import { InsightBox } from "./InsightBox";
import type { InstagramAnalyticsItem } from "@/hooks/useInstagramAnalytics";

interface MultiAccountTimelineProps {
  analytics: InstagramAnalyticsItem[];
  selectedAccounts: string[];
  accountColorMap: Map<string, number>;
  myAccount?: string;
}

type MetricType = "likes" | "engagement" | "posts";
type GranularityType = "daily" | "weekly" | "monthly";

export function MultiAccountTimeline({ 
  analytics, 
  selectedAccounts, 
  accountColorMap,
  myAccount 
}: MultiAccountTimelineProps) {
  const [metric, setMetric] = useState<MetricType>("engagement");
  const [granularity, setGranularity] = useState<GranularityType>("monthly");
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

  // Get date key based on granularity
  const getDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    
    switch (granularity) {
      case "daily":
        return `${year}-${month}-${day}`;
      case "weekly":
        // Get ISO week number
        const firstDayOfYear = new Date(year, 0, 1);
        const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
        const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        return `${year}-W${String(weekNumber).padStart(2, "0")}`;
      case "monthly":
      default:
        return `${year}-${month}`;
    }
  };

  // Group data by period and account
  const timelineData = useMemo(() => {
    const periodMap = new Map<string, Map<string, { likes: number; comments: number; posts: number }>>();

    analytics
      .filter((post) => post.owner_username && selectedAccounts.includes(post.owner_username))
      .forEach((post) => {
        if (!post.posted_at || !post.owner_username) return;

        const date = new Date(post.posted_at);
        const periodKey = getDateKey(date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

        // Skip if aligning dates and outside common period
        if (alignDates && commonPeriod) {
          if (monthKey < commonPeriod.start || monthKey > commonPeriod.end) return;
        }

        if (!periodMap.has(periodKey)) {
          periodMap.set(periodKey, new Map());
        }

        const accountMap = periodMap.get(periodKey)!;
        const existing = accountMap.get(post.owner_username) || { likes: 0, comments: 0, posts: 0 };
        accountMap.set(post.owner_username, {
          likes: existing.likes + (post.likes_count || 0),
          comments: existing.comments + (post.comments_count || 0),
          posts: existing.posts + 1,
        });
      });

    return Array.from(periodMap.entries())
      .map(([period, accountMap]) => {
        const dataPoint: any = { period };
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
      .sort((a, b) => a.period.localeCompare(b.period));
  }, [analytics, selectedAccounts, metric, granularity, alignDates, commonPeriod]);

  const formatPeriod = (period: string) => {
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    
    if (granularity === "daily") {
      const [year, month, day] = period.split("-");
      return `${day}/${month}`;
    } else if (granularity === "weekly") {
      const [year, week] = period.split("-W");
      return `S${week} ${year.slice(2)}`;
    } else {
      const [year, m] = period.split("-");
      return `${months[parseInt(m) - 1]} ${year.slice(2)}`;
    }
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

  const getGranularityLabel = () => {
    switch (granularity) {
      case "daily": return "diário";
      case "weekly": return "semanal";
      case "monthly": return "mensal";
    }
  };

  // Generate insights
  const insights = useMemo(() => {
    if (selectedAccounts.length < 2 || !myAccount || timelineData.length < 2) {
      return { forYou: "Selecione mais contas para ver tendências.", fromData: "Dados insuficientes para análise de tendências." };
    }

    // Calculate trend for each account
    const trends: { username: string; trend: number }[] = [];
    
    selectedAccounts.forEach(username => {
      const accountData = timelineData.filter(d => d[username] !== undefined);
      if (accountData.length < 2) return;
      
      const firstHalf = accountData.slice(0, Math.floor(accountData.length / 2));
      const secondHalf = accountData.slice(Math.floor(accountData.length / 2));
      
      const firstAvg = firstHalf.reduce((sum, d) => sum + (d[username] || 0), 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, d) => sum + (d[username] || 0), 0) / secondHalf.length;
      
      const trend = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;
      trends.push({ username, trend });
    });

    const myTrend = trends.find(t => t.username === myAccount);
    const growing = trends.filter(t => t.trend > 5).sort((a, b) => b.trend - a.trend);
    const declining = trends.filter(t => t.trend < -5).sort((a, b) => a.trend - b.trend);

    const forYou = myTrend
      ? myTrend.trend > 5
        ? `Ótimo! Seu ${getMetricLabel().toLowerCase()} está a crescer ${Math.abs(Math.round(myTrend.trend))}% no período.`
        : myTrend.trend < -5
          ? `Atenção: seu ${getMetricLabel().toLowerCase()} caiu ${Math.abs(Math.round(myTrend.trend))}% no período.`
          : `Seu ${getMetricLabel().toLowerCase()} está estável no período.`
      : "Selecione sua conta para ver sua tendência.";

    const fromData = growing.length > 0
      ? `Em crescimento: @${growing[0].username} (+${Math.round(growing[0].trend)}%)`
      : declining.length > 0
        ? `Em queda: @${declining[0].username} (${Math.round(declining[0].trend)}%)`
        : "Todas as contas estão estáveis no período.";

    return { forYou, fromData };
  }, [selectedAccounts, myAccount, timelineData, metric]);

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
            <div className="flex flex-wrap gap-2">
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
              <ToggleGroup
                type="single"
                value={granularity}
                onValueChange={(v) => v && setGranularity(v as GranularityType)}
                className="justify-start"
              >
                <ToggleGroupItem value="daily" size="sm" className="text-xs">
                  Diário
                </ToggleGroupItem>
                <ToggleGroupItem value="weekly" size="sm" className="text-xs">
                  Semanal
                </ToggleGroupItem>
                <ToggleGroupItem value="monthly" size="sm" className="text-xs">
                  Mensal
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
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
      <CardContent className="space-y-4">
        <div className="overflow-x-auto -mx-4 px-4">
          <div className="min-w-[400px]">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="period" 
                  tickFormatter={formatPeriod}
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
                  labelFormatter={formatPeriod}
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
        <p className="text-xs text-muted-foreground text-center">
          {getMetricLabel()} ({getGranularityLabel()}) {alignDates && commonPeriod && `• Período alinhado`}
        </p>

        <InsightBox
          title="Evolução Temporal"
          description="Mostra como o engagement de cada conta evoluiu ao longo do tempo, permitindo identificar tendências de crescimento ou queda."
          insights={insights}
        />
      </CardContent>
    </Card>
  );
}
