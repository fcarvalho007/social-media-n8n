import { memo, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Hash } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { AnalyticsStats } from "@/hooks/useInstagramAnalytics";
import { NoHashtagsEmptyState } from "./EmptyState";

interface HashtagCloudProps {
  data: AnalyticsStats["topHashtags"];
  contextLabel?: string;
}

// Premium gradient colors for bars
const BAR_COLORS = [
  "#6366F1", // Indigo (primary)
  "#8B5CF6", // Violet
  "#A855F7", // Purple
  "#D946EF", // Fuchsia
  "#EC4899", // Pink
  "#F43F5E", // Rose
  "#F97316", // Orange
  "#EAB308", // Yellow
  "#22C55E", // Green
  "#14B8A6", // Teal
];

export const HashtagCloud = memo(function HashtagCloud({ data, contextLabel }: HashtagCloudProps) {
  const chartData = useMemo(() => data.slice(0, 10).map((item, index) => ({
    ...item,
    tag: item.tag.replace("#", ""),
    displayTag: `#${item.tag.length > 14 ? item.tag.slice(0, 14) + '...' : item.tag}`,
    color: BAR_COLORS[index % BAR_COLORS.length],
  })), [data]);
  if (chartData.length === 0) {
    return (
      <Card className="overflow-hidden" role="region" aria-label="Análise de hashtags">
        <CardHeader className="bg-gradient-to-r from-violet-500/5 to-transparent">
          <CardTitle className="text-base flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-500/10" aria-hidden="true">
              <Hash className="h-4 w-4 text-violet-500" />
            </div>
            Top 10 Hashtags
          </CardTitle>
        </CardHeader>
        <CardContent>
          <NoHashtagsEmptyState />
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload;

    return (
      <div className="rounded-xl border bg-card/95 backdrop-blur-sm p-4 shadow-xl">
        <p className="font-bold text-sm mb-2 flex items-center gap-2">
          <span 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: data.color }}
          />
          #{data.tag}
        </p>
        <div className="space-y-1.5 text-xs">
          <p className="text-muted-foreground">
            <span className="font-semibold text-foreground">{data.count}</span> utilizações
          </p>
          <p className="text-muted-foreground">
            ~<span className="font-semibold text-foreground">{data.avgLikes}</span> likes médios
          </p>
        </div>
      </div>
    );
  };

  return (
    <Card 
      className="overflow-hidden"
      role="region"
      aria-label={`Top 10 hashtags mais utilizadas. ${chartData[0]?.tag || ''} é a mais usada com ${chartData[0]?.count || 0} utilizações.`}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 bg-gradient-to-r from-violet-500/5 to-transparent">
        <CardTitle className="text-base flex items-center gap-3">
          <div className="p-2 rounded-xl bg-violet-500/10" aria-hidden="true">
            <Hash className="h-4 w-4 text-violet-500" />
          </div>
          Top 10 Hashtags
        </CardTitle>
        {contextLabel && (
          <Badge variant="outline" className="text-xs font-normal rounded-full" role="status">
            {contextLabel}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="pt-2">
        <ResponsiveContainer width="100%" height={340}>
          <BarChart 
            data={chartData} 
            layout="vertical" 
            margin={{ left: 10, right: 25, top: 10, bottom: 10 }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="hsl(var(--border))" 
              strokeOpacity={0.2}
              horizontal={true}
              vertical={false}
            />
            <XAxis 
              type="number" 
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              type="category" 
              dataKey="displayTag" 
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              width={100}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip 
              content={<CustomTooltip />} 
              cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2, radius: 4 }} 
            />
            <Bar 
              dataKey="count" 
              radius={[0, 8, 8, 0]}
              name="count"
              barSize={28}
              animationDuration={800}
              animationEasing="ease-out"
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={`url(#hashtag-gradient-${index})`}
                  className="transition-all duration-300 hover:brightness-110"
                />
              ))}
            </Bar>
            <defs>
              {chartData.map((entry, index) => (
                <linearGradient 
                  key={`hashtag-gradient-${index}`} 
                  id={`hashtag-gradient-${index}`} 
                  x1="0" y1="0" x2="1" y2="0"
                >
                  <stop offset="0%" stopColor={entry.color} stopOpacity={0.6} />
                  <stop offset="100%" stopColor={entry.color} stopOpacity={1} />
                </linearGradient>
              ))}
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
});
