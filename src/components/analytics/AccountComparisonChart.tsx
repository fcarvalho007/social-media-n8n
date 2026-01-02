import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { BarChart3 } from "lucide-react";
import { getAccountColorChart } from "@/lib/analytics/colors";
import type { AccountStats } from "./AccountRanking";

interface AccountComparisonChartProps {
  accounts: AccountStats[];
}

export function AccountComparisonChart({ accounts }: AccountComparisonChartProps) {
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
      </CardHeader>
      <CardContent>
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
            <Legend />
            {accounts.map((account) => (
              <Bar
                key={account.username}
                dataKey={account.username}
                name={`@${account.username}`}
                fill={getAccountColorChart(account.colorIndex)}
                radius={[0, 4, 4, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
