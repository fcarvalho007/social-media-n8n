import { useMemo, memo } from "react";
import { Clock, Trophy, TrendingUp, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { InstagramAnalyticsItem } from "@/hooks/useInstagramAnalytics";

interface BestTimeToPostProps {
  analytics: InstagramAnalyticsItem[];
  contextLabel?: string;
}

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DAYS_FULL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const HOURS = [6, 8, 10, 12, 14, 16, 18, 20, 22];

// Premium gradient colors for heatmap
const HEATMAP_BASE = "#6366F1"; // Primary indigo

export const BestTimeToPost = memo(function BestTimeToPost({ analytics, contextLabel }: BestTimeToPostProps) {
  const { heatmapData, averages, maxAvg, topTimes } = useMemo(() => {
    const heatmapData = new Map<string, { total: number; count: number }>();

    analytics.forEach((post) => {
      if (!post.posted_at) return;
      const date = new Date(post.posted_at);
      const day = date.getDay();
      const hour = date.getHours();
      const engagement = (post.likes_count || 0) + (post.comments_count || 0);

      // Map to closest hour bucket
      const hourBucket = HOURS.reduce((prev, curr) =>
        Math.abs(curr - hour) < Math.abs(prev - hour) ? curr : prev
      );

      const key = `${day}-${hourBucket}`;
      const existing = heatmapData.get(key) || { total: 0, count: 0 };
      heatmapData.set(key, {
        total: existing.total + engagement,
        count: existing.count + 1,
      });
    });

    // Calculate averages and find max
    const averages = new Map<string, number>();
    let maxAvg = 0;

    heatmapData.forEach((data, key) => {
      const avg = data.total / data.count;
      averages.set(key, avg);
      if (avg > maxAvg) maxAvg = avg;
    });

    // Get top 3 times
    const sortedTimes = Array.from(averages.entries())
      .map(([key, avg]) => {
        const [day, hour] = key.split("-").map(Number);
        const data = heatmapData.get(key) || { count: 0 };
        return { day, hour, avg: Math.round(avg), count: data.count };
      })
      .filter((t) => t.count >= 1)
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 3);

    return { heatmapData, averages, maxAvg, topTimes: sortedTimes };
  }, [analytics]);

  const getIntensity = (day: number, hour: number) => {
    const key = `${day}-${hour}`;
    const avg = averages.get(key);

    if (!avg || maxAvg === 0) return { opacity: 0.08, avg: 0, count: 0 };

    const normalizedOpacity = avg / maxAvg;
    // Use a curved scale for better visual distinction
    const opacity = Math.max(0.12, Math.pow(normalizedOpacity, 0.6));
    const data = heatmapData.get(key) || { count: 0 };

    return { opacity, avg: Math.round(avg), count: data.count };
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (analytics.length < 10) {
    return null;
  }

  const RANKING_ICONS = ["🥇", "🥈", "🥉"];
  const RANKING_BG = [
    "bg-gradient-to-br from-amber-500/20 to-yellow-500/10 ring-1 ring-amber-500/30",
    "bg-gradient-to-br from-slate-400/20 to-gray-400/10 ring-1 ring-slate-400/30",
    "bg-gradient-to-br from-orange-500/20 to-amber-500/10 ring-1 ring-orange-500/30",
  ];

  return (
    <Card 
      className="overflow-hidden" 
      id="best-times"
      role="region"
      aria-label={`Melhores horários para publicar. Baseado na análise de ${analytics.length} publicações.`}
    >
      <CardHeader className="pb-4 flex flex-row items-center justify-between space-y-0 flex-wrap gap-2 bg-gradient-to-r from-primary/5 to-transparent">
        <CardTitle className="text-base font-bold flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10" aria-hidden="true">
            <Clock className="h-4 w-4 text-primary" />
          </div>
          Melhores Horários
        </CardTitle>
        {contextLabel && (
          <Badge variant="outline" className="text-xs font-normal rounded-full" role="status">
            {contextLabel}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-0">
        {/* Two column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8">
          {/* Left: Heatmap */}
          <div>
            <TooltipProvider>
              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent -mx-2 px-2">
                <div className="min-w-[360px]" role="grid" aria-label="Mapa de calor de engagement por dia e hora">
                  {/* Header row with hours */}
                  <div className="flex gap-1 mb-2 pl-12">
                    {HOURS.map((hour) => (
                      <div
                        key={hour}
                        className="w-10 text-center text-[10px] text-muted-foreground font-medium"
                      >
                        {hour}h
                      </div>
                    ))}
                  </div>

                  {/* Heatmap grid */}
                  <div className="space-y-1.5" role="rowgroup">
                    {DAYS.map((dayName, dayIndex) => (
                      <div key={dayName} className="flex items-center gap-1" role="row">
                        <div className="w-10 text-[11px] text-muted-foreground text-right pr-2 font-medium" role="rowheader">
                          {dayName}
                        </div>
                        {HOURS.map((hour) => {
                          const { opacity, avg, count } = getIntensity(dayIndex, hour);
                          const isTopTime = topTimes.some(
                            (t) => t.day === dayIndex && t.hour === hour
                          );

                          return (
                            <Tooltip key={`${dayIndex}-${hour}`}>
                              <TooltipTrigger asChild>
                                <div
                                  role="gridcell"
                                  tabIndex={0}
                                  aria-label={`${DAYS_FULL[dayIndex]} às ${hour}h: ${count > 0 ? `${count} posts, ${formatNumber(avg)} engagement médio` : 'Sem dados'}`}
                                  className={`w-9 sm:w-10 h-8 sm:h-9 rounded-lg transition-all duration-200 cursor-pointer hover:scale-110 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                                    isTopTime
                                      ? "ring-2 ring-amber-500 ring-offset-1 ring-offset-background shadow-amber-500/30 shadow-lg"
                                      : ""
                                  }`}
                                  style={{
                                    backgroundColor:
                                      count > 0
                                        ? `${HEATMAP_BASE}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`
                                        : "hsl(var(--muted) / 0.4)",
                                  }}
                                >
                                  {isTopTime && (
                                    <div className="h-full w-full flex items-center justify-center">
                                      <Sparkles className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
                                    </div>
                                  )}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="p-3 rounded-xl shadow-xl">
                                <div className="text-sm">
                                  <p className="font-bold">
                                    {DAYS_FULL[dayIndex]} às {hour}h
                                  </p>
                                  {count > 0 ? (
                                    <div className="mt-1.5 text-muted-foreground space-y-0.5">
                                      <p>{count} post{count > 1 ? "s" : ""}</p>
                                      <p className="font-semibold text-foreground">
                                        {formatNumber(avg)} engagement médio
                                      </p>
                                    </div>
                                  ) : (
                                    <p className="text-muted-foreground mt-1">
                                      Sem dados neste horário
                                    </p>
                                  )}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </div>
                    ))}
                  </div>

                  {/* Legend */}
                  <div className="flex items-center justify-end gap-2 mt-4 text-[10px] text-muted-foreground">
                    <span>Menos engagement</span>
                    <div className="flex gap-0.5">
                      {[0.12, 0.3, 0.5, 0.7, 0.9].map((opacity) => (
                        <div
                          key={opacity}
                          className="w-5 h-5 rounded"
                          style={{
                            backgroundColor: `${HEATMAP_BASE}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
                          }}
                        />
                      ))}
                    </div>
                    <span>Mais engagement</span>
                  </div>
                </div>
              </div>
            </TooltipProvider>
          </div>

          {/* Right: Top 3 recommendations */}
          {topTimes.length > 0 && (
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-xl bg-amber-500/10">
                  <Trophy className="h-4 w-4 text-amber-500" />
                </div>
                <span className="font-bold text-sm">Top 3 Horários</span>
              </div>
              <div className="space-y-3 flex-1">
                {topTimes.map((time, index) => (
                  <div
                    key={`${time.day}-${time.hour}`}
                    className={`rounded-xl p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${RANKING_BG[index]}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-3xl">{RANKING_ICONS[index]}</div>
                      <div className="flex-1">
                        <div className="font-bold text-base">
                          {DAYS_FULL[time.day]} às {time.hour}h
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                          <TrendingUp className="h-3.5 w-3.5" />
                          <span className="font-medium text-foreground">~{formatNumber(time.avg)}</span>
                          <span>engagement médio</span>
                          <span className="opacity-60">• {time.count} posts</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});
