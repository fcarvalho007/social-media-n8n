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

interface HashtagCloudProps {
  data: AnalyticsStats["topHashtags"];
  contextLabel?: string;
}

// Gradient colors for bars
const BAR_COLORS = [
  "#8B5CF6", // Violet
  "#A855F7", // Purple
  "#D946EF", // Fuchsia
  "#EC4899", // Pink
  "#F43F5E", // Rose
  "#F97316", // Orange
  "#EAB308", // Yellow
  "#22C55E", // Green
  "#14B8A6", // Teal
  "#3B82F6", // Blue
];

export function HashtagCloud({ data, contextLabel }: HashtagCloudProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-violet-500/15">
              <Hash className="h-4 w-4 text-violet-500" />
            </div>
            Top Hashtags
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">
          Sem hashtags disponíveis
        </CardContent>
      </Card>
    );
  }

  // Show top 10 in chart
  const chartData = data.slice(0, 10).map((item, index) => ({
    ...item,
    tag: item.tag.replace("#", ""),
    color: BAR_COLORS[index % BAR_COLORS.length],
  }));

  const maxCount = Math.max(...chartData.map(d => d.count));

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload;

    return (
      <div className="rounded-xl border bg-card/95 backdrop-blur-sm p-3 shadow-xl">
        <p className="font-semibold text-sm mb-1">#{data.tag}</p>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p><span className="font-medium text-foreground">{data.count}</span> utilizações</p>
          <p>~<span className="font-medium text-foreground">{data.avgLikes}</span> likes médios</p>
        </div>
      </div>
    );
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-violet-500/15">
            <Hash className="h-4 w-4 text-violet-500" />
          </div>
          Top Hashtags
        </CardTitle>
        {contextLabel && (
          <Badge variant="outline" className="text-xs font-normal">
            {contextLabel}
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="hsl(var(--border))" 
              strokeOpacity={0.3}
              horizontal={true}
              vertical={false}
            />
            <XAxis 
              type="number" 
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              type="category" 
              dataKey="tag" 
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              width={75}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `#${value.length > 10 ? value.slice(0, 10) + '...' : value}`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }} />
            <Bar 
              dataKey="count" 
              radius={[0, 6, 6, 0]}
              name="count"
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={`url(#gradient-${index})`}
                />
              ))}
            </Bar>
            <defs>
              {chartData.map((entry, index) => (
                <linearGradient key={`gradient-${index}`} id={`gradient-${index}`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={entry.color} stopOpacity={0.8} />
                  <stop offset="100%" stopColor={entry.color} stopOpacity={1} />
                </linearGradient>
              ))}
            </defs>
          </BarChart>
        </ResponsiveContainer>

        {/* Tag cloud below */}
        <div className="mt-4 flex flex-wrap gap-2">
          {data.slice(0, 15).map((item, index) => {
            // Calculate opacity based on rank
            const opacity = 1 - (index * 0.04);
            const color = BAR_COLORS[index % BAR_COLORS.length];
            
            return (
              <Badge 
                key={item.tag} 
                variant="secondary"
                className="text-xs transition-transform hover:scale-105 cursor-default"
                style={{ 
                  backgroundColor: `${color}15`,
                  color: color,
                  opacity: Math.max(opacity, 0.6),
                }}
              >
                #{item.tag} ({item.count})
              </Badge>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}