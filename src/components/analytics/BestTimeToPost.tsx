import { useMemo } from "react";
import { Clock, Trophy, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { InstagramAnalyticsItem } from "@/hooks/useInstagramAnalytics";

interface BestTimeToPostProps {
  analytics: InstagramAnalyticsItem[];
}

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DAYS_FULL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const HOURS = [6, 8, 10, 12, 14, 16, 18, 20, 22];

export function BestTimeToPost({ analytics }: BestTimeToPostProps) {
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
    const opacity = Math.max(0.15, Math.pow(normalizedOpacity, 0.7));
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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Melhor Horário para Publicar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <TooltipProvider>
          <div className="overflow-x-auto">
            <div className="min-w-[450px]">
              {/* Header row with hours */}
              <div className="flex gap-1.5 mb-2 pl-12">
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="w-11 text-center text-xs text-muted-foreground font-medium"
                  >
                    {hour}h
                  </div>
                ))}
              </div>

              {/* Heatmap grid */}
              <div className="space-y-1.5">
                {DAYS.map((dayName, dayIndex) => (
                  <div key={dayName} className="flex items-center gap-1.5">
                    <div className="w-10 text-xs text-muted-foreground text-right pr-1 font-medium">
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
                              className={`w-11 h-10 rounded-lg transition-all cursor-pointer hover:scale-105 hover:shadow-md ${
                                isTopTime
                                  ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                                  : ""
                              }`}
                              style={{
                                background:
                                  count > 0
                                    ? `linear-gradient(135deg, hsl(var(--primary) / ${opacity * 0.8}), hsl(var(--primary) / ${opacity}))`
                                    : "hsl(var(--muted))",
                              }}
                            />
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <div className="text-sm">
                              <p className="font-medium">
                                {DAYS_FULL[dayIndex]} às {hour}h
                              </p>
                              {count > 0 ? (
                                <div className="mt-1 text-muted-foreground">
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
              <div className="flex items-center justify-end gap-3 mt-4 text-xs text-muted-foreground">
                <span>Menos</span>
                <div className="flex gap-1">
                  {[0.1, 0.25, 0.45, 0.7, 1].map((opacity) => (
                    <div
                      key={opacity}
                      className="w-5 h-5 rounded"
                      style={{
                        background: `linear-gradient(135deg, hsl(var(--primary) / ${opacity * 0.8}), hsl(var(--primary) / ${opacity}))`,
                      }}
                    />
                  ))}
                </div>
                <span>Mais engagement</span>
              </div>
            </div>
          </div>
        </TooltipProvider>

        {/* Top 3 recommendations */}
        {topTimes.length > 0 && (
          <div className="rounded-xl border bg-gradient-to-br from-primary/5 to-primary/10 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Melhores Horários Recomendados</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {topTimes.map((time, index) => (
                <div
                  key={`${time.day}-${time.hour}`}
                  className={`rounded-lg p-3 text-center transition-all ${
                    index === 0
                      ? "bg-primary/15 ring-1 ring-primary/30"
                      : "bg-card border"
                  }`}
                >
                  <div className="text-2xl mb-1">{RANKING_ICONS[index]}</div>
                  <div className="font-semibold text-sm">
                    {DAYS_FULL[time.day]}
                  </div>
                  <div className="text-lg font-bold text-primary">{time.hour}h</div>
                  <div className="flex items-center justify-center gap-1 mt-1 text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3" />
                    <span>~{formatNumber(time.avg)} eng</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    ({time.count} post{time.count > 1 ? "s" : ""})
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
