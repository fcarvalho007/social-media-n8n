import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { criarTrabalho, listarCandidatos, regenerarSlide, type CandidatoPool, type TrabalhoCompleto } from "@/services/motor";
import { FRAMEWORKS, obterFramework, type Framework } from "../../../supabase/functions/_shared/motor/frameworks";
import type { PropostaEditorial } from "../../../supabase/functions/_shared/motor/proposta";
import { MODOS_REGEN, NOTA_MAX, type ModoRegen } from "../../../supabase/functions/_shared/motor/regenerar";
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
  const [regen, setRegen] = useState<{ id: string; indice: number } | null>(null);
  const [modoR, setModoR] = useState<ModoRegen>("facto");
  const [notaR, setNotaR] = useState("");
  const [aPedirR, setAPedirR] = useState<string | null>(null);
  const [erroR, setErroR] = useState<Record<string, string>>({});

  useEffect(() => { setSelecaoS(lerSelecao(origem, versao, n)); setErroAplicar(null); }, [origem, versao, n]);
  const setSelecao = (s: Selecao) => { setSelecaoS(s); guardarSelecao(origem, versao, s); };

  const ler = useCallback(async () => { try { setPool(await listarCandidatos(dados)); } catch { /* next cycle */ } }, [dados]);
  useEffect(() => { ler(); }, [ler]);
  const emCurso = pool.filter((c) => c.estado === "pendente" || c.estado === "a_processar");
  const emCursoF = emCurso.filter((c) => !c.escopo);
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
  const avaliadosF = avaliados.filter((c) => !c.escopo);
  const usaveis = avaliados.filter((c) => !c.motivo);
  const candidatos: Candidato[] = usaveis.map((c) => ({ trabalho: c.trabalho, framework: c.framework, conteudo: c.conteudo!, escopo: c.escopo?.slide_id ?? null }));
  const selValida: Selecao = selecao.map((x) => (x && usaveis.some((c) => c.trabalho === x) ? x : null));
  const ativoC = avaliadosF.find((c) => c.trabalho === ativo) ?? avaliadosF.find((c) => !c.motivo) ?? avaliadosF[0] ?? null;
  const nomeModo = (m?: string) => MODOS_REGEN.find((x) => x.id === m)?.nome ?? "Alternativa";
  const nomeDe = (id: string | null) => {
    if (!id) return "Atual";
    const c = usaveis.find((x) => x.trabalho === id);
    return c?.escopo ? `Alternativa (${nomeModo(c.escopo.modo)})` : obterFramework(c?.framework)?.nome ?? "Proposta";
  };
  const comp = ativoC && !ativoC.motivo && ativoC.conteudo ? ativoC : null;
  const regenDe = (slideId: string) => pool.filter((c) => c.escopo?.slide_id === slideId);

  const pedirRegen = async () => {
    if (!regen) return;
    const alvo = regen;
    setAPedirR(alvo.id); setErroR((e) => ({ ...e, [alvo.id]: "" }));
    try {
      await regenerarSlide({ project_id: dados.trabalho.project_id, origem_trabalho: origem, base_versao: versao, slide_id: alvo.id, modo: modoR, nota: notaR });
      setRegen(null); setNotaR(""); await ler();
    } catch (e) { setErroR((x) => ({ ...x, [alvo.id]: (e as Error).message })); setRegen(null); }
    finally { setAPedirR(null); }
  };
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

      {emCursoF.map((c) => (
        <p key={c.trabalho} className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 motion-safe:animate-spin" />A preparar «{obterFramework(c.framework)?.nome ?? c.framework}»… Podes continuar a editar.</p>
      ))}

      <div className="space-y-3">
      {avaliadosF.length > 0 && (
        <>
          <div role="tablist" aria-label="Propostas guardadas" className="flex flex-wrap gap-2">
            {avaliadosF.map((c) => {
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

        </>
      )}
          {comp ? (
            <>
              <p className="text-xs text-muted-foreground">Proposta «{obterFramework(ativoC.framework)?.nome}» · {PERFIL[ativoC.perfil]}. Opinião é leitura do autor; factos e números citam §.</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="h-11" onClick={() => setSelecao(atual.slides.map(() => comp.trabalho))}>Usar proposta inteira</Button>
                <Button variant="ghost" className="h-11" onClick={() => setSelecao(atual.slides.map(() => null))}>Manter atuais</Button>
              </div>
            </>
          ) : <p className="text-xs text-muted-foreground">Slides atuais. Podes regenerar um slide sem pedir uma estrutura inteira; as alternativas ficam guardadas por slide.</p>}
              <ol className="space-y-2">
                {atual.slides.map((a, i) => {
                  const p = comp?.conteudo!.slides[i];
                  const escolhido = selValida[i];
                  const usaEsta = !!comp && escolhido === comp.trabalho;
                  return (
                    <li key={a.id} className="space-y-2 rounded-[var(--mc-r-md)] border border-border p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-medium">Slide {i + 1} de {n} · na seleção: <span className="text-foreground">{nomeDe(escolhido)}</span></p>
                        <Button size="sm" variant="outline" className="h-11" disabled={aPedirR === a.id || regenDe(a.id).some((c) => c.estado === "pendente" || c.estado === "a_processar")}
                          onClick={() => { setModoR("facto"); setNotaR(""); setRegen({ id: a.id, indice: i }); }}>
                          <RefreshCw className="mr-1.5 h-4 w-4" />Regenerar este slide
                        </Button>
                      </div>
                      <div className={cn("grid gap-2", comp && "md:grid-cols-2")}>
                        <div className={cn("min-w-0 rounded-[var(--mc-r-md)] border p-2", !escolhido ? "border-primary" : "border-transparent")}>
                          <p className="text-xs text-muted-foreground">Atual · §{a.fontes.join(", §") || "—"}</p>
                          <p className="font-medium">{a.titulo}</p><p className="text-muted-foreground">{a.texto}</p>
                          <Button size="sm" variant={!escolhido ? "default" : "outline"} aria-pressed={!escolhido} className="mt-2 h-11" onClick={() => setSelecao(selValida.map((x, j) => (j === i ? null : x)))}>Manter atual</Button>
                        </div>
                        {comp && p && (
                        <div className={cn("min-w-0 rounded-[var(--mc-r-md)] border p-2", usaEsta ? "border-primary" : "border-transparent")}>
                          <p className="text-xs text-muted-foreground">Proposta «{obterFramework(comp.framework)?.nome}» · §{p.fontes.join(", §")}</p>
                          <p className="font-medium">{p.titulo}</p><p className="text-muted-foreground">{p.texto}</p>
                          <Button size="sm" variant={usaEsta ? "default" : "outline"} aria-pressed={usaEsta} className="mt-2 h-11" onClick={() => setSelecao(selValida.map((x, j) => (j === i ? comp.trabalho : x)))}>Usar este slide</Button>
                        </div>
                        )}
                      </div>
                      <LinhaAlternativas itens={regenDe(a.id)} avaliados={avaliados} escolhido={escolhido} erroPedido={erroR[a.id]} nomeModo={nomeModo}
                        usar={(id) => setSelecao(selValida.map((x, j) => (j === i ? id : x)))} />
                    </li>
                  );
                })}
              </ol>

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
                <Button className="h-11" disabled={!res.ok || aAplicar} onClick={aplicar}>{aAplicar && <Loader2 className="mr-1.5 h-4 w-4 motion-safe:animate-spin" />}{aAplicar ? "A gravar…" : `Aplicar seleção de ${res.ok ? res.trocados : 0} ${res.ok && res.trocados === 1 ? "slide" : "slides"}`}</Button>
                <Button variant="ghost" className="h-11 px-3" disabled={aAplicar} onClick={() => setSelecao(atual.slides.map(() => null))}>Limpar</Button>
              </div>
            </div>
          )}
      </div>

      <Dialog open={!!escolha} onOpenChange={(o) => !o && setEscolha(null)}>
        <DialogContent className="mc-estudio">
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
      <Dialog open={!!regen} onOpenChange={(o) => !o && !aPedirR && setRegen(null)}>
        <DialogContent className="mc-estudio">
          <DialogHeader>
            <DialogTitle>Regenerar o slide {regen ? regen.indice + 1 : ""}</DialogTitle>
            <DialogDescription>
              Só este slide muda, na mesma fonte congelada e com a voz do autor deste carrossel. A nova alternativa fica guardada ao lado das outras; nada é aplicado sem escolheres.
            </DialogDescription>
          </DialogHeader>
          <fieldset className="space-y-2">
            <legend className="sr-only">Tipo de alternativa</legend>
            {MODOS_REGEN.map((m) => (
              <label key={m.id} className={cn("flex min-h-11 cursor-pointer gap-2 rounded-[var(--mc-r-md)] border p-2 text-sm", modoR === m.id ? "border-primary bg-primary/10" : "border-input")}>
                <input type="radio" name="modo-regen" className="mt-1" checked={modoR === m.id} onChange={() => setModoR(m.id)} />
                <span><span className="font-medium">{m.nome}</span><span className="block text-xs text-muted-foreground">{m.descricao}</span></span>
              </label>
            ))}
          </fieldset>
          <div className="space-y-1">
            <Label htmlFor="regen-nota">Nota (opcional)</Label>
            <Textarea id="regen-nota" rows={2} maxLength={NOTA_MAX} value={notaR} onChange={(e) => setNotaR(e.target.value)} placeholder="Ex.: dar mais peso ao exemplo da PME" />
          </div>
          <p className="text-xs text-muted-foreground">Conta 1 pedido pago no limite diário do projeto (DeepSeek Flash; até 2 se a primeira resposta precisar de correção). Se o resultado ficar incerto, não é repetido automaticamente.</p>
          <DialogFooter>
            <Button variant="ghost" className="h-11" disabled={!!aPedirR} onClick={() => setRegen(null)}>Cancelar</Button>
            <Button className="h-11" disabled={!!aPedirR} onClick={pedirRegen}>{aPedirR ? <Loader2 className="mr-1.5 h-4 w-4 motion-safe:animate-spin" /> : <RefreshCw className="mr-1.5 h-4 w-4" />}Confirmar 1 pedido pago</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

type Avaliado = CandidatoPool & { motivo: string | null };

/** Per-slide regeneration history: pending/error state lives only on this row; older alternatives stay listed. */
function LinhaAlternativas({ itens, avaliados, escolhido, erroPedido, nomeModo, usar }: {
  itens: CandidatoPool[]; avaliados: Avaliado[]; escolhido: string | null; erroPedido?: string; nomeModo: (m?: string) => string; usar: (id: string) => void;
}) {
  if (!itens.length && !erroPedido) return null;
  const antigas = itens.filter((c) => avaliados.find((a) => a.trabalho === c.trabalho)?.motivo);
  return (
    <div className="space-y-2 border-t border-border pt-2" aria-live="polite">
      {erroPedido && <p role="alert" className="text-xs text-destructive">{erroPedido}</p>}
      {itens.map((c) => {
        const av = avaliados.find((a) => a.trabalho === c.trabalho);
        const modo = nomeModo(c.escopo?.modo);
        if (c.estado === "pendente" || c.estado === "a_processar") return <p key={c.trabalho} className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 motion-safe:animate-spin" />A gerar alternativa «{modo}»…</p>;
        if (c.estado === "erro" || c.estado === "desconhecido" || c.estado === "cancelado") return (
          <p key={c.trabalho} role="alert" className="text-xs text-destructive">«{modo}» ({dataCurta(c.criado_em)}): {c.erro ?? "não foi possível gerar."}{c.estado === "desconhecido" ? " Não é repetido automaticamente." : ""}</p>
        );
        if (!av || av.motivo || !av.conteudo) return null;
        const s = av.conteudo.slides.find((x) => x.id === c.escopo?.slide_id);
        if (!s) return null;
        const usa = escolhido === c.trabalho;
        return (
          <div key={c.trabalho} className={cn("min-w-0 rounded-[var(--mc-r-md)] border p-2", usa ? "border-primary" : "border-dashed border-input")}>
            <p className="text-xs text-muted-foreground">Alternativa «{modo}» · {dataCurta(c.criado_em)} · §{s.fontes.join(", §") || "—"}{av.conteudo.metodo === "demonstracao" ? " · simulada, sem IA" : ""}</p>
            <p className="font-medium">{s.titulo}</p><p className="text-muted-foreground">{s.texto}</p>
            <Button size="sm" variant={usa ? "default" : "outline"} aria-pressed={usa} className="mt-2 h-11" onClick={() => usar(c.trabalho)}>Usar esta alternativa</Button>
          </div>
        );
      })}
      {antigas.length > 0 && <p className="text-xs text-muted-foreground">{antigas.length} alternativa(s) antiga(s) feita(s) sobre outra versão ou fonte; ficam guardadas mas não podem ser escolhidas.</p>}
    </div>
  );
}
