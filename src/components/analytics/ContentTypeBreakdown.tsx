import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { AnalyticsStats } from "@/hooks/useInstagramAnalytics";
import { Images, Image, Video, Film, Lightbulb } from "lucide-react";

interface ContentTypeBreakdownProps {
  data: AnalyticsStats["contentTypeBreakdown"];
}

// Modern, saturated colors
const COLORS: Record<string, string> = {
  Sidecar: "#A855F7", // Purple-500
  Image: "#3B82F6",   // Blue-500
  Video: "#22C55E",   // Green-500
  Reel: "#F59E0B",    // Amber-500
};

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
  const chartData = data.map((item) => ({
    ...item,
    name: TYPE_LABELS[item.type] || item.type,
    color: COLORS[item.type] || "#64748B",
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
      <div className="rounded-xl border bg-card/95 backdrop-blur-sm p-3 shadow-xl">
        <div className="flex items-center gap-2 mb-2">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: data.color }}
          />
          <p className="font-semibold">{data.name}</p>
        </div>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p><span className="font-medium text-foreground">{data.count}</span> posts ({percentage}%)</p>
          <p>~<span className="font-medium text-foreground">{data.avgEngagement}</span> engagement/post</p>
        </div>
      </div>
    );
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Tipos de Conteúdo</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Responsive layout: vertical on mobile, horizontal on desktop */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-6">
          {/* Donut Chart - Centered on mobile */}
          <div className="relative flex-shrink-0 mx-auto md:mx-0">
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={65}
                  paddingAngle={4}
                  dataKey="count"
                  strokeWidth={0}
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color}
                      className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label with animation */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold">{total}</span>
              <span className="text-[10px] text-muted-foreground">posts</span>
            </div>
          </div>

          {/* Legend with stats - Responsive grid on mobile */}
          <div className="flex-1 w-full space-y-2 py-2">
            {chartData.map((item) => {
              const percentage = ((item.count / total) * 100).toFixed(0);
              const Icon = TYPE_ICONS[item.type] || Image;

              return (
                <div 
                  key={item.type} 
                  className="flex items-center gap-2 md:gap-3 p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  {/* Color indicator */}
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: item.color }}
                  />

                  {/* Icon and name */}
                  <div className="flex items-center gap-1.5 md:gap-2 min-w-[70px] md:min-w-[90px]">
                    <Icon className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
                    <span className="font-medium text-xs md:text-sm">{item.name}</span>
                  </div>

                  {/* Count and percentage */}
                  <div className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
                    <span className="font-semibold">{item.count}</span>
                    <span className="text-muted-foreground">({percentage}%)</span>
                  </div>

                  {/* Avg engagement */}
                  <div 
                    className="ml-auto text-[10px] md:text-xs font-medium px-1.5 md:px-2 py-0.5 rounded-full"
                    style={{ 
                      backgroundColor: `${item.color}20`,
                      color: item.color 
                    }}
                  >
                    ~{item.avgEngagement}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Visual bar representation with gradient */}
        <div className="mt-4 h-3 rounded-full overflow-hidden flex bg-muted/50 shadow-inner">
          {chartData.map((item) => {
            const percentage = (item.count / total) * 100;
            return (
              <div
                key={item.type}
                className="h-full transition-all duration-500 hover:brightness-110"
                style={{
                  width: `${percentage}%`,
                  background: `linear-gradient(135deg, ${item.color}, ${item.color}DD)`,
                }}
                title={`${item.name}: ${item.count} (${percentage.toFixed(1)}%)`}
              />
            );
          })}
        </div>

        {/* Smart recommendation */}
        {chartData.length > 1 && (() => {
          const sorted = [...chartData].sort((a, b) => b.avgEngagement - a.avgEngagement);
          const best = sorted[0];
          const worst = sorted[sorted.length - 1];
          
          if (best && worst && best.avgEngagement > worst.avgEngagement * 1.15) {
            const improvement = Math.round(((best.avgEngagement - worst.avgEngagement) / worst.avgEngagement) * 100);
            return (
              <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                <div className="flex items-start gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    <strong>{best.name}</strong> têm <strong>+{improvement}%</strong> mais engagement que {worst.name.toLowerCase()}. 
                    Considere publicar mais deste formato.
                  </p>
                </div>
              </div>
            );
          }
          return null;
        })()}
      </CardContent>
    </Card>
  );
}