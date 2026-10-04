import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ESTADOS_JOB, listarConteudos, prepararCarrossel, processarFila, retomarJob,
  type ConteudoResumo, type EdicaoEnviada, type JobResumo,
} from "@/services/conteudos";

const dataPt = (s: string | null) => (s ? new Date(s).toLocaleDateString("pt-PT", { timeZone: "Europe/Lisbon" }) : "—");

export default function ConteudosSociais() {
  const nav = useNavigate();
  const [dados, setDados] = useState<{ conteudos: ConteudoResumo[]; jobs: JobResumo[]; edicoes: EdicaoEnviada[] } | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  const carregar = useCallback(() => listarConteudos().then(setDados).catch((e: Error) => toast.error(e.message)), []);
  useEffect(() => {
    // Opening the page advances due jobs (bounded) and recovers sent editions without a job.
    processarFila().catch(() => undefined).finally(carregar);
  }, [carregar]);

  const acao = async (nome: string, f: () => Promise<unknown>) => {
    setOcupado(nome);
    try { await f(); await carregar(); } catch (e) { toast.error((e as Error).message); } finally { setOcupado(null); }
  };

  const jobDe = (id: string) => dados?.jobs.find((j) => j.conteudo_id === id);
  const conteudoDe = (edicaoId: string) => dados?.conteudos.find((c) => c.edicao_id === edicaoId);

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Redes sociais a partir da newsletter</h1>
          <p className="text-sm text-muted-foreground">Carrossel da crónica · 1080 × 1350 · Instagram e LinkedIn · nada é publicado sem revisão</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild><Link to="/manual-create">Publicação livre</Link></Button>
          <Button variant="outline" size="sm" disabled={!!ocupado} onClick={() => acao("fila", processarFila)}>
            {ocupado === "fila" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />}Atualizar fila
          </Button>
        </div>
      </header>

      {!dados && <p className="text-sm text-muted-foreground">A carregar…</p>}
      {dados && !dados.edicoes.length && (
        <p className="rounded-md border p-4 text-sm text-muted-foreground">
          Ainda não há edições enviadas neste estúdio. Depois de importar os dados ou de um envio confirmado, o carrossel da crónica é preparado aqui automaticamente.
        </p>
      )}

      {dados && dados.edicoes.length > 0 && (
        <ul className="divide-y rounded-md border">
          {dados.edicoes.map((ed) => {
            const c = conteudoDe(ed.id);
            const j = c ? jobDe(c.id) : undefined;
            return (
              <li key={ed.id} className="flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">#{ed.numero} · {ed.assunto || "Sem assunto"}</div>
                  <div className="text-xs text-muted-foreground">Enviada em {dataPt(ed.enviada_em)}{c ? ` · versão ${c.versao}` : ""}{c?.social_draft_id ? " · rascunho social criado" : ""}</div>
                  {j?.erro && <div className="text-xs text-destructive">{j.erro}</div>}
                </div>
                {j && <Badge variant={j.estado === "erro" ? "destructive" : "secondary"}>{ESTADOS_JOB[j.estado] ?? j.estado}</Badge>}
                {c?.origem === "historico_actual" && !c.fonte_aceite_em && <Badge variant="outline">Fonte por rever</Badge>}
                {j && ["erro", "aguarda_credencial", "aguarda_confirmacao"].includes(j.estado) && (
                  <Button size="sm" variant="outline" disabled={!!ocupado} onClick={() => acao(j.id, () => retomarJob(j.id))}>Retomar</Button>
                )}
                {c ? (
                  <Button size="sm" onClick={() => nav(`/estudio/redes-sociais/${c.id}`)}>Abrir</Button>
                ) : (
                  <Button size="sm" variant="outline" disabled={!!ocupado}
                    onClick={() => acao(ed.id, async () => { const r = await prepararCarrossel(ed.id); nav(`/estudio/redes-sociais/${r.conteudo_id}`); })}>
                    Preparar carrossel
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">Em breve: carrossel global da edição e peças a partir de artigos.</p>
    </div>
  );
}
