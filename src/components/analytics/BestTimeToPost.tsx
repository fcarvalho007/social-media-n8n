import { useMemo } from "react";
import { Clock, Trophy, TrendingUp } from "lucide-react";
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

// Vibrant gradient colors
const HEATMAP_COLORS = {
  low: "hsl(262, 83%, 58%)",    // Purple
  high: "hsl(280, 87%, 65%)",   // Fuchsia
};

export function BestTimeToPost({ analytics, contextLabel }: BestTimeToPostProps) {
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
    const opacity = Math.max(0.15, Math.pow(normalizedOpacity, 0.6));
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

  return (
    <Card className="overflow-hidden" id="best-times">
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-violet-500/15">
            <Clock className="h-4 w-4 text-violet-500" />
          </div>
          Melhores Horários
        </CardTitle>
        {contextLabel && (
          <Badge variant="outline" className="text-xs font-normal">
            {contextLabel}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-0">
        {/* Two column layout */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left: Heatmap */}
          <div>
            <TooltipProvider>
              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                <div className="min-w-[400px]">
                  {/* Header row with hours */}
                  <div className="flex gap-1 mb-2 pl-10">
                    {HOURS.map((hour) => (
                      <div
                        key={hour}
                        className="w-9 text-center text-[10px] text-muted-foreground font-medium"
                      >
                        {hour}h
                      </div>
                    ))}
                  </div>

                  {/* Heatmap grid */}
                  <div className="space-y-1">
                    {DAYS.map((dayName, dayIndex) => (
                      <div key={dayName} className="flex items-center gap-1">
                        <div className="w-9 text-[10px] text-muted-foreground text-right pr-1 font-medium">
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
                                  className={`w-9 h-8 rounded-lg transition-all cursor-pointer hover:scale-110 hover:shadow-lg ${
                                    isTopTime
                                      ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
                                      : ""
                                  }`}
                                  style={{
                                    background:
                                      count > 0
                                        ? `linear-gradient(135deg, ${HEATMAP_COLORS.low}${Math.round(opacity * 255).toString(16).padStart(2, '0')}, ${HEATMAP_COLORS.high}${Math.round(opacity * 255).toString(16).padStart(2, '0')})`
                                        : "hsl(var(--muted) / 0.5)",
                                  }}
                                />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="p-3">
                                <div className="text-sm">
                                  <p className="font-semibold">
                                    {DAYS_FULL[dayIndex]} às {hour}h
                                  </p>
                                  {count > 0 ? (
                                    <div className="mt-1 text-muted-foreground space-y-0.5">
                                      <p>{count} post{count > 1 ? "s" : ""}</p>
                                      <p className="font-medium text-foreground">
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
                  <div className="flex items-center justify-end gap-2 mt-3 text-[10px] text-muted-foreground">
                    <span>Menos</span>
                    <div className="flex gap-0.5">
                      {[0.15, 0.35, 0.55, 0.75, 1].map((opacity) => (
                        <div
                          key={opacity}
                          className="w-4 h-4 rounded"
                          style={{
                            background: `linear-gradient(135deg, ${HEATMAP_COLORS.low}${Math.round(opacity * 255).toString(16).padStart(2, '0')}, ${HEATMAP_COLORS.high}${Math.round(opacity * 255).toString(16).padStart(2, '0')})`,
                          }}
                        />
                      ))}
                    </div>
                    <span>Mais</span>
                  </div>
                </div>
              </div>
            </TooltipProvider>
          </div>

          {/* Right: Top 3 recommendations */}
          {topTimes.length > 0 && (
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-violet-500/15">
                  <Trophy className="h-4 w-4 text-violet-500" />
                </div>
                <span className="font-semibold text-sm">Melhores Horários</span>
              </div>
              <div className="space-y-3 flex-1">
                {topTimes.map((time, index) => (
                  <div
                    key={`${time.day}-${time.hour}`}
                    className={`rounded-xl p-4 transition-all hover:scale-[1.02] ${
                      index === 0
                        ? "bg-gradient-to-br from-violet-500/15 to-purple-500/10 ring-1 ring-violet-500/30 shadow-lg"
                        : "bg-card border"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{RANKING_ICONS[index]}</div>
                      <div className="flex-1">
                        <div className="font-semibold">
                          {DAYS_FULL[time.day]} às {time.hour}h
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <TrendingUp className="h-3 w-3" />
                          <span>~{formatNumber(time.avg)} engagement médio</span>
                          <span className="opacity-50">({time.count} posts)</span>
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
}