import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bot, FileText, Copy, Check, Download, Loader2, Star, 
  Sparkles, Target, TrendingUp, Users, Megaphone, Clock 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MarkdownRenderer } from "./MarkdownRenderer";
import type { InstagramAnalyticsItem } from "@/hooks/useInstagramAnalytics";
import type { AccountStats } from "./AccountRanking";

interface CompetitorReportGeneratorProps {
  analytics: InstagramAnalyticsItem[];
  accounts: string[];
  accountStats: AccountStats[];
  myAccount?: string;
}

type Objective = 'leads' | 'courses' | 'authority' | 'reach';

const objectives: { value: Objective; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'leads', label: 'Leads', icon: <Target className="h-4 w-4" />, description: 'Gerar leads e consultoria' },
  { value: 'courses', label: 'Cursos', icon: <Megaphone className="h-4 w-4" />, description: 'Vender cursos e produtos' },
  { value: 'authority', label: 'Autoridade', icon: <TrendingUp className="h-4 w-4" />, description: 'Crescer autoridade no nicho' },
  { value: 'reach', label: 'Alcance', icon: <Users className="h-4 w-4" />, description: 'Aumentar alcance e seguidores' },
];

export function CompetitorReportGenerator({
  analytics,
  accounts,
  accountStats,
  myAccount,
}: CompetitorReportGeneratorProps) {
  const [selectedCompetitor, setSelectedCompetitor] = useState<string>("");
  const [selectedObjective, setSelectedObjective] = useState<Objective>("authority");
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

      // Get detailed posts for both accounts (last 50 each)
      const competitorPosts = analytics
        .filter(p => p.owner_username === selectedCompetitor)
        .slice(0, 50)
        .map(p => ({
          type: p.post_type,
          likes: p.likes_count,
          comments: p.comments_count,
          caption: p.caption?.slice(0, 200),
          hashtags: p.hashtags,
          posted_at: p.posted_at,
          url: p.post_url,
        }));

      const myPosts = analytics
        .filter(p => p.owner_username === myAccount)
        .slice(0, 50)
        .map(p => ({
          type: p.post_type,
          likes: p.likes_count,
          comments: p.comments_count,
          caption: p.caption?.slice(0, 200),
          hashtags: p.hashtags,
          posted_at: p.posted_at,
          url: p.post_url,
        }));

      const { data, error } = await supabase.functions.invoke('generate-competitor-report', {
        body: {
          competitorUsername: selectedCompetitor,
          myAccountUsername: myAccount,
          competitorData,
          myAccountData,
          allPosts: [...competitorPosts, ...myPosts],
          objective: selectedObjective,
        },
      });

      if (error) throw error;

      if (data.report) {
        setReport(data.report);
        setGeneratedAt(data.generatedAt);
        toast.success("Relatório executivo gerado com sucesso!");
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
    a.download = `relatorio-executivo-${selectedCompetitor}-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Relatório transferido!");
  };

  return (
    <Card className="overflow-hidden border-2 border-primary/20">
      {/* Premium Header */}
      <div className="bg-gradient-to-r from-amber-500/10 via-primary/10 to-blue-500/10 border-b border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500 to-primary">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            Relatório Executivo de Concorrência
            <Badge className="ml-2 gap-1 text-xs bg-gradient-to-r from-amber-500 to-primary text-white border-0">
              <Bot className="h-3 w-3" />
              Premium IA
            </Badge>
          </CardTitle>
        </CardHeader>
      </div>

      <CardContent className="p-4 space-y-4">
        {/* Objective Selector */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Objectivo para 90 dias</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {objectives.map((obj) => (
              <button
                key={obj.value}
                onClick={() => setSelectedObjective(obj.value)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all ${
                  selectedObjective === obj.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card hover:border-primary/50 text-muted-foreground hover:text-foreground'
                }`}
              >
                {obj.icon}
                <span className="text-xs font-medium">{obj.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Selector and Generate Button */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Select value={selectedCompetitor} onValueChange={setSelectedCompetitor}>
              <SelectTrigger className="bg-card">
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
            className="gap-2 bg-gradient-to-r from-amber-500 to-primary hover:from-amber-600 hover:to-primary/90"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                A gerar relatório...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Gerar Relatório Executivo
              </>
            )}
          </Button>
        </div>

        {/* My Account Badge */}
        {myAccount && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-amber-500/10 rounded-lg px-3 py-2">
            <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
            A comparar com a sua conta: <span className="font-semibold text-foreground">@{myAccount}</span>
          </div>
        )}

        {/* Report Display */}
        <AnimatePresence mode="wait">
          {report && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-3"
            >
              {/* Report Header */}
              <div className="flex items-center justify-between bg-gradient-to-r from-primary/5 to-transparent p-3 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-gradient-to-br from-amber-500/20 to-primary/20">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Relatório Executivo</span>
                      <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-600">
                        GPT-4o
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(generatedAt).toLocaleString('pt-PT')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5 h-8">
                    {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copiado" : "Copiar"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1.5 h-8">
                    <Download className="h-3.5 w-3.5" />
                    Transferir
                  </Button>
                </div>
              </div>

              {/* Report Content */}
              <ScrollArea className="h-[600px] rounded-xl border-2 border-primary/10 bg-gradient-to-b from-card to-muted/20 shadow-inner">
                <div className="p-5">
                  <MarkdownRenderer content={report} />
                </div>
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading State */}
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-500 to-primary blur-xl opacity-30 animate-pulse" />
              <div className="relative p-4 rounded-full bg-gradient-to-br from-amber-500/20 to-primary/20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            </div>
            <p className="mt-4 font-medium">A gerar relatório executivo...</p>
            <p className="text-sm text-muted-foreground mt-1">
              A analisar @{selectedCompetitor} vs @{myAccount}
            </p>
            <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3 text-amber-500" />
              <span>10 Quick Wins + Plano 30 dias + Análise completa</span>
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {!report && !isGenerating && (
          <div className="text-center py-12">
            <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-primary/10 mb-4">
              <FileText className="h-10 w-10 text-primary/60" />
            </div>
            <p className="font-medium text-foreground">Gere um Relatório Executivo</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              Seleccione um objectivo e um concorrente para receber uma análise completa 
              com 10 Quick Wins, 5 experiências A/B e um plano de 30 dias.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
