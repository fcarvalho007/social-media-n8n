import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { MY_ACCOUNT_COLOR, getAccountColor } from "@/lib/analytics/colors";
import type { InstagramAnalyticsItem } from "@/hooks/useInstagramAnalytics";

interface EngagementDistributionProps {
  analytics: InstagramAnalyticsItem[];
  selectedAccounts: string[];
  accountColorMap: Map<string, number>;
  myAccount?: string;
}

export function EngagementDistribution({
  analytics,
  selectedAccounts,
  accountColorMap,
  myAccount,
}: EngagementDistributionProps) {
  const chartData = useMemo(() => {
    const ranges = [
      { min: 0, max: 100, label: "0-100" },
      { min: 100, max: 500, label: "100-500" },
      { min: 500, max: 1000, label: "500-1K" },
      { min: 1000, max: 5000, label: "1K-5K" },
      { min: 5000, max: 10000, label: "5K-10K" },
      { min: 10000, max: Infinity, label: "10K+" },
    ];

    return ranges.map((range) => {
      const entry: Record<string, number | string> = { range: range.label };

      selectedAccounts.forEach((account) => {
        const accountPosts = analytics.filter((p) => p.owner_username === account);
        const postsInRange = accountPosts.filter((p) => {
          const engagement = (p.likes_count || 0) + (p.comments_count || 0);
          return engagement >= range.min && engagement < range.max;
        });
        entry[account] = postsInRange.length;
      });

      return entry;
    });
  }, [analytics, selectedAccounts]);

  if (selectedAccounts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Distribuição de Engagement</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px] text-muted-foreground">
          Selecione contas para comparar
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;

    return (
      <div className="rounded-lg border bg-card p-3 shadow-lg">
        <p className="font-medium mb-2">Engagement: {label}</p>
        <div className="space-y-1">
          {payload.map((entry: any) => {
            const isMyAccount = entry.dataKey === myAccount;
            return (
              <div key={entry.dataKey} className="flex items-center gap-2 text-sm">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className={isMyAccount ? "font-semibold" : ""}>
                  @{entry.dataKey}
                </span>
                <span className="ml-auto font-medium">{entry.value} posts</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex flex-wrap justify-center gap-3 mt-4">
        {payload?.map((entry: any) => {
          const isMyAccount = entry.value === myAccount;
          return (
            <div key={entry.value} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className={`text-xs ${isMyAccount ? "font-semibold text-amber-700" : "text-muted-foreground"}`}>
                @{entry.value}
                {isMyAccount && " ⭐"}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">📊 Distribuição de Engagement</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="range"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              axisLine={{ stroke: "hsl(var(--border))" }}
            />
            <YAxis
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              axisLine={{ stroke: "hsl(var(--border))" }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
            {selectedAccounts.map((account) => {
              const colorIndex = accountColorMap.get(account) ?? 0;
              const isMyAccount = account === myAccount;
              const color = isMyAccount ? MY_ACCOUNT_COLOR : getAccountColor(colorIndex);

              return (
                <Bar
                  key={account}
                  dataKey={account}
                  fill={color}
                  radius={[4, 4, 0, 0]}
                  strokeWidth={isMyAccount ? 2 : 0}
                  stroke={isMyAccount ? MY_ACCOUNT_COLOR : undefined}
                />
              );
            })}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}