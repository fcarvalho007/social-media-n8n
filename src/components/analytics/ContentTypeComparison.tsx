import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { PieChart, Star, Lightbulb, Image, Video, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getAccountColorChart, MY_ACCOUNT_COLOR_CHART } from "@/lib/analytics/colors";
import { InsightBox } from "./InsightBox";
import type { InstagramAnalyticsItem } from "@/hooks/useInstagramAnalytics";

interface ContentTypeComparisonProps {
  analytics: InstagramAnalyticsItem[];
  selectedAccounts: string[];
  accountColorMap: Map<string, number>;
  myAccount?: string;
}

const CONTENT_TYPE_COLORS = {
  Image: "hsl(221, 83%, 53%)",
  Video: "hsl(340, 82%, 52%)",
  Sidecar: "hsl(142, 71%, 45%)",
};

export function ContentTypeComparison({
  analytics,
  selectedAccounts,
  accountColorMap,
  myAccount,
}: ContentTypeComparisonProps) {
  // Calculate content type breakdown per account (for 100% stacked bar)
  const { stackedData, accountBreakdowns, insights, boxInsights } = useMemo(() => {
    // Sort so myAccount comes first
    const sortedAccounts = myAccount && selectedAccounts.includes(myAccount)
      ? [myAccount, ...selectedAccounts.filter(a => a !== myAccount)]
      : selectedAccounts;

    const breakdowns: {
      username: string;
      colorIndex: number;
      isMyAccount: boolean;
      total: number;
      image: { count: number; pct: number };
      video: { count: number; pct: number };
      sidecar: { count: number; pct: number };
      dominant: string;
    }[] = [];

    sortedAccounts.forEach((username) => {
      const accountPosts = analytics.filter((p) => p.owner_username === username);
      const total = accountPosts.length;
      const colorIndex = accountColorMap.get(username) || 0;
      const isMyAccount = username === myAccount;

      const imageCount = accountPosts.filter((p) => (p.post_type || "Image") === "Image").length;
      const videoCount = accountPosts.filter((p) => p.post_type === "Video").length;
      const sidecarCount = accountPosts.filter((p) => p.post_type === "Sidecar").length;

      const imagePct = total > 0 ? Math.round((imageCount / total) * 100) : 0;
      const videoPct = total > 0 ? Math.round((videoCount / total) * 100) : 0;
      const sidecarPct = total > 0 ? Math.round((sidecarCount / total) * 100) : 0;

      // Find dominant type
      let dominant = "Image";
      if (videoPct > imagePct && videoPct > sidecarPct) dominant = "Video";
      else if (sidecarPct > imagePct && sidecarPct > videoPct) dominant = "Sidecar";

      breakdowns.push({
        username,
        colorIndex,
        isMyAccount,
        total,
        image: { count: imageCount, pct: imagePct },
        video: { count: videoCount, pct: videoPct },
        sidecar: { count: sidecarCount, pct: sidecarPct },
        dominant,
      });
    });

    // Create stacked bar data (horizontal bars, 100% stacked)
    const stacked = breakdowns.map((b) => ({
      username: b.username,
      isMyAccount: b.isMyAccount,
      Image: b.image.pct,
      Video: b.video.pct,
      Sidecar: b.sidecar.pct,
    }));

    // Generate insights for the component header
    const insightsList: { icon: React.ReactNode; text: string }[] = [];
    
    if (breakdowns.length >= 2 && myAccount) {
      const myStats = breakdowns.find(b => b.isMyAccount);
      const leader = breakdowns.find(b => !b.isMyAccount && b.total > 0);
      
      if (myStats && leader) {
        // Compare video usage
        if (leader.video.pct > myStats.video.pct + 15) {
          insightsList.push({
            icon: <Video className="h-4 w-4 text-pink-500" />,
            text: `@${leader.username} publica ${leader.video.pct}% de vídeos vs seus ${myStats.video.pct}%`
          });
        }
        
        // Compare carousels
        if (leader.sidecar.pct > myStats.sidecar.pct + 15) {
          insightsList.push({
            icon: <Layers className="h-4 w-4 text-green-500" />,
            text: `@${leader.username} usa ${leader.sidecar.pct}% de carrosseis vs seus ${myStats.sidecar.pct}%`
          });
        }

        // Dominant content type difference
        if (leader.dominant !== myStats.dominant) {
          insightsList.push({
            icon: <Lightbulb className="h-4 w-4 text-amber-500" />,
            text: `Líder aposta em ${getTypeLabel(leader.dominant)}, você em ${getTypeLabel(myStats.dominant)}`
          });
        }
      }
    }

    // Generate insights for InsightBox
    let boxForYou = "Selecione mais contas para comparar estratégias.";
    let boxFromData = "Dados insuficientes para análise.";

    if (breakdowns.length >= 1 && myAccount) {
      const myStats = breakdowns.find(b => b.isMyAccount);
      const competitors = breakdowns.filter(b => !b.isMyAccount);

      if (myStats) {
        boxForYou = `Sua estratégia: ${myStats.image.pct}% imagens, ${myStats.video.pct}% vídeos, ${myStats.sidecar.pct}% carrosseis. Formato dominante: ${getTypeLabel(myStats.dominant)}.`;
      }

      if (competitors.length > 0) {
        const avgVideo = Math.round(competitors.reduce((sum, c) => sum + c.video.pct, 0) / competitors.length);
        const avgSidecar = Math.round(competitors.reduce((sum, c) => sum + c.sidecar.pct, 0) / competitors.length);
        boxFromData = `Média dos concorrentes: ${avgVideo}% vídeos, ${avgSidecar}% carrosseis.`;
      }
    }

    return { 
      stackedData: stacked, 
      accountBreakdowns: breakdowns, 
      insights: insightsList.slice(0, 2),
      boxInsights: { forYou: boxForYou, fromData: boxFromData }
    };
  }, [analytics, selectedAccounts, accountColorMap, myAccount]);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "Image": return "Imagem";
      case "Video": return "Vídeo";
      case "Sidecar": return "Carrossel";
      default: return type;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "Image": return <Image className="h-3 w-3" />;
      case "Video": return <Video className="h-3 w-3" />;
      case "Sidecar": return <Layers className="h-3 w-3" />;
      default: return null;
    }
  };

  if (selectedAccounts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <PieChart className="h-5 w-5 text-primary" />
            Estratégia de Conteúdo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Selecione contas para comparar estratégias
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <PieChart className="h-5 w-5 text-primary" />
          Estratégia de Conteúdo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Legend */}
        <div className="flex flex-wrap gap-3 justify-center text-xs">
          {["Image", "Video", "Sidecar"].map((type) => (
            <div key={type} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: CONTENT_TYPE_COLORS[type as keyof typeof CONTENT_TYPE_COLORS] }}
              />
              <span className="text-muted-foreground">{getTypeLabel(type)}</span>
            </div>
          ))}
        </div>

        {/* 100% Stacked Horizontal Bar Chart */}
        <div className="overflow-x-auto -mx-4 px-4">
          <div className="min-w-[300px]">
            <ResponsiveContainer width="100%" height={Math.max(120, accountBreakdowns.length * 50)}>
              <BarChart
                data={stackedData}
                layout="vertical"
                margin={{ left: 0, right: 10, top: 5, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} className="text-xs" />
                <YAxis 
                  type="category" 
                  dataKey="username" 
                  width={100}
                  tick={({ x, y, payload }) => {
                    const isMe = payload.value === myAccount;
                    return (
                      <text 
                        x={x} 
                        y={y} 
                        dy={4} 
                        textAnchor="end" 
                        className={`text-xs ${isMe ? "fill-amber-600 font-semibold" : "fill-current"}`}
                      >
                        @{payload.value.length > 12 ? payload.value.slice(0, 12) + "..." : payload.value}
                        {isMe && " ⭐"}
                      </text>
                    );
                  }}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [`${value}%`, getTypeLabel(name)]}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="Image" stackId="a" fill={CONTENT_TYPE_COLORS.Image} radius={[4, 0, 0, 4]} />
                <Bar dataKey="Video" stackId="a" fill={CONTENT_TYPE_COLORS.Video} />
                <Bar dataKey="Sidecar" stackId="a" fill={CONTENT_TYPE_COLORS.Sidecar} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Comparative Table */}
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full text-xs min-w-[400px]">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 font-medium text-muted-foreground">Conta</th>
                <th className="text-center py-2 font-medium text-muted-foreground">
                  <div className="flex items-center justify-center gap-1">
                    <Image className="h-3 w-3 text-blue-500" /> Imagem
                  </div>
                </th>
                <th className="text-center py-2 font-medium text-muted-foreground">
                  <div className="flex items-center justify-center gap-1">
                    <Video className="h-3 w-3 text-pink-500" /> Vídeo
                  </div>
                </th>
                <th className="text-center py-2 font-medium text-muted-foreground">
                  <div className="flex items-center justify-center gap-1">
                    <Layers className="h-3 w-3 text-green-500" /> Carrossel
                  </div>
                </th>
                <th className="text-center py-2 font-medium text-muted-foreground">Total</th>
                <th className="text-center py-2 font-medium text-muted-foreground">Líder em</th>
              </tr>
            </thead>
            <tbody>
              {accountBreakdowns.map((account) => (
                <tr 
                  key={account.username} 
                  className={`border-b last:border-0 ${account.isMyAccount ? "bg-amber-50 dark:bg-amber-950/30" : ""}`}
                >
                  <td className="py-2">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ 
                          backgroundColor: account.isMyAccount 
                            ? MY_ACCOUNT_COLOR_CHART 
                            : getAccountColorChart(account.colorIndex) 
                        }}
                      />
                      <span className={`font-medium truncate max-w-[80px] ${account.isMyAccount ? "text-amber-700 dark:text-amber-300" : ""}`}>
                        @{account.username}
                      </span>
                      {account.isMyAccount && <Star className="h-3 w-3 fill-amber-500 text-amber-500 flex-shrink-0" />}
                    </div>
                  </td>
                  <td className="text-center py-2 tabular-nums">{account.image.pct}%</td>
                  <td className="text-center py-2 tabular-nums">{account.video.pct}%</td>
                  <td className="text-center py-2 tabular-nums">{account.sidecar.pct}%</td>
                  <td className="text-center py-2 tabular-nums font-medium">{account.total}</td>
                  <td className="text-center py-2">
                    <Badge 
                      variant="outline" 
                      className="text-xs gap-1"
                      style={{ 
                        borderColor: CONTENT_TYPE_COLORS[account.dominant as keyof typeof CONTENT_TYPE_COLORS],
                        color: CONTENT_TYPE_COLORS[account.dominant as keyof typeof CONTENT_TYPE_COLORS]
                      }}
                    >
                      {getTypeIcon(account.dominant)}
                      {getTypeLabel(account.dominant)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Original Insights */}
        {insights.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Insights
            </div>
            {insights.map((insight, idx) => (
              <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30 text-xs">
                {insight.icon}
                <span className="text-muted-foreground">{insight.text}</span>
              </div>
            ))}
          </div>
        )}

        <InsightBox
          title="Estratégia de Conteúdo"
          description="Que tipo de conteúdo (imagem, vídeo, carrossel) cada conta mais publica. Compare estratégias e descubra oportunidades."
          insights={boxInsights}
        />
      </CardContent>
    </Card>
  );
}
