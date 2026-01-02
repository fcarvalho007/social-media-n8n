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
} from "recharts";
import type { AnalyticsStats } from "@/hooks/useInstagramAnalytics";

interface HashtagCloudProps {
  data: AnalyticsStats["topHashtags"];
  contextLabel?: string;
}

export function HashtagCloud({ data, contextLabel }: HashtagCloudProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Top Hashtags</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">
          Sem hashtags disponíveis
        </CardContent>
      </Card>
    );
  }

  // Show top 10 in chart
  const chartData = data.slice(0, 10).map((item) => ({
    ...item,
    tag: item.tag.replace("#", ""),
  }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg">Top Hashtags</CardTitle>
        {contextLabel && (
          <Badge variant="outline" className="text-xs font-normal">
            {contextLabel}
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 60 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis 
              type="number" 
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
            />
            <YAxis 
              type="category" 
              dataKey="tag" 
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              width={80}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              formatter={(value: number, name: string) => [
                name === "count" ? `${value} posts` : `~${value} likes`,
                name === "count" ? "Utilizações" : "Média Likes",
              ]}
            />
            <Bar 
              dataKey="count" 
              fill="hsl(var(--primary))" 
              radius={[0, 4, 4, 0]}
              name="count"
            />
          </BarChart>
        </ResponsiveContainer>

        {/* Tag cloud below */}
        <div className="mt-4 flex flex-wrap gap-2">
          {data.slice(0, 15).map((item) => (
            <Badge 
              key={item.tag} 
              variant="secondary"
              className="text-xs"
            >
              {item.tag} ({item.count})
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
