import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Play, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useProjeto } from "@/contexts/ProjetoContext";
import {
  ESTADOS_JOB, ORIGENS_JOB, listarConteudos, prepararCarrossel, processarFila, retomarJob,
  type Listagem,
} from "@/services/conteudos";
import { BibliotecasConteudoTabs } from "@/components/conteudos/BibliotecasConteudoTabs";

const dataPt = (s: string | null) => (s ? new Date(s).toLocaleDateString("pt-PT", { timeZone: "Europe/Lisbon" }) : "—");

export default function ConteudosSociais() {
  const nav = useNavigate();
  const ctx = useProjeto();
  const [estado, setEstado] = useState<{ fase: "a_carregar" | "pronto" | "erro"; dados?: Listagem; erro?: string }>({ fase: "a_carregar" });
  const [ocupado, setOcupado] = useState<string | null>(null);

  // Loading only reads: AI processing never runs implicitly.
  // Sequence guard: a response for an earlier project choice never overwrites the current one.
  const seq = useRef(0);
  const carregar = useCallback(async () => {
    const meu = ++seq.current;
    const projeto = ctx.projetoId;
    setEstado((e) => ({ ...e, fase: e.dados ? "pronto" : "a_carregar", erro: undefined }));
    try { const dados = await listarConteudos(projeto); if (meu === seq.current) setEstado({ fase: "pronto", dados }); }
    catch (e) { if (meu === seq.current) setEstado({ fase: "erro", erro: (e as Error).message }); }
  }, [ctx.projetoId]);
  useEffect(() => { if (ctx.estado === "pronto") carregar(); }, [ctx.estado, carregar]);

  const acao = async (nome: string, f: () => Promise<unknown>, ok?: string) => {
    setOcupado(nome);
    try { await f(); if (ok) toast.success(ok); await carregar(); }
    catch (e) { toast.error((e as Error).message); }
    finally { setOcupado(null); }
  };

  const dados = estado.dados;
  const jobDe = (id: string) => dados?.jobs.find((j) => j.conteudo_id === id);
  const conteudoDe = (edicaoId: string) => dados?.conteudos.find((c) => c.edicao_id === edicaoId);

  return (
    <div className="mc-estudio -m-0 min-h-[calc(100dvh-4rem)] sm:-m-4 md:-m-6">
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6 sm:py-10">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Carrosséis da crónica</h1>
          <p className="text-sm text-muted-foreground">
            1080 × 1350 · Instagram e LinkedIn · nada é publicado sem revisão
            {ctx.projeto ? ` · projeto ${ctx.projeto.name}` : " · todos os projetos"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild><Link to="/manual-create">Publicação livre</Link></Button>
          <Button variant="outline" size="sm" disabled={!!ocupado} onClick={() => acao("ler", carregar)}>
            <RefreshCw className="mr-1 h-4 w-4" />Atualizar lista
          </Button>
          <Button size="sm" disabled={!!ocupado || !dados} onClick={() => acao("fila", processarFila, "Fila processada")}>
            {ocupado === "fila" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Play className="mr-1 h-4 w-4" />}Processar fila agora
          </Button>
        </div>
      </header>
      <BibliotecasConteudoTabs ativa="cronica" />
      <p className="text-xs text-muted-foreground">O processo automático corre de hora a hora. «Processar fila agora» pede propostas à IA para os trabalhos pendentes.</p>

      {dados && (!dados.credenciais.deepseek || !dados.credenciais.egoi) && (
        <Alert>
          <AlertTitle>Faltam chaves no servidor</AlertTitle>
          <AlertDescription>
            {!dados.credenciais.egoi && <span>Sem chave da E-goi, a entrega das campanhas não é confirmada. </span>}
            {!dados.credenciais.deepseek && <span>Sem chave da DeepSeek, as propostas ficam a aguardar. </span>}
            <Link to="/estudio/ligacoes" className="underline">Ver ligações</Link>
          </AlertDescription>
        </Alert>
      )}

      {ctx.estado === "erro" && <Alert variant="destructive"><AlertTitle>Não foi possível carregar os projetos</AlertTitle><AlertDescription className="flex flex-wrap items-center gap-2"><span>{ctx.erro}</span><Button size="sm" variant="outline" onClick={ctx.recarregar}>Tentar de novo</Button></AlertDescription></Alert>}
      {ctx.estado !== "erro" && estado.fase === "a_carregar" && <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>}
      {estado.fase === "erro" && (
        <Alert variant="destructive">
          <AlertTitle>Não foi possível carregar os carrosséis</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-2">
            <span>{estado.erro}</span>
            <Button size="sm" variant="outline" onClick={carregar}>Tentar de novo</Button>
          </AlertDescription>
        </Alert>
      )}
      {dados && dados.sem_identidade && (
        <p className="rounded-md border p-4 text-sm text-muted-foreground">
          O projeto escolhido não tem nenhuma newsletter associada. <Link to="/" className="underline">Mudar de projeto</Link>
        </p>
      )}
      {dados && !dados.sem_identidade && !dados.edicoes.length && (
        <p className="rounded-md border p-4 text-sm text-muted-foreground">
          Ainda não há edições enviadas. Depois de um envio confirmado pela E-goi, o carrossel é preparado aqui; as edições importadas só têm carrossel com «Preparar».
        </p>
      )}

      {dados && dados.edicoes.length > 0 && (
        <ul className="divide-y rounded-md border">
          {dados.edicoes.map((ed) => {
            const c = conteudoDe(ed.id);
            const j = c ? jobDe(c.id) : undefined;
            const historico = c?.origem === "historico_actual" || j?.origem === "manual";
            return (
              <li key={ed.id} className="flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">#{ed.numero} · {ed.assunto || "Sem assunto"}</div>
                  <div className="text-xs text-muted-foreground">
                    Enviada em {dataPt(ed.enviada_em)}{c ? ` · versão ${c.versao}` : ""}{c?.social_draft_id ? " · rascunho social criado" : ""}
                  </div>
                  {j?.erro && <div className="text-xs text-destructive">{j.erro}</div>}
                </div>
                {j && <Badge variant="outline">{ORIGENS_JOB[j.origem] ?? j.origem}</Badge>}
                {!j && !c && <Badge variant="outline">Sem carrossel</Badge>}
                {j && <Badge variant={j.estado === "erro" ? "destructive" : "secondary"}>{ESTADOS_JOB[j.estado] ?? j.estado}</Badge>}
                {historico && c && !c.fonte_aceite_em && c.origem === "historico_actual" && <Badge variant="outline">Fonte por rever</Badge>}
                {j && ["erro", "aguarda_credencial", "aguarda_confirmacao"].includes(j.estado) && (
                  <Button size="sm" variant="outline" disabled={!!ocupado} onClick={() => acao(j.id, () => retomarJob(j.id), "Trabalho retomado")}>Retomar</Button>
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
    </div>
    </div>
  );
}
