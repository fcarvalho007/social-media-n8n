import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Sparkles, FileText, RefreshCw, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { generateReportPDF } from "@/lib/reportPdf";
import type { InstagramProfile } from "@/hooks/useInstagramProfiles";

interface ProfileReportGeneratorProps {
  profiles: InstagramProfile[];
  mainAccount?: string;
}

export function ProfileReportGenerator({ profiles, mainAccount = "frederico.m.carvalho" }: ProfileReportGeneratorProps) {
  const { user } = useAuth();
  const [report, setReport] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);

  const generateReport = async () => {
    if (profiles.length === 0) {
      toast.error("Nenhum perfil disponível para análise");
      return;
    }

    setIsGenerating(true);

    try {
      const mainProfile = profiles.find(p => p.username === mainAccount);
      const competitors = profiles.filter(p => p.username !== mainAccount);

      // Prepare profile data for analysis
      const profileData = profiles.map(p => ({
        username: p.username,
        fullName: p.full_name,
        bio: p.biography,
        followers: p.followers_count,
        following: p.follows_count,
        posts: p.posts_count,
        isVerified: p.is_verified,
        isBusiness: p.is_business_account,
        category: p.business_category,
        externalUrl: p.external_url,
        ratio: p.follows_count > 0 ? (p.followers_count / p.follows_count).toFixed(2) : "N/A",
        isMain: p.username === mainAccount
      }));

      const prompt = `
Analisa os seguintes perfis de Instagram e gera um relatório estratégico em Português de Portugal.

## Perfis a Analisar

### Conta Principal (${mainAccount})
${mainProfile ? JSON.stringify({
  username: mainProfile.username,
  bio: mainProfile.biography,
  followers: mainProfile.followers_count,
  following: mainProfile.follows_count,
  ratio: mainProfile.follows_count > 0 ? (mainProfile.followers_count / mainProfile.follows_count).toFixed(2) : "N/A",
  verified: mainProfile.is_verified,
  business: mainProfile.is_business_account,
  category: mainProfile.business_category,
  url: mainProfile.external_url
}, null, 2) : "Não disponível"}

### Concorrentes (${competitors.length})
${JSON.stringify(competitors.map(c => ({
  username: c.username,
  bio: c.biography?.slice(0, 200),
  followers: c.followers_count,
  following: c.follows_count,
  ratio: c.follows_count > 0 ? (c.followers_count / c.follows_count).toFixed(2) : "N/A",
  verified: c.is_verified,
  business: c.is_business_account,
  category: c.business_category
})), null, 2)}

---

## Instruções

Gera um relatório em Markdown com as seguintes secções:

### 1. 📊 Resumo Executivo
- Posição de @${mainAccount} no mercado
- Principais insights em 3 bullets

### 2. 👥 Análise de Audiência
- Comparação de seguidores entre todas as contas
- Análise do rácio seguidor/seguindo (quem tem melhor qualidade de audiência)
- Identificar quem tem audiência mais engajada (baseado no rácio)

### 3. 📝 Análise de Bios
- Avaliar a bio de @${mainAccount}
- Comparar com as bios dos concorrentes
- Identificar:
  - CTAs utilizados
  - Palavras-chave de autoridade
  - Uso de emojis
  - Propostas de valor

### 4. 🎯 Posicionamento
- Como cada conta se posiciona
- Gaps de mercado identificados
- Oportunidades para @${mainAccount}

### 5. ✅ Recomendações
- 3-5 ações concretas para @${mainAccount} melhorar
- Priorizar por impacto

Mantém o relatório conciso mas actionable. Usa emojis para melhorar a legibilidade.
`;

      const response = await supabase.functions.invoke("generate-competitor-report", {
        body: { 
          prompt,
          model: "gpt-4o"
        }
      });

      if (response.error) throw response.error;

      const reportContent = response.data?.report || response.data?.content || "Erro ao gerar relatório";
      setReport(reportContent);
      setGeneratedAt(new Date());
      toast.success("Relatório de perfis gerado com sucesso!");

    } catch (error: any) {
      console.error("Error generating profile report:", error);
      toast.error(`Erro ao gerar relatório: ${error.message || "Erro desconhecido"}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Análise IA de Perfis</CardTitle>
              <p className="text-sm text-muted-foreground">
                Análise estratégica das bios e posicionamento
              </p>
            </div>
          </div>
          {generatedAt && (
            <span className="text-xs text-muted-foreground">
              Gerado: {generatedAt.toLocaleString("pt-PT")}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {!report ? (
          <div className="text-center py-8 space-y-4">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
              <FileText className="h-8 w-8 text-violet-500" />
            </div>
            <div>
              <h3 className="font-semibold">Gerar Relatório de Perfis</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
                Analisa as bios, posicionamento e métricas de {profiles.length} perfis 
                para identificar oportunidades de melhoria.
              </p>
            </div>
            <Button
              onClick={generateReport}
              disabled={isGenerating || profiles.length === 0}
              className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  A gerar análise...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Gerar Análise IA
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  try {
                    const pdfBlob = generateReportPDF({
                      title: "Análise IA de Perfis",
                      subtitle: `${profiles.length} perfis analisados`,
                      content: report,
                      generatedAt: generatedAt || new Date(),
                    });
                    
                    const url = URL.createObjectURL(pdfBlob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `relatorio-perfis-${new Date().toISOString().split('T')[0]}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    toast.success("PDF transferido!");
                  } catch (error) {
                    console.error("Error generating PDF:", error);
                    toast.error("Erro ao gerar PDF");
                  }
                }}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Transferir PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={generateReport}
                disabled={isGenerating}
                className="gap-2"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Regenerar
              </Button>
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <MarkdownRenderer content={report} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
