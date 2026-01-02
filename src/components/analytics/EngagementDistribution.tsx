import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { InsightBox } from "./InsightBox";
import type { InstagramAnalyticsItem } from "@/hooks/useInstagramAnalytics";

interface EngagementDistributionProps {
  analytics: InstagramAnalyticsItem[];
  selectedAccounts: string[];
  accountColorMap: Map<string, number>;
  myAccount?: string;
}

const RANGES = [
  { min: 0, max: 100, label: "0-100" },
  { min: 100, max: 500, label: "100-500" },
  { min: 500, max: 1000, label: "500-1K" },
  { min: 1000, max: 5000, label: "1K-5K" },
  { min: 5000, max: 10000, label: "5K-10K" },
  { min: 10000, max: Infinity, label: "10K+" },
];

export function EngagementDistribution({
  analytics,
  selectedAccounts,
  accountColorMap,
  myAccount,
}: EngagementDistributionProps) {
  const chartData = useMemo(() => {
    return RANGES.map((range) => {
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

  // Generate insights
  const insights = useMemo(() => {
    if (selectedAccounts.length < 2 || !myAccount) {
      return { forYou: "Selecione mais contas para comparar.", fromData: "Dados insuficientes para análise." };
    }

    const myPosts = analytics.filter(p => p.owner_username === myAccount);
    const myHighEngagement = myPosts.filter(p => (p.likes_count || 0) + (p.comments_count || 0) >= 5000).length;
    const myTotal = myPosts.length;

    const competitorHighRatios: { username: string; ratio: number }[] = [];
    selectedAccounts.filter(a => a !== myAccount).forEach(username => {
      const posts = analytics.filter(p => p.owner_username === username);
      const highEng = posts.filter(p => (p.likes_count || 0) + (p.comments_count || 0) >= 5000).length;
      if (posts.length > 0) {
        competitorHighRatios.push({ username, ratio: highEng / posts.length });
      }
    });

    const myRatio = myTotal > 0 ? myHighEngagement / myTotal : 0;
    const avgCompetitorRatio = competitorHighRatios.length > 0
      ? competitorHighRatios.reduce((sum, c) => sum + c.ratio, 0) / competitorHighRatios.length
      : 0;

    const forYou = myTotal > 0
      ? myRatio > avgCompetitorRatio
        ? `${Math.round(myRatio * 100)}% dos seus posts têm alto engagement (5K+), acima da média dos concorrentes (${Math.round(avgCompetitorRatio * 100)}%).`
        : `${Math.round(myRatio * 100)}% dos seus posts têm alto engagement (5K+), abaixo dos concorrentes (${Math.round(avgCompetitorRatio * 100)}%).`
      : "Sem posts para analisar.";

    // Find most consistent account
    const consistencyScores = selectedAccounts.map(username => {
      const posts = analytics.filter(p => p.owner_username === username);
      if (posts.length === 0) return { username, variance: Infinity };
      
      const engagements = posts.map(p => (p.likes_count || 0) + (p.comments_count || 0));
      const avg = engagements.reduce((a, b) => a + b, 0) / engagements.length;
      const variance = engagements.reduce((sum, e) => sum + Math.pow(e - avg, 2), 0) / engagements.length;
      return { username, variance };
    });

    const mostConsistent = consistencyScores.sort((a, b) => a.variance - b.variance)[0];

    const fromData = mostConsistent
      ? `@${mostConsistent.username} tem o engagement mais consistente entre posts.`
      : "Dados insuficientes para análise de consistência.";

    return { forYou, fromData };
  }, [analytics, selectedAccounts, myAccount]);

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
      <CardContent className="space-y-4">
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

        <InsightBox
          title="Distribuição de Engagement"
          description="Mostra em que faixas de engagement (likes + comentários) os posts de cada conta caem. Barras mais à direita significam posts com melhor performance."
          insights={insights}
        />
      </CardContent>
    </Card>
  );
}
