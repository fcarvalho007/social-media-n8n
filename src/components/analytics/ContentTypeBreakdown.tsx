import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { AnalyticsStats } from "@/hooks/useInstagramAnalytics";
import { Images, Image, Video, Film } from "lucide-react";

interface ContentTypeBreakdownProps {
  data: AnalyticsStats["contentTypeBreakdown"];
}

const COLORS = [
  "hsl(262, 83%, 58%)", // Purple
  "hsl(221, 83%, 53%)", // Blue
  "hsl(142, 71%, 45%)", // Green
  "hsl(25, 95%, 53%)",  // Orange
];

const TYPE_LABELS: Record<string, string> = {
  Image: "Imagem",
  Video: "Vídeo",
  Sidecar: "Carrossel",
  Reel: "Reel",
};

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Image: Image,
  Video: Video,
  Sidecar: Images,
  Reel: Film,
};

export function ContentTypeBreakdown({ data }: ContentTypeBreakdownProps) {
  const chartData = data.map((item, index) => ({
    ...item,
    name: TYPE_LABELS[item.type] || item.type,
    color: COLORS[index % COLORS.length],
  }));

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tipos de Conteúdo</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">
          Sem dados disponíveis
        </CardContent>
      </Card>
    );
  }

  const total = chartData.reduce((sum, item) => sum + item.count, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload;
    const percentage = ((data.count / total) * 100).toFixed(1);

    return (
      <div className="rounded-lg border bg-card p-3 shadow-lg">
        <p className="font-medium">{data.name}</p>
        <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
          <p>{data.count} posts ({percentage}%)</p>
          <p>~{data.avgEngagement} eng/post</p>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Tipos de Conteúdo</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-6">
          {/* Donut Chart */}
          <div className="relative flex-shrink-0">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="count"
                  strokeWidth={0}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold">{total}</span>
              <span className="text-xs text-muted-foreground">posts</span>
            </div>
          </div>

          {/* Legend with stats */}
          <div className="flex-1 space-y-3 py-2">
            {chartData.map((item, index) => {
              const percentage = ((item.count / total) * 100).toFixed(0);
              const Icon = TYPE_ICONS[item.type] || Image;

              return (
                <div key={item.type} className="flex items-center gap-3">
                  {/* Color indicator */}
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />

                  {/* Icon and name */}
                  <div className="flex items-center gap-2 min-w-[90px]">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{item.name}</span>
                  </div>

                  {/* Count and percentage */}
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold">{item.count}</span>
                    <span className="text-muted-foreground">({percentage}%)</span>
                  </div>

                  {/* Avg engagement */}
                  <div className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    ~{item.avgEngagement} eng
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Visual bar representation */}
        <div className="mt-4 h-3 rounded-full overflow-hidden flex bg-muted">
          {chartData.map((item, index) => {
            const percentage = (item.count / total) * 100;
            return (
              <div
                key={item.type}
                className="h-full transition-all"
                style={{
                  width: `${percentage}%`,
                  backgroundColor: item.color,
                }}
                title={`${item.name}: ${item.count} (${percentage.toFixed(1)}%)`}
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
