import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { BarChart3, Calendar } from "lucide-react";
import { getAccountColorChart, MY_ACCOUNT_COLOR_CHART } from "@/lib/analytics/colors";
import { InsightBox } from "./InsightBox";
import type { AccountStats } from "./AccountRanking";

interface AccountComparisonChartProps {
  accounts: AccountStats[];
  myAccount?: string;
  analytics?: Array<{ owner_username?: string | null; posted_at?: string | null }>;
}

export function AccountComparisonChart({ accounts, myAccount, analytics = [] }: AccountComparisonChartProps) {
  // Calculate date ranges per account
  const accountDateRanges = useMemo(() => {
    const ranges = new Map<string, { first: Date; last: Date; count: number }>();
    
    accounts.forEach(account => {
      const posts = analytics.filter(p => p.owner_username === account.username && p.posted_at);
      if (posts.length === 0) {
        ranges.set(account.username, { first: new Date(), last: new Date(), count: account.postCount });
        return;
      }
      
      const dates = posts.map(p => new Date(p.posted_at!).getTime());
      ranges.set(account.username, {
        first: new Date(Math.min(...dates)),
        last: new Date(Math.max(...dates)),
        count: posts.length
      });
    });
    
    return ranges;
  }, [analytics, accounts]);

  const formatDateRange = (username: string) => {
    const range = accountDateRanges.get(username);
    if (!range) return "";
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const first = `${months[range.first.getMonth()]} ${range.first.getFullYear()}`;
    const last = `${months[range.last.getMonth()]} ${range.last.getFullYear()}`;
    return first === last ? first : `${first} - ${last}`;
  };

  // Transform data for grouped bar chart
  const metrics = [
    { key: "avgLikes", label: "Likes Médios" },
    { key: "avgComments", label: "Comentários Médios" },
    { key: "avgEngagement", label: "Engagement Médio" },
    { key: "postCount", label: "Total Posts" },
  ];

  const chartData = metrics.map((metric) => {
    const dataPoint: any = { metric: metric.label };
    accounts.forEach((account) => {
      dataPoint[account.username] = account[metric.key as keyof AccountStats];
    });
    return dataPoint;
  });

  const formatValue = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  // Generate insights
  const insights = useMemo(() => {
    if (accounts.length < 2 || !myAccount) {
      return { forYou: "Selecione mais contas para comparar.", fromData: "Dados insuficientes para análise." };
    }

    const myStats = accounts.find(a => a.username === myAccount);
    const competitors = accounts.filter(a => a.username !== myAccount);
    
    if (!myStats || competitors.length === 0) {
      return { forYou: "Selecione mais contas para comparar.", fromData: "Dados insuficientes para análise." };
    }

    const avgCompetitorEngagement = competitors.reduce((sum, c) => sum + c.avgEngagement, 0) / competitors.length;
    const leader = [...accounts].sort((a, b) => b.avgEngagement - a.avgEngagement)[0];
    const myRank = [...accounts].sort((a, b) => b.avgEngagement - a.avgEngagement).findIndex(a => a.username === myAccount) + 1;

    const forYou = myStats.avgEngagement > avgCompetitorEngagement
      ? `Parabéns! Está ${Math.round(((myStats.avgEngagement - avgCompetitorEngagement) / avgCompetitorEngagement) * 100)}% acima da média dos concorrentes em engagement.`
      : `Está ${Math.round(((avgCompetitorEngagement - myStats.avgEngagement) / avgCompetitorEngagement) * 100)}% abaixo da média. Foque em aumentar interações.`;

    const fromData = `Líder: @${leader.username} com ${formatValue(leader.avgEngagement)} eng. médio. Você está em ${myRank}º lugar.`;

    return { forYou, fromData };
  }, [accounts, myAccount]);

  if (accounts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Comparação de Métricas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Selecione contas para comparar métricas
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Comparação de Métricas
        </CardTitle>
        {/* Account date ranges */}
        <div className="flex flex-wrap gap-2 mt-2">
          {accounts.map(account => {
            const isMyAccountLabel = account.username === myAccount;
            const range = accountDateRanges.get(account.username);
            return (
              <div 
                key={account.username}
                className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md ${
                  isMyAccountLabel 
                    ? "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300" 
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Calendar className="h-3 w-3" />
                <span className="font-medium">@{account.username.length > 15 ? account.username.slice(0, 15) + "..." : account.username}</span>
                <span>• {range?.count ?? account.postCount} posts</span>
                <span className="text-muted-foreground">({formatDateRange(account.username)})</span>
              </div>
            );
          })}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              type="number" 
              tickFormatter={formatValue}
              className="text-xs"
            />
            <YAxis 
              type="category" 
              dataKey="metric" 
              width={120}
              className="text-xs"
            />
            <Tooltip
              formatter={(value: number) => formatValue(value)}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Legend 
              formatter={(value) => {
                const isMyAccountBar = value === myAccount;
                return (
                  <span className={isMyAccountBar ? "font-semibold text-amber-600" : ""}>
                    @{value} {isMyAccountBar ? "⭐" : ""}
                  </span>
                );
              }} 
            />
            {accounts.map((account) => {
              const isMyAccountBar = account.username === myAccount;
              const color = isMyAccountBar 
                ? MY_ACCOUNT_COLOR_CHART 
                : getAccountColorChart(account.colorIndex);
              
              return (
                <Bar
                  key={account.username}
                  dataKey={account.username}
                  name={account.username}
                  fill={color}
                  radius={[0, 4, 4, 0]}
                  strokeWidth={isMyAccountBar ? 2 : 0}
                  stroke={isMyAccountBar ? "#D97706" : undefined}
                />
              );
            })}
          </BarChart>
        </ResponsiveContainer>

        <InsightBox
          title="Comparação de Métricas"
          description="Compara as métricas principais (likes, comentários, engagement) entre as contas selecionadas lado a lado."
          insights={insights}
        />
      </CardContent>
    </Card>
  );
}
