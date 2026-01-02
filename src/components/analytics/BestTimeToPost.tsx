import { Clock } from "lucide-react";
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

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
const HOURS = [8, 10, 12, 14, 16, 18, 20, 22];

export function BestTimeToPost({ analytics }: BestTimeToPostProps) {
  // Build heatmap data
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

  // Calculate averages and find max for normalization
  const averages = new Map<string, number>();
  let maxAvg = 0;

  heatmapData.forEach((data, key) => {
    const avg = data.total / data.count;
    averages.set(key, avg);
    if (avg > maxAvg) maxAvg = avg;
  });

  // Get intensity color
  const getIntensity = (day: number, hour: number) => {
    const key = `${day}-${hour}`;
    const avg = averages.get(key);

    if (!avg || maxAvg === 0) return { opacity: 0.1, avg: 0, count: 0 };

    const opacity = Math.max(0.1, avg / maxAvg);
    const data = heatmapData.get(key) || { count: 0 };

    return { opacity, avg: Math.round(avg), count: data.count };
  };

  // Find best time
  let bestTime = { day: 0, hour: 0, avg: 0 };
  averages.forEach((avg, key) => {
    if (avg > bestTime.avg) {
      const [day, hour] = key.split("-").map(Number);
      bestTime = { day, hour, avg };
    }
  });

  const formatNumber = (num: number) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (analytics.length < 10) {
    return null; // Not enough data for meaningful analysis
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Melhor Horário para Publicar
          </CardTitle>
          {bestTime.avg > 0 && (
            <span className="text-sm text-muted-foreground">
              Pico: {DAYS[bestTime.day]} {bestTime.hour}h
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="overflow-x-auto">
            <div className="min-w-[400px]">
              {/* Header row with hours */}
              <div className="flex gap-1 mb-2 pl-10">
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="w-10 text-center text-xs text-muted-foreground"
                  >
                    {hour}h
                  </div>
                ))}
              </div>

              {/* Heatmap grid */}
              <div className="space-y-1">
                {DAYS.map((dayName, dayIndex) => (
                  <div key={dayName} className="flex items-center gap-1">
                    <div className="w-9 text-xs text-muted-foreground text-right pr-1">
                      {dayName}
                    </div>
                    {HOURS.map((hour) => {
                      const { opacity, avg, count } = getIntensity(dayIndex, hour);
                      const isBest =
                        dayIndex === bestTime.day && hour === bestTime.hour;

                      return (
                        <Tooltip key={`${dayIndex}-${hour}`}>
                          <TooltipTrigger asChild>
                            <div
                              className={`w-10 h-8 rounded-md transition-all cursor-pointer hover:scale-110 ${
                                isBest ? "ring-2 ring-primary ring-offset-1" : ""
                              }`}
                              style={{
                                backgroundColor: `hsl(var(--primary) / ${opacity})`,
                              }}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-sm">
                              <p className="font-medium">
                                {DAYS[dayIndex]} às {hour}h
                              </p>
                              {count > 0 ? (
                                <>
                                  <p className="text-muted-foreground">
                                    {count} posts
                                  </p>
                                  <p className="text-muted-foreground">
                                    Média: {formatNumber(avg)} engagement
                                  </p>
                                </>
                              ) : (
                                <p className="text-muted-foreground">
                                  Sem dados
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
              <div className="flex items-center justify-end gap-2 mt-4 text-xs text-muted-foreground">
                <span>Menos</span>
                <div className="flex gap-0.5">
                  {[0.1, 0.3, 0.5, 0.7, 1].map((opacity) => (
                    <div
                      key={opacity}
                      className="w-4 h-4 rounded-sm"
                      style={{
                        backgroundColor: `hsl(var(--primary) / ${opacity})`,
                      }}
                    />
                  ))}
                </div>
                <span>Mais engagement</span>
              </div>
            </div>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
