import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AreaChart, LineChart as LineChartIcon } from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { AnalyticsStats } from "@/hooks/useInstagramAnalytics";

interface EngagementChartProps {
  data: AnalyticsStats["engagementOverTime"];
}

export function EngagementChart({ data }: EngagementChartProps) {
  const [chartType, setChartType] = useState<"line" | "area">("area");

  const formatMonth = (dateStr: string) => {
    const [year, month] = dateStr.split("-");
    const monthNames = [
      "Jan",
      "Fev",
      "Mar",
      "Abr",
      "Mai",
      "Jun",
      "Jul",
      "Ago",
      "Set",
      "Out",
      "Nov",
      "Dez",
    ];
    return `${monthNames[parseInt(month) - 1]} ${year.slice(2)}`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const chartData = data.map((item) => ({
    ...item,
    month: formatMonth(item.date),
    avgLikes: Math.round(item.likes / item.posts),
    avgComments: Math.round(item.comments / item.posts),
    engagement: item.likes + item.comments,
  }));

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Engagement ao Longo do Tempo</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">
          Sem dados disponíveis
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;

    return (
      <div className="rounded-lg border bg-card p-3 shadow-lg">
        <p className="font-medium mb-2">{label}</p>
        <div className="space-y-1 text-sm">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-muted-foreground">{entry.name}</span>
              </div>
              <span className="font-medium">{formatNumber(entry.value)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const commonProps = {
    data: chartData,
    margin: { top: 10, right: 10, left: 0, bottom: 0 },
  };

  const commonAxisProps = {
    xAxis: (
      <XAxis
        dataKey="month"
        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
        axisLine={{ stroke: "hsl(var(--border))" }}
        tickLine={false}
      />
    ),
    yAxis: (
      <YAxis
        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
        axisLine={false}
        tickLine={false}
        tickFormatter={formatNumber}
        width={45}
      />
    ),
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Engagement ao Longo do Tempo</CardTitle>
          <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
            <Button
              variant={chartType === "line" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2"
              onClick={() => setChartType("line")}
            >
              <LineChartIcon className="h-4 w-4" />
            </Button>
            <Button
              variant={chartType === "area" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2"
              onClick={() => setChartType("area")}
            >
              <AreaChart className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          {chartType === "area" ? (
            <RechartsAreaChart {...commonProps}>
              <defs>
                <linearGradient id="likesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="commentsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                vertical={false}
              />
              {commonAxisProps.xAxis}
              {commonAxisProps.yAxis}
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: "16px" }}
                formatter={(value) => (
                  <span className="text-sm text-muted-foreground">{value}</span>
                )}
              />
              <Area
                type="monotone"
                dataKey="likes"
                name="Likes"
                stroke="hsl(var(--destructive))"
                fill="url(#likesGradient)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="comments"
                name="Comentários"
                stroke="hsl(var(--primary))"
                fill="url(#commentsGradient)"
                strokeWidth={2}
              />
            </RechartsAreaChart>
          ) : (
            <LineChart {...commonProps}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                vertical={false}
              />
              {commonAxisProps.xAxis}
              {commonAxisProps.yAxis}
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: "16px" }}
                formatter={(value) => (
                  <span className="text-sm text-muted-foreground">{value}</span>
                )}
              />
              <Line
                type="monotone"
                dataKey="likes"
                name="Likes"
                stroke="hsl(var(--destructive))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--destructive))", strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="comments"
                name="Comentários"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="posts"
                name="Posts"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
