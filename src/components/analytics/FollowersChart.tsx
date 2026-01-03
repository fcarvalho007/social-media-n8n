import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { InstagramProfile } from "@/hooks/useInstagramProfiles";
import { DateRangeBadge } from "./DateRangeBadge";
import { Users } from "lucide-react";

interface FollowersChartProps {
  profiles: InstagramProfile[];
  mainAccount?: string;
}

const MAIN_ACCOUNT = "frederico.m.carvalho";
const MAIN_COLOR = "#F59E0B";
const COMPETITOR_COLORS = [
  "#6366F1", "#EC4899", "#14B8A6", "#F97316", 
  "#8B5CF6", "#06B6D4", "#84CC16"
];

export function FollowersChart({ profiles, mainAccount = MAIN_ACCOUNT }: FollowersChartProps) {
  // Sort by followers descending
  const sortedProfiles = [...profiles].sort((a, b) => b.followers_count - a.followers_count);

  const data = sortedProfiles.map((profile, index) => {
    const isMain = profile.username === mainAccount;
    return {
      username: `@${profile.username}`,
      followers: profile.followers_count,
      following: profile.follows_count,
      ratio: profile.follows_count > 0 ? (profile.followers_count / profile.follows_count).toFixed(1) : "∞",
      isMain,
      color: isMain ? MAIN_COLOR : COMPETITOR_COLORS[index % COMPETITOR_COLORS.length],
    };
  });

  const formatNumber = (value: number): string => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toString();
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null;
    
    const item = payload[0].payload;
    return (
      <div className="bg-popover border rounded-lg shadow-lg p-3">
        <p className={`font-semibold ${item.isMain ? "text-amber-600" : ""}`}>
          {item.username}
        </p>
        <div className="mt-2 space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Seguidores:</span>
            <span className="font-medium">{item.followers.toLocaleString()}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Seguindo:</span>
            <span className="font-medium">{item.following.toLocaleString()}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Rácio:</span>
            <span className="font-medium">{item.ratio}:1</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Seguidores por Conta
          </CardTitle>
          <DateRangeBadge analytics={profiles.map(p => ({ posted_at: p.scraped_at }))} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
            >
              <XAxis 
                type="number" 
                tickFormatter={formatNumber}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                type="category" 
                dataKey="username" 
                tick={{ fontSize: 11 }}
                width={75}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="followers" 
                radius={[0, 4, 4, 0]}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-2 mt-4 justify-center">
          {data.map((item) => (
            <div
              key={item.username}
              className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${
                item.isMain ? "bg-amber-500/10" : "bg-muted"
              }`}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className={item.isMain ? "font-medium text-amber-600" : ""}>
                {item.username}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
