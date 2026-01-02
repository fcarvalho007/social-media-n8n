import { useState, useMemo } from "react";
import { Bot, FileText, Copy, Check, Download, Loader2, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { InstagramAnalyticsItem } from "@/hooks/useInstagramAnalytics";
import type { AccountStats } from "./AccountRanking";

interface CompetitorReportGeneratorProps {
  analytics: InstagramAnalyticsItem[];
  accounts: string[];
  accountStats: AccountStats[];
  myAccount?: string;
}

export function CompetitorReportGenerator({
  analytics,
  accounts,
  accountStats,
  myAccount,
}: CompetitorReportGeneratorProps) {
  const [selectedCompetitor, setSelectedCompetitor] = useState<string>("");
  const [report, setReport] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<string>("");
  const [copied, setCopied] = useState(false);

  // Filter out my account from competitors
  const competitors = useMemo(() => {
    return accounts.filter(a => a !== myAccount);
  }, [accounts, myAccount]);

  // Get detailed data for selected competitor
  const getAccountData = (username: string) => {
    const stats = accountStats.find(a => a.username === username);
    const posts = analytics.filter(p => p.owner_username === username);
    
    // Calculate content types
    const contentTypes = {
      image: posts.filter(p => (p.post_type || "Image") === "Image").length,
      video: posts.filter(p => p.post_type === "Video").length,
      sidecar: posts.filter(p => p.post_type === "Sidecar").length,
    };

    // Get top hashtags
    const hashtagMap = new Map<string, number>();
    posts.forEach(post => {
      (post.hashtags || []).forEach(tag => {
        hashtagMap.set(tag, (hashtagMap.get(tag) || 0) + 1);
      });
    });
    const topHashtags = Array.from(hashtagMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    // Get period
    const dates = posts.map(p => p.posted_at).filter(Boolean).sort();
    const period = dates.length > 1 
      ? `${new Date(dates[0]!).toLocaleDateString('pt-PT')} - ${new Date(dates[dates.length - 1]!).toLocaleDateString('pt-PT')}`
      : 'período não especificado';

    return {
      postCount: stats?.postCount || 0,
      totalLikes: stats?.totalLikes || 0,
      totalComments: stats?.totalComments || 0,
      avgLikes: stats?.avgLikes || 0,
      avgComments: stats?.avgComments || 0,
      avgEngagement: stats?.avgEngagement || 0,
      contentTypes,
      topHashtags,
      period,
    };
  };

  const handleGenerateReport = async () => {
    if (!selectedCompetitor || !myAccount) {
      toast.error("Seleccione um concorrente para analisar");
      return;
    }

    setIsGenerating(true);
    setReport("");

    try {
      const competitorData = getAccountData(selectedCompetitor);
      const myAccountData = getAccountData(myAccount);

      const { data, error } = await supabase.functions.invoke('generate-competitor-report', {
        body: {
          competitorUsername: selectedCompetitor,
          myAccountUsername: myAccount,
          competitorData,
          myAccountData,
        },
      });

      if (error) throw error;

      if (data.report) {
        setReport(data.report);
        setGeneratedAt(data.generatedAt);
        toast.success("Relatório gerado com sucesso!");
      } else if (data.error) {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error("Erro ao gerar relatório. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      toast.success("Relatório copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Erro ao copiar");
    }
  };

  const handleDownload = () => {
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-${selectedCompetitor}-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Relatório transferido!");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Relatório de Concorrente
          <Badge variant="outline" className="ml-2 gap-1 text-xs border-blue-400 text-blue-600">
            <Bot className="h-3 w-3" />
            IA
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selector and Generate Button */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Select value={selectedCompetitor} onValueChange={setSelectedCompetitor}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar concorrente..." />
              </SelectTrigger>
              <SelectContent>
                {competitors.map(username => {
                  const stats = accountStats.find(a => a.username === username);
                  return (
                    <SelectItem key={username} value={username}>
                      <div className="flex items-center gap-2">
                        <span>@{username}</span>
                        {stats && (
                          <span className="text-xs text-muted-foreground">
                            ({stats.postCount} posts, {stats.avgEngagement.toLocaleString()} eng.)
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <Button 
            onClick={handleGenerateReport} 
            disabled={!selectedCompetitor || isGenerating}
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                A gerar...
              </>
            ) : (
              <>
                <Bot className="h-4 w-4" />
                Gerar Relatório
              </>
            )}
          </Button>
        </div>

        {/* My Account Badge */}
        {myAccount && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
            A comparar com a sua conta: <span className="font-medium text-foreground">@{myAccount}</span>
          </div>
        )}

        {/* Report Display */}
        {report && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Bot className="h-4 w-4 text-blue-500" />
                <span>Gerado por IA em {new Date(generatedAt).toLocaleString('pt-PT')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copiado" : "Copiar"}
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1.5">
                  <Download className="h-3.5 w-3.5" />
                  Transferir
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[500px] rounded-lg border bg-muted/30 p-4">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                  {report}
                </pre>
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Empty State */}
        {!report && !isGenerating && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>Seleccione um concorrente e clique em "Gerar Relatório"</p>
            <p className="text-xs mt-1">O relatório será gerado com base nos dados importados</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}