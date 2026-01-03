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
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Images className="h-6 w-6 text-primary" />
            Tipos de Conteúdo
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">
          Sem dados disponíveis
        </CardContent>
      </Card>
    );
  }

  const total = chartData.reduce((sum, item) => sum + item.count, 0);
  
  // Sort by count for better visualization
  const sortedData = [...chartData].sort((a, b) => b.count - a.count);

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

  // Find best type by engagement
  const bestType = sortedData.reduce((best, item) => 
    item.avgEngagement > best.avgEngagement ? item : best
  , sortedData[0]);

  return (
    <Card className="col-span-full overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-background via-background to-primary/5">
      <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Images className="h-6 w-6 text-primary" />
            </div>
            Tipos de Conteúdo
          </CardTitle>
          <div className="text-right">
            <div className="text-3xl font-bold text-primary">{total}</div>
            <div className="text-xs text-muted-foreground">posts analisados</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Main layout - larger chart and detailed stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Large Donut Chart */}
          <div className="relative mx-auto">
            <ResponsiveContainer width={280} height={280}>
              <PieChart>
                <Pie
                  data={sortedData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={120}
                  paddingAngle={3}
                  dataKey="count"
                  strokeWidth={0}
                >
                  {sortedData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color}
                      className="transition-all duration-300 hover:opacity-80 cursor-pointer drop-shadow-lg"
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="text-center bg-background/80 backdrop-blur-sm rounded-full p-4">
                <span className="text-4xl font-bold">{total}</span>
                <div className="text-sm text-muted-foreground">publicações</div>
              </div>
            </div>
          </div>

          {/* Detailed Stats Cards */}
          <div className="space-y-4">
            {sortedData.map((item, idx) => {
              const percentage = ((item.count / total) * 100).toFixed(1);
              const Icon = TYPE_ICONS[item.type] || Image;
              const isTop = idx === 0;

              return (
                <div 
                  key={item.type} 
                  className={`relative p-4 rounded-xl border transition-all duration-300 hover:scale-[1.02] ${
                    isTop 
                      ? 'bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30 shadow-lg' 
                      : 'bg-card hover:bg-muted/50 border-border'
                  }`}
                >
                  {isTop && (
                    <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full font-medium">
                      #1 Formato
                    </div>
                  )}
                  <div className="flex items-center gap-4">
                    {/* Icon with color background */}
                    <div 
                      className="p-3 rounded-xl"
                      style={{ backgroundColor: `${item.color}20` }}
                    >
                      <Icon 
                        className="h-6 w-6" 
                        style={{ color: item.color }}
                      />
                    </div>

                    {/* Name and Count */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${isTop ? 'text-lg' : 'text-base'}`}>{item.name}</span>
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold">{item.count}</span>
                        <span className="text-muted-foreground">posts ({percentage}%)</span>
                      </div>
                    </div>

                    {/* Avg engagement */}
                    <div className="text-right">
                      <div 
                        className="text-xl font-bold"
                        style={{ color: item.color }}
                      >
                        ~{item.avgEngagement}
                      </div>
                      <div className="text-xs text-muted-foreground">engagement/post</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Visual bar representation - larger */}
        <div className="mt-8 space-y-2">
          <div className="text-sm font-medium text-muted-foreground">Distribuição Visual</div>
          <div className="h-6 rounded-full overflow-hidden flex bg-muted/50 shadow-inner">
            {sortedData.map((item) => {
              const percentage = (item.count / total) * 100;
              return (
                <div
                  key={item.type}
                  className="h-full transition-all duration-500 hover:brightness-110 relative group"
                  style={{
                    width: `${percentage}%`,
                    background: `linear-gradient(135deg, ${item.color}, ${item.color}DD)`,
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs font-bold text-white drop-shadow-lg">{percentage.toFixed(0)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            {sortedData.map((item) => (
              <div key={item.type} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span>{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Smart recommendation - enhanced */}
        {sortedData.length > 1 && (() => {
          const sorted = [...sortedData].sort((a, b) => b.avgEngagement - a.avgEngagement);
          const best = sorted[0];
          const worst = sorted[sorted.length - 1];
          
          if (best && worst && best.avgEngagement > worst.avgEngagement * 1.1) {
            const improvement = Math.round(((best.avgEngagement - worst.avgEngagement) / worst.avgEngagement) * 100);
            return (
              <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-amber-500/15 to-orange-500/10 border border-amber-500/30">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-amber-500/20">
                    <Lightbulb className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <div className="font-semibold text-amber-700 dark:text-amber-300 mb-1">Recomendação</div>
                    <p className="text-sm text-amber-700/80 dark:text-amber-400/80">
                      <strong>{best.name}</strong> geram <strong>+{improvement}%</strong> mais engagement que {worst.name.toLowerCase()}. 
                      Considere aumentar a frequência deste formato nas suas publicações.
                    </p>
                  </div>
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