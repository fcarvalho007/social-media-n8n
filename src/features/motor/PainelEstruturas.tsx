import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { criarTrabalho, listarCandidatos, type CandidatoPool, type TrabalhoCompleto } from "@/services/motor";
import { FRAMEWORKS, obterFramework, type Framework } from "../../../supabase/functions/_shared/motor/frameworks";
import type { PropostaEditorial } from "../../../supabase/functions/_shared/motor/proposta";
import { compatibilidade, fundirSelecao, guardarSelecao, lerSelecao, type Candidato, type Selecao } from "./estruturas";

interface Props {
  dados: TrabalhoCompleto;
  atual: PropostaEditorial;
  /** Persists the merged narrative as a new version (composition kept). */
  aceitar: (conteudo: PropostaEditorial) => Promise<void>;
}

const PERFIL = { original: "perfil do carrossel original", atual: "perfil atual do projeto (o original não tinha)", nenhum: "sem perfil de autor" } as const;
const dataCurta = (iso: string) => new Date(iso).toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/** Framework proposals pool + per-slide hybrid selection. Choosing generated slides is free (no AI); one CAS version on apply. */
export function PainelEstruturas({ dados, atual, aceitar }: Props) {
  const origem = dados.trabalho.id;
  const versao = dados.proposta.versao;
  const n = atual.slides.length;
  const [escolha, setEscolha] = useState<Framework | null>(null);
  const [destaque, setDestaque] = useState<string | null>(null);
  const [slides, setSlides] = useState(n);
  const [aPedir, setAPedir] = useState(false);
  const [pool, setPool] = useState<CandidatoPool[]>([]);
  const [ativo, setAtivo] = useState<string | null>(null);
  const [selecao, setSelecaoS] = useState<Selecao>(() => lerSelecao(origem, versao, n));
  const [aAplicar, setAAplicar] = useState(false);
  const [erroAplicar, setErroAplicar] = useState<string | null>(null);

  useEffect(() => { setSelecaoS(lerSelecao(origem, versao, n)); setErroAplicar(null); }, [origem, versao, n]);
  const setSelecao = (s: Selecao) => { setSelecaoS(s); guardarSelecao(origem, versao, s); };

  const ler = useCallback(async () => { try { setPool(await listarCandidatos(dados)); } catch { /* next cycle */ } }, [dados]);
  useEffect(() => { ler(); }, [ler]);
  const emCurso = pool.filter((c) => c.estado === "pendente" || c.estado === "a_processar");
  useEffect(() => {
    if (!emCurso.length) return;
    const t = setInterval(ler, 4000);
    return () => clearInterval(t);
  }, [emCurso.length, ler]);

  const avaliados = useMemo(() => pool.filter((c) => c.estado === "concluido" && c.conteudo).map((c) => {
    let motivo: string | null = null;
    if (c.fonte_hash !== dados.fonte.hash) motivo = "Foi feita sobre outra fonte.";
    else if (c.base_versao == null) motivo = "Proposta antiga sem versão de base registada; só pode abrir como carrossel separado.";
    else if (c.base_versao !== versao) motivo = `Foi feita sobre a versão ${c.base_versao}; o texto atual é a versão ${versao}.`;
    else { const k = compatibilidade(atual, c.conteudo!); if ("motivo" in k) motivo = k.motivo; }
    return { ...c, motivo };
  }), [pool, dados.fonte.hash, versao, atual]);
  const usaveis = avaliados.filter((c) => !c.motivo);
  const candidatos: Candidato[] = usaveis.map((c) => ({ trabalho: c.trabalho, framework: c.framework, conteudo: c.conteudo! }));
  const selValida: Selecao = selecao.map((x) => (x && usaveis.some((c) => c.trabalho === x) ? x : null));
  const ativoC = avaliados.find((c) => c.trabalho === ativo) ?? usaveis[0] ?? avaliados[0] ?? null;
  const nomeDe = (id: string | null) => (id ? obterFramework(usaveis.find((c) => c.trabalho === id)?.framework)?.nome ?? "Proposta" : "Atual");
  const res = selValida.some(Boolean) ? fundirSelecao(atual, candidatos, selValida) : null;
  const usados = new Map<string, number>();
  selValida.forEach((x) => x && usados.set(x, (usados.get(x) ?? 0) + 1));

  const pedir = async () => {
    if (!escolha) return;
    setAPedir(true);
    try {
      const r = await criarTrabalho({
        project_id: dados.trabalho.project_id, texto: dados.fonte.texto, titulo: dados.fonte.titulo ?? atual.titulo,
        objetivo: atual.objetivo, tom: atual.tom, slides, modo: "ia", framework: escolha.id, origem_trabalho: origem, base_versao: versao,
      });
      setAtivo(r.trabalho_id); setEscolha(null); await ler();
    } catch (e) { toast.error((e as Error).message); }
    finally { setAPedir(false); }
  };

  const aplicar = async () => {
    if (!res?.ok) return;
    setAAplicar(true); setErroAplicar(null);
    try {
      await aceitar(res.conteudo);
      guardarSelecao(origem, versao, null);
      toast.success(`Seleção de ${res.trocados} slide(s) gravada como nova versão. A composição manteve-se.`);
    } catch (e) { setErroAplicar(`${(e as Error).message} Nada foi alterado.`); }
    finally { setAAplicar(false); }
  };

  return (
    <section aria-labelledby="t-estr" className="space-y-3 rounded-[var(--mc-r-lg)] border border-border bg-card p-4">
      <div>
        <h2 id="t-estr" className="text-sm font-medium">Reestruturar com IA</h2>
        <p className="text-xs text-muted-foreground">Cada estrutura cria uma proposta (paga, com confirmação) que fica guardada. Depois escolhes slide a slide o que entra — escolher é gratuito e nada muda até aplicares.</p>
      </div>
      <div className="space-y-2">
        <ul className="flex flex-wrap gap-2" aria-label="Estruturas">
          {FRAMEWORKS.map((f) => (
            <li key={f.id}>
              <button type="button" aria-describedby="estr-desc" onClick={() => { setSlides(n); setEscolha(f); }}
                onFocus={() => setDestaque(f.id)} onMouseEnter={() => setDestaque(f.id)} onTouchStart={() => setDestaque(f.id)}
                className={cn("mc-trans inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", destaque === f.id ? "border-primary text-foreground" : "border-input hover:border-muted-foreground")}>
                {f.nome}
              </button>
            </li>
          ))}
        </ul>
        <p id="estr-desc" className="min-h-[2.5rem] text-xs text-muted-foreground" aria-live="polite">
          {(() => { const f = FRAMEWORKS.find((x) => x.id === destaque); return f ? <><span className="font-medium text-foreground">{f.nome}:</span> {f.descricao}</> : "Toca ou foca uma estrutura para ver a descrição. Ao escolher, confirmas antes de ser feito qualquer pedido."; })()}
        </p>
      </div>

      {emCurso.map((c) => (
        <p key={c.trabalho} className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 motion-safe:animate-spin" />A preparar «{obterFramework(c.framework)?.nome ?? c.framework}»… Podes continuar a editar.</p>
      ))}

      {avaliados.length > 0 && (
        <div className="space-y-3">
          <div role="tablist" aria-label="Propostas guardadas" className="flex flex-wrap gap-2">
            {avaliados.map((c) => {
              const sel = ativoC?.trabalho === c.trabalho;
              return (
                <button key={c.trabalho} role="tab" type="button" aria-selected={sel} onClick={() => setAtivo(c.trabalho)}
                  className={cn("mc-trans min-h-11 rounded-[var(--mc-r-md)] border px-3 py-1.5 text-left text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", sel ? "border-primary bg-primary/10" : "border-input", c.motivo && "opacity-70")}>
                  <span className="block text-sm font-medium">{obterFramework(c.framework)?.nome ?? c.framework}</span>
                  <span className="text-muted-foreground">{dataCurta(c.criado_em)}{usados.get(c.trabalho) ? ` · ${usados.get(c.trabalho)} na seleção` : ""}{c.motivo ? " · não comparável" : ""}</span>
                </button>
              );
            })}
          </div>

          {ativoC && ativoC.motivo && (
            <div className="space-y-2 rounded-[var(--mc-r-md)] border border-border p-3 text-sm">
              <p>{ativoC.motivo}</p>
              <Button asChild variant="outline" className="h-11"><Link to={`/estudio/carrosseis/${ativoC.trabalho}`}>Abrir como carrossel separado</Link></Button>
            </div>
          )}

          {ativoC && !ativoC.motivo && ativoC.conteudo && (
            <>
              <p className="text-xs text-muted-foreground">Proposta «{obterFramework(ativoC.framework)?.nome}» · {PERFIL[ativoC.perfil]}. Opinião é leitura do autor; factos e números citam §.</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="h-11" onClick={() => setSelecao(atual.slides.map(() => ativoC.trabalho))}>Usar proposta inteira</Button>
                <Button variant="ghost" className="h-11" onClick={() => setSelecao(atual.slides.map(() => null))}>Manter atuais</Button>
              </div>
              <ol className="space-y-2">
                {atual.slides.map((a, i) => {
                  const p = ativoC.conteudo!.slides[i];
                  const escolhido = selValida[i];
                  const usaEsta = escolhido === ativoC.trabalho;
                  return (
                    <li key={a.id} className="space-y-2 rounded-[var(--mc-r-md)] border border-border p-3 text-sm">
                      <p className="text-xs font-medium">Slide {i + 1} de {n} · na seleção: <span className="text-foreground">{nomeDe(escolhido)}</span></p>
                      <div className="grid gap-2 md:grid-cols-2">
                        <div className={cn("min-w-0 rounded-[var(--mc-r-md)] border p-2", !escolhido ? "border-primary" : "border-transparent")}>
                          <p className="text-xs text-muted-foreground">Atual · §{a.fontes.join(", §") || "—"}</p>
                          <p className="font-medium">{a.titulo}</p><p className="text-muted-foreground">{a.texto}</p>
                          <Button size="sm" variant={!escolhido ? "default" : "outline"} aria-pressed={!escolhido} className="mt-2 h-11" onClick={() => setSelecao(selValida.map((x, j) => (j === i ? null : x)))}>Manter atual</Button>
                        </div>
                        <div className={cn("min-w-0 rounded-[var(--mc-r-md)] border p-2", usaEsta ? "border-primary" : "border-transparent")}>
                          <p className="text-xs text-muted-foreground">Proposta «{obterFramework(ativoC.framework)?.nome}» · §{p.fontes.join(", §")}</p>
                          <p className="font-medium">{p.titulo}</p><p className="text-muted-foreground">{p.texto}</p>
                          <Button size="sm" variant={usaEsta ? "default" : "outline"} aria-pressed={usaEsta} className="mt-2 h-11" onClick={() => setSelecao(selValida.map((x, j) => (j === i ? ativoC.trabalho : x)))}>Usar este slide</Button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </>
          )}

          {res && (
            <div className="sticky bottom-0 space-y-2 rounded-[var(--mc-r-md)] border border-border bg-card p-3 text-sm pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {res.ok ? (
                <>
                  <p className="font-medium">{res.trocados} de {n} slides vêm de propostas · {[...usados].map(([id, k]) => `${nomeDe(id)} ${k}`).join(" · ")}</p>
                  {res.transicoes.length > 0 && <p className="text-xs text-muted-foreground">Rever transições antes dos slides {res.transicoes.map((t) => t + 1).join(", ")}: misturar estruturas pode perder coesão.</p>}
                  <p className="text-xs text-muted-foreground sm:hidden">Legenda e CTA atuais mantêm-se · cria nova versão (exportação atual deixa de valer).</p>
                  <p className="hidden text-xs text-muted-foreground sm:block">A legenda e o CTA atuais mantêm-se; revê-os se deixarem de servir. Aplicar cria uma nova versão: aprovação e exportação atuais deixam de valer; composição e versões anteriores mantêm-se.</p>
                </>
              ) : <p role="alert">{"motivo" in res ? res.motivo : ""}</p>}
              {erroAplicar && <p role="alert" className="text-destructive">{erroAplicar}</p>}
              <div className="flex flex-wrap gap-2">
                <Button className="h-11" disabled={!res.ok || aAplicar} onClick={aplicar}>{aAplicar && <Loader2 className="mr-1.5 h-4 w-4 motion-safe:animate-spin" />}{aAplicar ? "A gravar…" : `Aplicar seleção de ${res.ok ? res.trocados : 0} slides`}</Button>
                <Button variant="ghost" className="h-11 px-3" disabled={aAplicar} onClick={() => setSelecao(atual.slides.map(() => null))}>Limpar</Button>
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={!!escolha} onOpenChange={(o) => !o && setEscolha(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Proposta «{escolha?.nome}»</DialogTitle>
            <DialogDescription>
              Usa a fonte congelada deste carrossel e a DeepSeek (deepseek-flash). Conta 1 pedido no limite diário do projeto (até 2 se a primeira resposta precisar de correção). Não inventa factos nem promessas; cada slide cita §.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <Label htmlFor="fw-slides">Número de slides</Label>
            <Input id="fw-slides" type="number" className="h-11 w-28" min={2} max={20} value={slides} onChange={(e) => setSlides(Math.max(2, Math.min(20, Number(e.target.value) || 2)))} />
            {slides !== n && <p className="text-xs text-muted-foreground">Com um número diferente de {n}, a proposta não poderá ser comparada slide a slide; só abrirá como carrossel separado.</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" className="h-11" onClick={() => setEscolha(null)}>Cancelar</Button>
            <Button className="h-11" disabled={aPedir} onClick={pedir}>{aPedir ? <Loader2 className="mr-1.5 h-4 w-4 motion-safe:animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}Criar proposta</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
