import { useState, useMemo } from "react";
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
import { format, startOfWeek, startOfMonth, parseISO } from "date-fns";
import { pt } from "date-fns/locale";

interface EngagementChartProps {
  data: AnalyticsStats["engagementOverTime"];
}

type Granularity = "daily" | "weekly" | "monthly";

// Vibrant colors
const LIKES_COLOR = "#F43F5E"; // Rose-500
const COMMENTS_COLOR = "#8B5CF6"; // Violet-500
const POSTS_COLOR = "#64748B"; // Slate-500

export function EngagementChart({ data }: EngagementChartProps) {
  const [chartType, setChartType] = useState<"line" | "area">("area");
  const [granularity, setGranularity] = useState<Granularity>("monthly");

  const formatNumber = (num: number) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Group data by granularity
  const chartData = useMemo(() => {
    if (data.length === 0) return [];

    const grouped = new Map<string, { likes: number; comments: number; posts: number }>();

    data.forEach((item) => {
      let key: string;
      const date = parseISO(item.date);

      switch (granularity) {
        case "daily":
          key = item.date;
          break;
        case "weekly":
          key = format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
          break;
        case "monthly":
        default:
          key = format(startOfMonth(date), "yyyy-MM");
          break;
      }

      const existing = grouped.get(key) || { likes: 0, comments: 0, posts: 0 };
      grouped.set(key, {
        likes: existing.likes + item.likes,
        comments: existing.comments + item.comments,
        posts: existing.posts + item.posts,
      });
    });

    // Sort and format
    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateKey, values]) => {
        let label: string;
        const date = parseISO(dateKey.length === 7 ? `${dateKey}-01` : dateKey);

        switch (granularity) {
          case "daily":
            label = format(date, "dd MMM", { locale: pt });
            break;
          case "weekly":
            label = `Sem ${format(date, "dd/MM", { locale: pt })}`;
            break;
          case "monthly":
          default:
            label = format(date, "MMM yy", { locale: pt });
            break;
        }

        return {
          date: dateKey,
          label,
          ...values,
          engagement: values.likes + values.comments,
        };
      });
  }, [data, granularity]);

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
      <div className="rounded-xl border bg-card/95 backdrop-blur-sm p-3 shadow-xl">
        <p className="font-semibold mb-2 text-sm">{label}</p>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full shadow-sm"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-xs text-muted-foreground">{entry.name}</span>
              </div>
              <span className="font-semibold text-sm">{formatNumber(entry.value)}</span>
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
        dataKey="label"
        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
        axisLine={{ stroke: "hsl(var(--border))", strokeOpacity: 0.5 }}
        tickLine={false}
        interval={granularity === "daily" ? "preserveStartEnd" : 0}
        angle={granularity === "daily" ? -45 : 0}
        textAnchor={granularity === "daily" ? "end" : "middle"}
        height={granularity === "daily" ? 60 : 30}
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

  const granularityLabels: Record<Granularity, string> = {
    daily: "Diário",
    weekly: "Semanal",
    monthly: "Mensal",
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg">Engagement ao Longo do Tempo</CardTitle>
          <div className="flex items-center gap-2">
            {/* Granularity toggle */}
            <div className="flex items-center gap-1 bg-muted/80 rounded-lg p-0.5">
              {(["daily", "weekly", "monthly"] as Granularity[]).map((g) => (
                <Button
                  key={g}
                  variant={granularity === g ? "secondary" : "ghost"}
                  size="sm"
                  className={`h-7 px-2.5 text-xs transition-all ${
                    granularity === g ? "shadow-sm" : "hover:bg-muted"
                  }`}
                  onClick={() => setGranularity(g)}
                >
                  {granularityLabels[g]}
                </Button>
              ))}
            </div>

            {/* Chart type toggle */}
            <div className="flex items-center gap-1 bg-muted/80 rounded-lg p-0.5">
              <Button
                variant={chartType === "line" ? "secondary" : "ghost"}
                size="sm"
                className={`h-7 px-2 transition-all ${chartType === "line" ? "shadow-sm" : ""}`}
                onClick={() => setChartType("line")}
              >
                <LineChartIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={chartType === "area" ? "secondary" : "ghost"}
                size="sm"
                className={`h-7 px-2 transition-all ${chartType === "area" ? "shadow-sm" : ""}`}
                onClick={() => setChartType("area")}
              >
                <AreaChart className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <ResponsiveContainer width="100%" height={260} className="sm:!h-[280px]">
          {chartType === "area" ? (
            <RechartsAreaChart {...commonProps}>
              <defs>
                <linearGradient id="likesGradientNew" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={LIKES_COLOR} stopOpacity={0.4} />
                  <stop offset="50%" stopColor={LIKES_COLOR} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={LIKES_COLOR} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="commentsGradientNew" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COMMENTS_COLOR} stopOpacity={0.4} />
                  <stop offset="50%" stopColor={COMMENTS_COLOR} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={COMMENTS_COLOR} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                strokeOpacity={0.4}
                vertical={false}
              />
              {commonAxisProps.xAxis}
              {commonAxisProps.yAxis}
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: "12px" }}
                formatter={(value) => (
                  <span className="text-xs text-muted-foreground">{value}</span>
                )}
              />
              <Area
                type="monotone"
                dataKey="likes"
                name="Likes"
                stroke={LIKES_COLOR}
                fill="url(#likesGradientNew)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
              />
              <Area
                type="monotone"
                dataKey="comments"
                name="Comentários"
                stroke={COMMENTS_COLOR}
                fill="url(#commentsGradientNew)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
              />
            </RechartsAreaChart>
          ) : (
            <LineChart {...commonProps}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                strokeOpacity={0.4}
                vertical={false}
              />
              {commonAxisProps.xAxis}
              {commonAxisProps.yAxis}
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: "12px" }}
                formatter={(value) => (
                  <span className="text-xs text-muted-foreground">{value}</span>
                )}
              />
              <Line
                type="monotone"
                dataKey="likes"
                name="Likes"
                stroke={LIKES_COLOR}
                strokeWidth={2.5}
                dot={{ fill: LIKES_COLOR, strokeWidth: 0, r: 3 }}
                activeDot={{ r: 6, strokeWidth: 2, stroke: "#fff" }}
              />
              <Line
                type="monotone"
                dataKey="comments"
                name="Comentários"
                stroke={COMMENTS_COLOR}
                strokeWidth={2.5}
                dot={{ fill: COMMENTS_COLOR, strokeWidth: 0, r: 3 }}
                activeDot={{ r: 6, strokeWidth: 2, stroke: "#fff" }}
              />
              <Line
                type="monotone"
                dataKey="posts"
                name="Posts"
                stroke={POSTS_COLOR}
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