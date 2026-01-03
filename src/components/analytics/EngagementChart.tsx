import { useState, useMemo, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AreaChart as AreaChartIcon, LineChart as LineChartIcon, TrendingUp, Heart, MessageCircle, BarChart3 } from "lucide-react";
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

// Premium vibrant colors
const LIKES_COLOR = "#F43F5E";     // Rose-500
const COMMENTS_COLOR = "#8B5CF6"; // Violet-500
const POSTS_COLOR = "#10B981";    // Emerald-500

export const EngagementChart = memo(function EngagementChart({ data }: EngagementChartProps) {
  const [chartType, setChartType] = useState<"line" | "area">("area");
  const [granularity, setGranularity] = useState<Granularity>("monthly");
  const [showLikes, setShowLikes] = useState(true);
  const [showComments, setShowComments] = useState(true);
  const [showPosts, setShowPosts] = useState(false);

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
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
          <CardTitle className="text-lg flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            Performance Temporal
          </CardTitle>
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
      <div className="rounded-xl border bg-card/95 backdrop-blur-sm p-4 shadow-xl min-w-[180px]">
        <p className="font-bold mb-3 text-sm border-b border-border/50 pb-2">{label}</p>
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full shadow-sm"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-xs text-muted-foreground">{entry.name}</span>
              </div>
              <span className="font-bold text-sm">{formatNumber(entry.value)}</span>
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
        axisLine={{ stroke: "hsl(var(--border))", strokeOpacity: 0.3 }}
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
        width={50}
      />
    ),
  };

  const granularityLabels: Record<Granularity, string> = {
    daily: "Diário",
    weekly: "Semanal",
    monthly: "Mensal",
  };

  return (
    <Card 
      className="overflow-hidden" 
      id="engagement-chart"
      role="region"
      aria-label="Gráfico de performance temporal"
    >
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex flex-col gap-4">
          {/* Title and controls row */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-lg font-bold flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10" aria-hidden="true">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              Performance Temporal
            </CardTitle>
            <div className="flex items-center gap-2">
              {/* Granularity toggle */}
              <div className="flex items-center gap-0.5 bg-muted/60 rounded-xl p-1">
                {(["daily", "weekly", "monthly"] as Granularity[]).map((g) => (
                  <Button
                    key={g}
                    variant={granularity === g ? "secondary" : "ghost"}
                    size="sm"
                    className={`h-7 px-3 text-xs rounded-lg transition-all ${
                      granularity === g ? "shadow-sm bg-background" : "hover:bg-muted"
                    }`}
                    onClick={() => setGranularity(g)}
                  >
                    {granularityLabels[g]}
                  </Button>
                ))}
              </div>

              {/* Chart type toggle */}
              <div className="flex items-center gap-0.5 bg-muted/60 rounded-xl p-1">
                <Button
                  variant={chartType === "line" ? "secondary" : "ghost"}
                  size="sm"
                  className={`h-7 px-2 rounded-lg transition-all ${chartType === "line" ? "shadow-sm bg-background" : ""}`}
                  onClick={() => setChartType("line")}
                >
                  <LineChartIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant={chartType === "area" ? "secondary" : "ghost"}
                  size="sm"
                  className={`h-7 px-2 rounded-lg transition-all ${chartType === "area" ? "shadow-sm bg-background" : ""}`}
                  onClick={() => setChartType("area")}
                >
                  <AreaChartIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          
          {/* Metric toggles - premium switches */}
          <div className="flex items-center gap-5 flex-wrap">
            <div className="flex items-center gap-2">
              <Switch
                id="show-likes"
                checked={showLikes}
                onCheckedChange={setShowLikes}
                className="data-[state=checked]:bg-rose-500"
              />
              <label 
                htmlFor="show-likes" 
                className="text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <Heart className="h-3.5 w-3.5 text-rose-500" />
                Likes
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="show-comments"
                checked={showComments}
                onCheckedChange={setShowComments}
                className="data-[state=checked]:bg-violet-500"
              />
              <label 
                htmlFor="show-comments" 
                className="text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <MessageCircle className="h-3.5 w-3.5 text-violet-500" />
                Comentários
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="show-posts"
                checked={showPosts}
                onCheckedChange={setShowPosts}
                className="data-[state=checked]:bg-emerald-500"
              />
              <label 
                htmlFor="show-posts" 
                className="text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <BarChart3 className="h-3.5 w-3.5 text-emerald-500" />
                Posts
              </label>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <ResponsiveContainer width="100%" height={280} className="sm:!h-[320px]">
          {chartType === "area" ? (
            <RechartsAreaChart {...commonProps}>
              <defs>
                <linearGradient id="likesGradientPremium" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={LIKES_COLOR} stopOpacity={0.4} />
                  <stop offset="50%" stopColor={LIKES_COLOR} stopOpacity={0.12} />
                  <stop offset="100%" stopColor={LIKES_COLOR} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="commentsGradientPremium" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COMMENTS_COLOR} stopOpacity={0.4} />
                  <stop offset="50%" stopColor={COMMENTS_COLOR} stopOpacity={0.12} />
                  <stop offset="100%" stopColor={COMMENTS_COLOR} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="postsGradientPremium" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={POSTS_COLOR} stopOpacity={0.35} />
                  <stop offset="50%" stopColor={POSTS_COLOR} stopOpacity={0.1} />
                  <stop offset="100%" stopColor={POSTS_COLOR} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                strokeOpacity={0.3}
                vertical={false}
              />
              {commonAxisProps.xAxis}
              {commonAxisProps.yAxis}
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: "16px" }}
                formatter={(value) => (
                  <span className="text-xs text-muted-foreground font-medium">{value}</span>
                )}
              />
              {showLikes && (
                <Area
                  type="monotone"
                  dataKey="likes"
                  name="Likes"
                  stroke={LIKES_COLOR}
                  fill="url(#likesGradientPremium)"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 6, strokeWidth: 3, stroke: "#fff", fill: LIKES_COLOR }}
                  animationDuration={800}
                />
              )}
              {showComments && (
                <Area
                  type="monotone"
                  dataKey="comments"
                  name="Comentários"
                  stroke={COMMENTS_COLOR}
                  fill="url(#commentsGradientPremium)"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 6, strokeWidth: 3, stroke: "#fff", fill: COMMENTS_COLOR }}
                  animationDuration={800}
                />
              )}
              {showPosts && (
                <Area
                  type="monotone"
                  dataKey="posts"
                  name="Posts"
                  stroke={POSTS_COLOR}
                  fill="url(#postsGradientPremium)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff", fill: POSTS_COLOR }}
                  animationDuration={800}
                />
              )}
            </RechartsAreaChart>
          ) : (
            <LineChart {...commonProps}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                strokeOpacity={0.3}
                vertical={false}
              />
              {commonAxisProps.xAxis}
              {commonAxisProps.yAxis}
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: "16px" }}
                formatter={(value) => (
                  <span className="text-xs text-muted-foreground font-medium">{value}</span>
                )}
              />
              {showLikes && (
                <Line
                  type="monotone"
                  dataKey="likes"
                  name="Likes"
                  stroke={LIKES_COLOR}
                  strokeWidth={3}
                  dot={{ fill: LIKES_COLOR, strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 7, strokeWidth: 3, stroke: "#fff" }}
                  animationDuration={800}
                />
              )}
              {showComments && (
                <Line
                  type="monotone"
                  dataKey="comments"
                  name="Comentários"
                  stroke={COMMENTS_COLOR}
                  strokeWidth={3}
                  dot={{ fill: COMMENTS_COLOR, strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 7, strokeWidth: 3, stroke: "#fff" }}
                  animationDuration={800}
                />
              )}
              {showPosts && (
                <Line
                  type="monotone"
                  dataKey="posts"
                  name="Posts"
                  stroke={POSTS_COLOR}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  animationDuration={800}
                />
              )}
            </LineChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
});
