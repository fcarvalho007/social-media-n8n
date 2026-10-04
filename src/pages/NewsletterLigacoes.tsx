import { useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Estado {
  endereco_publico: string | null;
  tag_token_egoi: string | null;
  automatismos_activos: boolean;
  segredos: Record<string, boolean>;
  endpoints: { email_entrada: string; egoi_cancelamentos: string; um_clique: string; sitemap: string; automatismos: string[] };
}

const NOMES: Record<string, string> = {
  SUBSCRICAO_SEGREDO: "Assinatura das ligações de subscrição",
  NL_CRON_SEGREDO: "Chave dos automatismos",
  NL_EGOI_WEBHOOK_CHAVE: "Chave do aviso de cancelamentos da E-goi",
  CLOUDMAILIN_AUTH_USER: "Utilizador da entrada de emails (CloudMailin)",
  CLOUDMAILIN_AUTH_PASS: "Password da entrada de emails (CloudMailin)",
  EGOI_API_KEY: "Chave da E-goi",
  NL_EGOI_CAMPO_TOKEN_ID: "Campo da E-goi com o token",
  DEEPSEEK_API_KEY: "Chave da DeepSeek",
};

/** Admin view of the newsletter's public links and inbound connections: presence only, never values. */
export default function NewsletterLigacoes() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aSincronizar, setASincronizar] = useState(false);

  useEffect(() => {
    supabase.functions.invoke("nl-hooks/estado", { method: "GET" })
      .then(({ data, error }) => (error ? setErro("Só os administradores podem ver esta página.") : setEstado(data as Estado)));
  }, []);

  async function sincronizar() {
    setASincronizar(true);
    const { data, error } = await supabase.functions.invoke("nl-hooks/sincronizar-tokens", { body: { confirmar: "sincronizar-tokens" } });
    setASincronizar(false);
    if (error) { toast.error("Não foi possível sincronizar. Confirma a chave e o campo da E-goi."); return; }
    const r = data as { actualizados: number; falhas: number };
    toast.success(`Tokens atualizados em ${r.actualizados} contacto(s); ${r.falhas} falha(s).`);
  }

  if (erro) return <p className="p-4 text-sm text-muted-foreground">{erro}</p>;
  if (!estado) return <p className="p-4 text-sm text-muted-foreground">A carregar…</p>;

  const Linha = ({ ok, texto }: { ok: boolean; texto: string }) => (
    <li className="flex items-center gap-2 text-sm">
      {ok ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <XCircle className="h-4 w-4 text-destructive" />}
      <span>{texto}</span>
    </li>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <h1 className="text-xl font-semibold">Ligações da newsletter</h1>
      <p className="text-sm text-muted-foreground">Mostra apenas se cada chave está configurada, nunca o valor. As chaves configuram-se no servidor.</p>

      <section className="space-y-2 rounded-md border p-3">
        <h2 className="font-medium">Endereços públicos</h2>
        <ul className="space-y-1">
          <Linha ok={!!estado.endereco_publico} texto={`Endereço público: ${estado.endereco_publico ?? "por configurar"}`} />
          <Linha ok={!!estado.tag_token_egoi} texto={`Campo do token nos emails: ${estado.tag_token_egoi ?? "por configurar"}`} />
          <Linha ok={!estado.automatismos_activos} texto={estado.automatismos_activos ? "Automatismos ativos" : "Automatismos inativos (até validar a migração e as chaves)"} />
        </ul>
      </section>

      <section className="space-y-2 rounded-md border p-3">
        <h2 className="font-medium">Chaves</h2>
        <ul className="space-y-1">
          {Object.entries(estado.segredos).map(([k, v]) => <Linha key={k} ok={v} texto={NOMES[k] ?? k} />)}
        </ul>
      </section>

      <section className="space-y-2 rounded-md border p-3 text-sm">
        <h2 className="font-medium">Endereços a configurar noutros serviços</h2>
        <p><span className="text-muted-foreground">CloudMailin (com utilizador e password definidos à parte no painel do CloudMailin):</span><br /><code className="break-all">{estado.endpoints.email_entrada}</code></p>
        <p><span className="text-muted-foreground">Aviso de cancelamentos na E-goi (substitui o marcador pela chave que guardaste no servidor):</span><br /><code className="break-all">{estado.endpoints.egoi_cancelamentos}</code></p>
        <p><span className="text-muted-foreground">Mapa do site:</span><br /><code className="break-all">{estado.endpoints.sitemap}</code></p>
      </section>

      <section className="space-y-2 rounded-md border p-3 text-sm">
        <h2 className="font-medium">Tokens de subscrição na E-goi</h2>
        <p className="text-muted-foreground">Escreve em cada contacto das listas reais o token assinado usado nas ligações «Gerir a subscrição» e «Cancelar». Necessário antes de um envio real e depois de novas subscrições.</p>
        <AlertDialog>
          <AlertDialogTrigger asChild><Button size="sm" disabled={aSincronizar}>{aSincronizar ? "A sincronizar…" : "Sincronizar tokens"}</Button></AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Atualizar contactos na E-goi?</AlertDialogTitle>
              <AlertDialogDescription>Vai escrever o token de subscrição em todos os contactos das listas reais da E-goi. Não envia emails.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={sincronizar}>Atualizar contactos</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </div>
  );
}
