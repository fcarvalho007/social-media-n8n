import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MY_ACCOUNT_COLOR, getAccountColor } from "@/lib/analytics/colors";
import { InsightBox } from "./InsightBox";
import type { InstagramAnalyticsItem } from "@/hooks/useInstagramAnalytics";

interface PostingFrequencyHeatmapProps {
  analytics: InstagramAnalyticsItem[];
  selectedAccounts: string[];
  accountColorMap: Map<string, number>;
  myAccount?: string;
}

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DAYS_FULL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export function PostingFrequencyHeatmap({
  analytics,
  selectedAccounts,
  accountColorMap,
  myAccount,
}: PostingFrequencyHeatmapProps) {
  const { accountData, maxCount } = useMemo(() => {
    const accountData: Record<string, Record<number, number>> = {};
    let maxCount = 0;

    selectedAccounts.forEach((account) => {
      accountData[account] = {};
      DAYS.forEach((_, index) => {
        accountData[account][index] = 0;
      });
    });

    analytics.forEach((post) => {
      if (!post.posted_at || !selectedAccounts.includes(post.owner_username || "")) return;
      const day = new Date(post.posted_at).getDay();
      const account = post.owner_username!;
      accountData[account][day] = (accountData[account][day] || 0) + 1;
      maxCount = Math.max(maxCount, accountData[account][day]);
    });

    return { accountData, maxCount };
  }, [analytics, selectedAccounts]);

  // Generate insights
  const insights = useMemo(() => {
    if (selectedAccounts.length < 1 || !myAccount) {
      return { forYou: "Selecione contas para ver padrões.", fromData: "Dados insuficientes para análise." };
    }

    const myData = accountData[myAccount];
    if (!myData) {
      return { forYou: "Selecione sua conta para ver seus padrões.", fromData: "Dados insuficientes." };
    }

    // Find best day for my account
    const myBestDay = Object.entries(myData).reduce((best, [day, count]) => 
      count > best.count ? { day: parseInt(day), count } : best
    , { day: 0, count: 0 });

    // Find overall best day across competitors
    const dayTotals: Record<number, number> = {};
    DAYS.forEach((_, i) => { dayTotals[i] = 0; });
    
    selectedAccounts.filter(a => a !== myAccount).forEach(account => {
      Object.entries(accountData[account] || {}).forEach(([day, count]) => {
        dayTotals[parseInt(day)] += count;
      });
    });

    const competitorBestDay = Object.entries(dayTotals).reduce((best, [day, count]) =>
      count > best.count ? { day: parseInt(day), count } : best
    , { day: 0, count: 0 });

    const forYou = myBestDay.count > 0
      ? `Você publica mais às ${DAYS_FULL[myBestDay.day]}s (${myBestDay.count} posts). ${
          myBestDay.day !== competitorBestDay.day 
            ? `Concorrentes preferem ${DAYS_FULL[competitorBestDay.day]}.` 
            : "Mesmo padrão dos concorrentes."
        }`
      : "Sem dados suficientes para sua conta.";

    const myTotal = Object.values(myData).reduce((a, b) => a + b, 0);
    const weekdayPosts = [1, 2, 3, 4, 5].reduce((sum, d) => sum + (myData[d] || 0), 0);
    const weekendPosts = (myData[0] || 0) + (myData[6] || 0);

    const fromData = myTotal > 0
      ? `${Math.round((weekdayPosts / myTotal) * 100)}% dos seus posts são durante a semana, ${Math.round((weekendPosts / myTotal) * 100)}% ao fim-de-semana.`
      : "Publique mais para ver estatísticas de frequência.";

    return { forYou, fromData };
  }, [selectedAccounts, myAccount, accountData]);

  if (selectedAccounts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Frequência de Publicação por Dia</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[200px] text-muted-foreground">
          Selecione contas para comparar
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">📅 Frequência por Dia da Semana</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <TooltipProvider>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="p-2 text-left text-muted-foreground font-medium">Conta</th>
                  {DAYS.map((day) => (
                    <th key={day} className="p-2 text-center text-muted-foreground font-medium">
                      {day}
                    </th>
                  ))}
                  <th className="p-2 text-center text-muted-foreground font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {selectedAccounts.map((account) => {
                  const colorIndex = accountColorMap.get(account) ?? 0;
                  const isMyAccount = account === myAccount;
                  const color = isMyAccount ? MY_ACCOUNT_COLOR : getAccountColor(colorIndex);
                  const total = Object.values(accountData[account] || {}).reduce((a, b) => a + b, 0);

                  return (
                    <tr key={account} className={isMyAccount ? "bg-amber-500/5" : ""}>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span className={`text-xs truncate max-w-[120px] ${isMyAccount ? "font-semibold text-amber-700" : ""}`}>
                            @{account}
                          </span>
                          {isMyAccount && (
                            <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5 bg-amber-500/20 text-amber-700">
                              ⭐
                            </Badge>
                          )}
                        </div>
                      </td>
                      {DAYS.map((day, dayIndex) => {
                        const count = accountData[account]?.[dayIndex] || 0;
                        const intensity = maxCount > 0 ? count / maxCount : 0;

                        return (
                          <td key={day} className="p-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className="w-full h-8 rounded flex items-center justify-center text-xs font-medium transition-all hover:scale-105"
                                  style={{
                                    backgroundColor: count > 0 ? `${color}${Math.round(intensity * 0.6 * 255 + 0.2 * 255).toString(16).padStart(2, "0")}` : "hsl(var(--muted))",
                                    color: intensity > 0.5 ? "white" : "inherit",
                                  }}
                                >
                                  {count > 0 ? count : ""}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-medium">@{account}</p>
                                <p className="text-muted-foreground">
                                  {count} posts às {DAYS_FULL[dayIndex]}s
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </td>
                        );
                      })}
                      <td className="p-2 text-center font-semibold">
                        {total}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TooltipProvider>

        <InsightBox
          title="Frequência de Publicação"
          description="Mostra em que dias da semana cada conta publica mais. Células mais escuras indicam mais posts nesse dia."
          insights={insights}
        />
      </CardContent>
    </Card>
  );
}
