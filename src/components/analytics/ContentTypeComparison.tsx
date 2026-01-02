import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { PieChart } from "lucide-react";
import { getAccountColorChart } from "@/lib/analytics/colors";
import type { InstagramAnalyticsItem } from "@/hooks/useInstagramAnalytics";

interface ContentTypeComparisonProps {
  analytics: InstagramAnalyticsItem[];
  selectedAccounts: string[];
  accountColorMap: Map<string, number>;
}

export function ContentTypeComparison({
  analytics,
  selectedAccounts,
  accountColorMap,
}: ContentTypeComparisonProps) {
  // Calculate content type breakdown per account
  const data = (() => {
    const types = ["Image", "Video", "Sidecar"];
    
    return types.map((type) => {
      const dataPoint: any = { type };
      
      selectedAccounts.forEach((username) => {
        const accountPosts = analytics.filter(
          (p) => p.owner_username === username && (p.post_type || "Image") === type
        );
        dataPoint[username] = accountPosts.length;
      });
      
      return dataPoint;
    });
  })();

  // Calculate percentages for each account
  const percentageData = (() => {
    const result: { username: string; colorIndex: number; breakdown: { type: string; count: number; percentage: number }[] }[] = [];

    selectedAccounts.forEach((username) => {
      const accountPosts = analytics.filter((p) => p.owner_username === username);
      const total = accountPosts.length;
      const colorIndex = accountColorMap.get(username) || 0;

      const breakdown = ["Image", "Video", "Sidecar"].map((type) => {
        const count = accountPosts.filter((p) => (p.post_type || "Image") === type).length;
        return {
          type,
          count,
          percentage: total > 0 ? Math.round((count / total) * 100) : 0,
        };
      });

      result.push({ username, colorIndex, breakdown });
    });

    return result;
  })();

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "Image": return "Imagem";
      case "Video": return "Vídeo";
      case "Sidecar": return "Carrossel";
      default: return type;
    }
  };

  if (selectedAccounts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <PieChart className="h-5 w-5 text-primary" />
            Estratégia de Conteúdo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Selecione contas para comparar estratégias
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <PieChart className="h-5 w-5 text-primary" />
          Estratégia de Conteúdo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Bar Chart */}
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="type" 
              tickFormatter={getTypeLabel}
              className="text-xs"
            />
            <YAxis className="text-xs" />
            <Tooltip
              formatter={(value: number, name: string) => [value, `@${name}`]}
              labelFormatter={getTypeLabel}
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
                <Bar
                  key={username}
                  dataKey={username}
                  name={username}
                  fill={getAccountColorChart(colorIndex)}
                  radius={[4, 4, 0, 0]}
                />
              );
            })}
          </BarChart>
        </ResponsiveContainer>

        {/* Percentage breakdown per account */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Distribuição por Conta</h4>
          <div className="grid gap-3">
            {percentageData.map(({ username, colorIndex, breakdown }) => (
              <div key={username} className="space-y-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: getAccountColorChart(colorIndex) }}
                  />
                  <span className="text-sm font-medium">@{username}</span>
                </div>
                <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-muted">
                  {breakdown.map(({ type, percentage }) => (
                    <div
                      key={type}
                      className="h-full transition-all"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor:
                          type === "Image"
                            ? "hsl(221, 83%, 53%)"
                            : type === "Video"
                            ? "hsl(340, 82%, 52%)"
                            : "hsl(142, 71%, 45%)",
                      }}
                      title={`${getTypeLabel(type)}: ${percentage}%`}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  {breakdown.map(({ type, count, percentage }) => (
                    <span key={type}>
                      {getTypeLabel(type)}: {count} ({percentage}%)
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
