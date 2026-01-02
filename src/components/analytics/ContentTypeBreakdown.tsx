import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import type { AnalyticsStats } from "@/hooks/useInstagramAnalytics";

interface ContentTypeBreakdownProps {
  data: AnalyticsStats["contentTypeBreakdown"];
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "hsl(221 83% 53%)", // blue
  "hsl(142 71% 45%)", // green
  "hsl(45 93% 47%)",  // yellow
];

const TYPE_LABELS: Record<string, string> = {
  Image: "Imagem",
  Video: "Vídeo",
  Sidecar: "Carrossel",
  Reel: "Reel",
};

export function ContentTypeBreakdown({ data }: ContentTypeBreakdownProps) {
  const chartData = data.map((item) => ({
    ...item,
    name: TYPE_LABELS[item.type] || item.type,
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Tipos de Conteúdo</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="count"
              label={({ name, count }) => `${name}: ${count}`}
              labelLine={false}
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              formatter={(value: number, name: string) => [
                `${value} (${((value / total) * 100).toFixed(1)}%)`,
                name,
              ]}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Stats below chart */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          {chartData.map((item, index) => (
            <div key={item.type} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-muted-foreground">{item.name}:</span>
              <span className="font-medium">~{item.avgEngagement} eng/post</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
