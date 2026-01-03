import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { CHART_COLORS } from "@/lib/analytics/chartColors";

interface AccountStat {
  username: string;
  avgEngagement: number;
  postsPerWeek: number;
  videoPercent: number;
  carouselPercent: number;
  engagementRate: number;
  followers: number;
}

interface ComparisonRadarChartProps {
  stats: AccountStat[];
}

const RADAR_COLORS = [
  "#6366F1", // Indigo
  "#F43F5E", // Rose
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#8B5CF6", // Violet
];

export function ComparisonRadarChart({ stats }: ComparisonRadarChartProps) {
  // Normalize values to 0-100 scale for radar
  const radarData = useMemo(() => {
    if (stats.length === 0) return [];

    const maxEngagement = Math.max(...stats.map((s) => s.avgEngagement), 1);
    const maxFrequency = Math.max(...stats.map((s) => s.postsPerWeek), 1);
    const maxRate = Math.max(...stats.map((s) => s.engagementRate), 1);
    const maxFollowers = Math.max(...stats.map((s) => s.followers), 1);

    const metrics = [
      { metric: "Engagement Médio", key: "engagement" },
      { metric: "Frequência", key: "frequency" },
      { metric: "% Vídeos", key: "video" },
      { metric: "% Carrosséis", key: "carousel" },
      { metric: "Taxa Engagement", key: "rate" },
      { metric: "Seguidores", key: "followers" },
    ];

    return metrics.map((m) => {
      const point: any = { metric: m.metric };
      stats.forEach((stat) => {
        let value = 0;
        switch (m.key) {
          case "engagement":
            value = (stat.avgEngagement / maxEngagement) * 100;
            break;
          case "frequency":
            value = (stat.postsPerWeek / maxFrequency) * 100;
            break;
          case "video":
            value = stat.videoPercent;
            break;
          case "carousel":
            value = stat.carouselPercent;
            break;
          case "rate":
            value = (stat.engagementRate / maxRate) * 100;
            break;
          case "followers":
            value = (stat.followers / maxFollowers) * 100;
            break;
        }
        point[stat.username] = Math.round(value);
      });
      return point;
    });
  }, [stats]);

  return (
    <Card className="card-premium">
      <CardHeader className="card-premium-header">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="h-5 w-5 text-primary" />
          Comparação Multidimensional
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="80%">
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis
                dataKey="metric"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 100]}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              />
              {stats.map((stat, index) => (
                <Radar
                  key={stat.username}
                  name={`@${stat.username}`}
                  dataKey={stat.username}
                  stroke={RADAR_COLORS[index % RADAR_COLORS.length]}
                  fill={RADAR_COLORS[index % RADAR_COLORS.length]}
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              ))}
              <Legend
                wrapperStyle={{ paddingTop: 20 }}
                formatter={(value) => (
                  <span className="text-sm text-foreground">{value}</span>
                )}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "12px",
                  boxShadow: "0 10px 40px -10px rgba(0,0,0,0.2)",
                }}
                formatter={(value: number) => [`${value}%`, ""]}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
