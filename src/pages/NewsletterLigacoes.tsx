import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, CircleDashed, RefreshCw, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SincronizacaoTokens } from "@/components/newsletter/SincronizacaoTokens";

interface Estado {
  endereco_publico: string | null;
  tag_token_egoi: string | null;
  automatismos_activos: boolean;
  segredos: Record<string, boolean>;
  validacoes?: Record<string, { validado: boolean; detalhe: string }>;
  endpoints: { email_entrada: string; egoi_cancelamentos: string; um_clique: string; sitemap: string; automatismos: string[] };
}

type Nivel = "falta" | "configurado" | "validado";
interface Servico { nome: string; uso: string; chaves: string[]; validacao?: string }

const SERVICOS: Servico[] = [
  { nome: "E-goi", uso: "Envio da newsletter e confirmação de entrega", chaves: ["EGOI_API_KEY", "NL_EGOI_CAMPO_TOKEN_ID"], validacao: "egoi_tokens" },
  { nome: "Avisos de cancelamento da E-goi", uso: "Receber cancelamentos de subscrição", chaves: ["NL_EGOI_WEBHOOK_CHAVE"] },
  { nome: "DeepSeek", uso: "Propostas de carrossel e textos com IA", chaves: ["DEEPSEEK_API_KEY"] },
  { nome: "WordPress", uso: "Rascunhos do artigo da crónica", chaves: ["WORDPRESS_SITE_URL", "WORDPRESS_APP_USER", "WORDPRESS_APP_PASSWORD"] },
  { nome: "Pexels", uso: "Sugestão de imagens", chaves: ["PEXELS_API_KEY"] },
  { nome: "CloudMailin", uso: "Entrada de emails para curadoria", chaves: ["CLOUDMAILIN_AUTH_USER", "CLOUDMAILIN_AUTH_PASS"] },
  { nome: "Ligações de subscrição", uso: "Assinatura dos links de cancelar/gerir subscrição", chaves: ["SUBSCRICAO_SEGREDO"] },
  { nome: "Automatismos", uso: "Chave dos processos agendados", chaves: ["NL_CRON_SEGREDO"] },
];

const ROTULO: Record<Nivel, string> = { falta: "Em falta", configurado: "Configurado · por validar", validado: "Validado" };

function Icone({ n }: { n: Nivel }) {
  if (n === "validado") return <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-hidden />;
  if (n === "configurado") return <CircleDashed className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />;
  return <XCircle className="h-4 w-4 shrink-0 text-destructive" aria-hidden />;
}

/** Admin checklist of external services: presence and recorded validation only, never values. */
export default function NewsletterLigacoes() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [erro, setErro] = useState<{ tipo: "permissao" | "rede"; msg: string } | null>(null);
  const [aCarregar, setACarregar] = useState(true);

  const carregar = useCallback(async () => {
    setACarregar(true); setErro(null);
    const { data, error } = await supabase.functions.invoke("nl-hooks/estado", { method: "GET" });
    if (error) {
      const status = (error as { context?: Response }).context?.status;
      setErro(status === 401 || status === 403
        ? { tipo: "permissao", msg: "Só os administradores podem ver esta página." }
        : { tipo: "rede", msg: "Não foi possível contactar o servidor." });
    } else setEstado(data as Estado);
    setACarregar(false);
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  if (aCarregar && !estado) return <div className="mx-auto max-w-3xl space-y-2 p-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
  if (erro && !estado) return (
    <div className="mx-auto max-w-xl p-4">
      <Alert variant={erro.tipo === "rede" ? "destructive" : "default"}>
        <AlertTitle>{erro.tipo === "rede" ? "Erro de ligação" : "Sem permissão"}</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>{erro.msg}</p>
          {erro.tipo === "rede" && <Button size="sm" variant="outline" onClick={carregar}><RefreshCw className="mr-1 h-4 w-4" />Tentar de novo</Button>}
        </AlertDescription>
      </Alert>
    </div>
  );
  if (!estado) return null;

  const nivel = (s: Servico): Nivel => {
    if (!s.chaves.every((k) => estado.segredos[k])) return "falta";
    return s.validacao && estado.validacoes?.[s.validacao]?.validado ? "validado" : "configurado";
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Ligações</h1>
          <p className="text-sm text-muted-foreground">Mostra apenas se cada chave existe no servidor, nunca o valor. «Validado» só aparece com prova registada (por exemplo, tokens confirmados por leitura na E-goi).</p>
        </div>
        <Button size="sm" variant="outline" onClick={carregar} disabled={aCarregar}><RefreshCw className="mr-1 h-4 w-4" />Atualizar</Button>
      </div>

      <section className="rounded-md border" aria-label="Serviços">
        <ul className="divide-y">
          {SERVICOS.map((s) => {
            const n = nivel(s);
            const faltam = s.chaves.filter((k) => !estado.segredos[k]);
            const det = s.validacao ? estado.validacoes?.[s.validacao]?.detalhe : undefined;
            return (
              <li key={s.nome} className="flex items-start gap-3 p-3 text-sm">
                <Icone n={n} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><span className="font-medium">{s.nome}</span><span className="text-xs text-muted-foreground">{ROTULO[n]}</span></div>
                  <div className="text-xs text-muted-foreground">{s.uso}</div>
                  {faltam.length > 0 && <div className="text-xs text-destructive">Em falta: {faltam.join(", ")}</div>}
                  {det && n !== "falta" && <div className="text-xs text-muted-foreground">{det}</div>}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="space-y-1 rounded-md border p-3 text-sm">
        <h2 className="font-medium">Endereços públicos</h2>
        <p>Endereço público: {estado.endereco_publico ?? <span className="text-destructive">por configurar</span>}</p>
        <p>Campo do token nos emails: {estado.tag_token_egoi ?? <span className="text-destructive">por configurar</span>}</p>
        <p>{estado.automatismos_activos ? "Automatismos ativos" : "Automatismos inativos (até validar a migração e as chaves)"}</p>
      </section>

      <section className="space-y-2 rounded-md border p-3 text-sm">
        <h2 className="font-medium">Endereços a configurar noutros serviços</h2>
        <p><span className="text-muted-foreground">CloudMailin (com utilizador e password definidos à parte no painel do CloudMailin):</span><br /><code className="break-all">{estado.endpoints.email_entrada}</code></p>
        <p><span className="text-muted-foreground">Aviso de cancelamentos na E-goi (substitui o marcador pela chave guardada no servidor):</span><br /><code className="break-all">{estado.endpoints.egoi_cancelamentos}</code></p>
        <p><span className="text-muted-foreground">Mapa do site:</span><br /><code className="break-all">{estado.endpoints.sitemap}</code></p>
      </section>

      <SincronizacaoTokens />
    </div>
  );
}
