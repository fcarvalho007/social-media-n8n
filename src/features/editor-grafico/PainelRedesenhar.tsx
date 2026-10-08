import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { gerarPropostasImagemIA, kieConfig, kieEstado, lerAssets, recuperarPropostasImagemIA, galeriaImagensIA, type ImagemIAGaleria, type TarefaPropostaImagemIA, type TipoPropostaImagemIA } from "@/services/motor";
import type { Asset, Medidor, PacoteProva, Variante } from "../../../supabase/functions/_shared/documento-grafico/nucleo";
import type { SistemaVisual } from "../../../supabase/functions/_shared/motor/sistema";
import { aceitaImagemIA, aplicarCandidato, esqueletosPropostaIA, redesenharPagina, substituirImagemIA, type CandidatoRedesign } from "../../../supabase/functions/_shared/motor/redesenhar";
import { PaginaCanvas } from "./PaginaCanvas";
import type { ComposicaoImagem } from "../../../supabase/functions/_shared/motor/imagem";

const NOME_MODO: Record<string, string> = { full_bleed: "Fundo total", hero: "Hero", split: "Dividida", contained: "Contida", background: "Fundo suave", none: "Sem imagem" };
const NOME_REGIAO: Record<string, string> = { left: "texto à esquerda", right: "texto à direita", top: "texto em cima", bottom: "texto em baixo", center: "texto ao centro" };
type Imagens = Parameters<typeof PaginaCanvas>[0]["imagens"];
const DIRECOES_IA: Array<{ tipo: TipoPropostaImagemIA; nome: string }> = [{ tipo: "editavel", nome: "Direção A" }, { tipo: "final", nome: "Direção B" }];

interface Props { aberto: boolean; onFechar: () => void; pacote: PacoteProva; sistema: SistemaVisual; variante: Variante; indice: number; medidor: Medidor; imagens: Imagens; onAplicar: (p: PacoteProva, c: CandidatoRedesign) => void; projectId?: string }
const chaveTarefas = (projectId: string, pacote: PacoteProva, variante: Variante, indice: number) => `mc-redesenho-ia:${projectId}:${pacote.id}:${variante}:${indice}`;
const contextoTarefas = (pacote: PacoteProva, variante: Variante, indice: number) => `${pacote.id}:${variante}:${pacote.variantes[variante].paginas[indice]?.id ?? indice}`;
function imagemHtml(asset: Asset): HTMLImageElement { const img = new Image(); img.src = `data:${asset.mime};base64,${asset.dados}`; return img; }

/** Five free compositions plus one explicit, paid AI route. No result is applied automatically. */
export function PainelRedesenhar({ aberto, onFechar, pacote, sistema, variante, indice, medidor, imagens, onAplicar, projectId }: Props) {
  const [ronda, setRonda] = useState(0);
  const [res, setRes] = useState<ReturnType<typeof redesenharPagina> | null>(null);
  const [sel, setSel] = useState<CandidatoRedesign | null>(null);
  const [confirmarIA, setConfirmarIA] = useState(false);
  const [tarefas, setTarefas] = useState<TarefaPropostaImagemIA[]>([]);
  const [resultados, setResultados] = useState<Partial<Record<TipoPropostaImagemIA, string>>>({});
  const [assetsIA, setAssetsIA] = useState<Record<string, Asset>>({});
  const [imagensIA, setImagensIA] = useState<Imagens>({});
  const [erroIA, setErroIA] = useState<string | null>(null);
  const [aGerar, setAGerar] = useState(false);
  const [seedreamDisponivel, setSeedreamDisponivel] = useState<boolean | null>(null);
  const [galeria, setGaleria] = useState<ImagemIAGaleria[]>([]);
  const [escolhaGaleria, setEscolhaGaleria] = useState<string | null>(null);
  const [erroGerar, setErroGerar] = useState<string | null>(null);
  const gerar = (r: number) => {
    setRonda(r); setSel(null); setErroGerar(null);
    try { setRes(redesenharPagina({ pacote, sistema, variante, indice, m: medidor, modo: "manter", imagens: "auto", ronda: r, incluirIA: false })); }
    catch (e) { setRes({ candidatos: [], sugerirIA: false }); setErroGerar(`Não foi possível preparar as composições: ${(e as Error).message}`); }
  };
  const carregarAssets = useCallback(async (ids: string[]) => {
    if (!projectId) return;
    const lidos = await lerAssets(projectId, ids);
    setAssetsIA((a) => ({ ...a, ...lidos.assets }));
    setImagensIA((atuais) => ({ ...atuais, ...Object.fromEntries(Object.entries(lidos.assets).map(([id, asset]) => [id, imagemHtml(asset)])) }));
  }, [projectId]);

  useEffect(() => {
    if (!aberto) return;
    gerar(0); setConfirmarIA(false); setErroIA(null); setEscolhaGaleria(null);
    if (!projectId) return;
    kieConfig(projectId).then((c) => setSeedreamDisponivel(c.modelos.some((m) => m.id === "kie-seedream-fast"))).catch(() => setSeedreamDisponivel(false));
    try { const v = localStorage.getItem(chaveTarefas(projectId, pacote, variante, indice)); setTarefas(v ? JSON.parse(v) as TarefaPropostaImagemIA[] : []); } catch { setTarefas([]); }
    // Finished tasks are recovered too, so images already paid for never disappear on reopen.
    recuperarPropostasImagemIA(projectId, contextoTarefas(pacote, variante, indice)).then((r) => {
      if (!r.tarefas.length) return;
      setTarefas(r.tarefas);
      const prontas = r.tarefas.filter((t) => t.estado === "concluida" && t.asset_id);
      if (prontas.length) { setResultados(Object.fromEntries(prontas.map((t) => [t.tipo, String(t.asset_id)]))); void carregarAssets(prontas.map((t) => String(t.asset_id))).catch(() => undefined); }
    }).catch(() => undefined);
    galeriaImagensIA(projectId, pacote.id).then((g) => setGaleria(g.imagens)).catch(() => setGaleria([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, pacote.id, variante, indice, projectId]);

  const guardarTarefas = useCallback((ts: TarefaPropostaImagemIA[]) => {
    setTarefas(ts); if (!projectId) return;
    try { if (ts.length) localStorage.setItem(chaveTarefas(projectId, pacote, variante, indice), JSON.stringify(ts)); else localStorage.removeItem(chaveTarefas(projectId, pacote, variante, indice)); } catch { /* persists server-side */ }
  }, [projectId, pacote, variante, indice]);
  const consultar = useCallback(async () => {
    if (!projectId || !tarefas.length) return;
    try {
      const ativas = tarefas.filter((t) => t.estado === "criada" || t.estado === "reservada");
      if (!ativas.length) return;
      const estados = await Promise.all(ativas.map(async (t) => ({ ...t, resposta: await kieEstado(projectId, t.tarefa) })));
      const concluidos = estados.filter((t) => t.resposta.estado === "concluida" && t.resposta.asset_id);
      const ids = concluidos.map((t) => String(t.resposta.asset_id));
      if (ids.length) {
        await carregarAssets(ids);
        setResultados((atuais) => ({ ...atuais, ...Object.fromEntries(concluidos.map((t) => [t.tipo, String(t.resposta.asset_id)])) }));
      }
      const novos = new Map(estados.map(({ tipo, tarefa, resposta }) => [tarefa, { tipo, tarefa, estado: resposta.estado, asset_id: resposta.asset_id ?? null }]));
      const pendentes = tarefas.map((t) => novos.get(t.tarefa) ?? t);
      const falha = estados.find((t) => t.resposta.estado === "falhou" || t.resposta.estado === "desconhecido");
      if (falha) setErroIA(falha.resposta.estado === "desconhecido" ? "O resultado deste pedido é desconhecido e não será repetido automaticamente." : `Uma proposta falhou: ${falha.resposta.erro ?? "sem detalhe"}`);
      guardarTarefas(pendentes);
    } catch (e) { setErroIA((e as Error).message); }
  }, [projectId, tarefas, guardarTarefas, carregarAssets]);
  const nAtivas = tarefas.filter((t) => t.estado === "criada" || t.estado === "reservada").length;
  useEffect(() => { if (!aberto || !nAtivas) return; void consultar(); const t = window.setInterval(() => { void consultar(); }, 5000); return () => window.clearInterval(t); }, [aberto, nAtivas, consultar]);

  const fechar = () => { setRes(null); setSel(null); setConfirmarIA(false); onFechar(); };
  const esqueletos = useMemo(() => { try { return esqueletosPropostaIA({ pacote, sistema, variante, indice, m: medidor }); } catch { return { editavel: null, final: null }; } }, [pacote, sistema, variante, indice, medidor]);
  const candidatosIA = useMemo(() => {
    const out: Array<{ tipo: TipoPropostaImagemIA; candidato: CandidatoRedesign; pacote: PacoteProva; aviso: string }> = [];
    for (const d of DIRECOES_IA) {
      const assetId = escolhaGaleria ?? resultados[d.tipo];
      const base = esqueletos[d.tipo];
      if (!assetId || !assetsIA[assetId] || !base) continue;
      const c = substituirImagemIA({ ...base, id: `${base.id}${escolhaGaleria ? "-galeria" : ""}` }, assetId, { modelo: "Seedream 5 Flash" });
      const p = { ...pacote, assets: { ...pacote.assets, [assetId]: assetsIA[assetId] } };
      out.push({ tipo: d.tipo, candidato: c, pacote: aplicarCandidato(p, variante, indice, c), aviso: escolhaGaleria ? "Imagem já gerada reutilizada, sem custo. Texto e elementos continuam editáveis." : "Texto original e todos os elementos continuam editáveis." });
    }
    return out;
  }, [resultados, assetsIA, esqueletos, escolhaGaleria, pacote, variante, indice]);
  const selecionadoIA = candidatosIA.find((x) => x.candidato.id === sel?.id);
  const vista = useMemo(() => selecionadoIA?.pacote ?? (sel ? aplicarCandidato(pacote, variante, indice, sel) : pacote), [selecionadoIA, sel, pacote, variante, indice]);
  const imagensVista = useMemo(() => ({ ...imagens, ...imagensIA }), [imagens, imagensIA]);
  const aplicar = (c: CandidatoRedesign, p = aplicarCandidato(pacote, variante, indice, c)) => { onAplicar(p, c); fechar(); };
  const ficha = (c: CandidatoRedesign) => { const comp = (c.pagina.composicao ?? {}) as ComposicaoImagem; const temImg = aceitaImagemIA(c); return [temImg ? NOME_MODO[comp.modo ?? ""] ?? "Com imagem" : "Só tipografia", comp.regiao ? NOME_REGIAO[comp.regiao] : "", temImg ? "com espaço para imagem" : ""].filter(Boolean).join(" · "); };
  const iniciarIA = async () => {
    if (!projectId) return;
    setAGerar(true); setErroIA(null); setConfirmarIA(false); setEscolhaGaleria(null); setResultados({}); setAssetsIA({}); setImagensIA({});
    try { const r = await gerarPropostasImagemIA(projectId, pacote, variante, indice, contextoTarefas(pacote, variante, indice)); guardarTarefas(r.tarefas); galeriaImagensIA(projectId, pacote.id).then((g) => setGaleria(g.imagens)).catch(() => undefined); if (r.falha) setErroIA(`${r.falha.tipo === "editavel" ? "Direção A" : "Direção B"}: ${r.falha.motivo}`); } catch (e) { setErroIA((e as Error).message); } finally { setAGerar(false); }
  };
  const cartao = (p: PacoteProva, rotulo: string, ativo: boolean, onClick: () => void, c?: CandidatoRedesign) => <div key={c?.id ?? "orig"} className={`flex min-w-0 flex-col gap-1.5 rounded-lg border p-2 transition-colors ${ativo ? "border-primary ring-1 ring-primary" : "border-border hover:border-muted-foreground"}`}><button type="button" onClick={onClick} className="relative block overflow-hidden rounded-md text-left" aria-label={rotulo}><PaginaCanvas pacote={p} variante={variante} indice={indice} medidor={medidor} imagens={imagensVista} escala={0.17} /></button><span className="text-xs font-medium leading-tight">{rotulo}</span>{c && <div className="flex flex-wrap items-center gap-1.5"><span className="text-[11px] leading-tight text-muted-foreground">{ficha(c)}</span>{c.disruptiva && <span className="rounded-sm bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-accent-foreground">Disruptiva</span>}</div>}{c && <span className="text-[11px] leading-tight text-muted-foreground">{c.reason}</span>}</div>;

  return <Dialog open={aberto} onOpenChange={(o) => { if (!o) fechar(); }}><DialogContent className="max-h-[94vh] w-[96vw] max-w-[1400px] overflow-y-auto"><DialogHeader><DialogTitle>Escolher nova composição</DialogTitle><DialogDescription>Cinco composições editoriais e duas direções IA pagas. Nada é aplicado sem aprovação.</DialogDescription></DialogHeader>{res ? <div className="grid gap-5 lg:grid-cols-[auto_1fr]"><div className="space-y-2 lg:sticky lg:top-0 lg:self-start"><PaginaCanvas pacote={vista} variante={variante} indice={indice} medidor={medidor} imagens={imagensVista} escala={0.36} />{sel ? <div className="space-y-2"><p className="text-xs text-muted-foreground">{selecionadoIA?.aviso ?? ficha(sel)}</p><div className="flex flex-wrap gap-2"><Button onClick={() => aplicar(sel, selecionadoIA?.pacote)}>Aplicar esta versão</Button><Button variant="ghost" onClick={() => setSel(null)}>Ver original</Button></div></div> : <p className="text-xs text-muted-foreground">Original. Escolhe uma versão para a ver em grande.</p>}</div><div className="space-y-3"><div className="grid grid-cols-2 gap-3 xl:grid-cols-3">{res.candidatos.map((c, i) => cartao(aplicarCandidato(pacote, variante, indice, c), `Versão ${i + 1} · ${c.label}`, sel?.id === c.id, () => setSel(c), c))}<div className="flex min-h-48 min-w-0 flex-col justify-between gap-3 rounded-lg border border-dashed border-primary/50 bg-primary/5 p-3 xl:col-span-3"><div><Sparkles className="mb-2 h-5 w-5 text-primary" /><p className="text-sm font-semibold">Criar com IA</p><p className="mt-1 text-xs text-muted-foreground">Duas direções editáveis. A IA cria apenas imagens de apoio; o texto original é composto pelo Estúdio.</p></div>{candidatosIA.length > 0 || tarefas.length || aGerar ? <div className="space-y-2"><div className="grid grid-cols-2 gap-3">{DIRECOES_IA.map((d) => { const x = candidatosIA.find((c) => c.tipo === d.tipo); const t = tarefas.find((y) => y.tipo === d.tipo); const estado = escolhaGaleria ? "concluida" : aGerar ? "criada" : t?.estado; const rotulo = estado === "criada" || estado === "reservada" ? "A gerar" : estado === "concluida" ? (esqueletos[d.tipo] ? "A carregar imagem" : "Imagem pronta, mas não cabe nesta composição") : estado === "desconhecido" ? "Resultado desconhecido" : estado === "falhou" ? "Falhou" : "Sem pedido"; const roda = rotulo === "A gerar" || rotulo === "A carregar imagem"; return x ? <button key={d.tipo} type="button" className={`rounded-md border p-2 text-left ${sel?.id === x.candidato.id ? "border-primary ring-1 ring-primary" : "border-border"}`} onClick={() => setSel(x.candidato)}><PaginaCanvas pacote={x.pacote} variante={variante} indice={indice} medidor={medidor} imagens={imagensVista} escala={0.145} /><span className="mt-1 block text-xs font-medium">{d.nome} · Disponível</span><span className="text-[11px] text-muted-foreground">Texto e elementos editáveis.</span></button> : <div key={d.tipo} className="flex min-h-44 flex-col items-center justify-center rounded-md border bg-muted/40 p-3 text-center">{roda && <Loader2 className="mb-2 h-4 w-4 motion-safe:animate-spin" />}<span className="text-xs font-medium">{d.nome} · {rotulo}</span></div>; })}</div>{!aGerar && !nAtivas && !confirmarIA && <Button variant="ghost" size="sm" className="h-8 w-full text-xs" disabled={!projectId || seedreamDisponivel === false} onClick={() => setConfirmarIA(true)}>Gerar novas (pago)</Button>}{confirmarIA && <div className="space-y-2 rounded-md border border-border bg-background p-2"><p className="text-xs"><strong>2 pedidos pagos</strong> · 2 × US$ 0,0162 = <strong>US$ 0,0324 estimados</strong></p><Button className="h-9 w-full" onClick={() => { void iniciarIA(); }}>Confirmar e gerar</Button><Button variant="ghost" className="h-8 w-full" onClick={() => setConfirmarIA(false)}>Cancelar</Button></div>}</div> : confirmarIA ? <div className="space-y-2 rounded-md border border-border bg-background p-2"><p className="text-xs"><strong>2 pedidos pagos</strong><br />2 × US$ 0,0162 = <strong>US$ 0,0324 estimados</strong><br />Formato {pacote.variantes[variante].altura === 1920 ? "9:16" : "3:4"}. O valor real é o cobrado pela Kie.ai.</p><Button className="h-9 w-full" onClick={() => { void iniciarIA(); }}>Confirmar e gerar</Button><Button variant="ghost" className="h-8 w-full" onClick={() => setConfirmarIA(false)}>Cancelar</Button></div> : <Button variant="outline" className="h-10 w-full" disabled={!projectId || seedreamDisponivel === false} onClick={() => setConfirmarIA(true)}>{seedreamDisponivel === null ? "A verificar…" : seedreamDisponivel ? "Rever custo e gerar" : "Seedream indisponível"}</Button>}{erroIA && <p role="alert" className="text-xs text-destructive">{erroIA}</p>}{galeria.length > 0 && <div className="space-y-1.5 border-t border-border pt-2"><p className="text-xs font-semibold">Imagens IA deste carrossel <span className="font-normal text-muted-foreground">· {galeria.length} já geradas, reutilizar sem custo</span></p><div className="flex gap-2 overflow-x-auto pb-1">{galeria.map((g) => { const a = assetsIA[g.asset_id]; const ativo = escolhaGaleria === g.asset_id; return <button key={g.tarefa} type="button" title={`Gerada em ${new Date(g.criado_em).toLocaleString("pt-PT")}`} className={`h-24 w-[4.5rem] shrink-0 overflow-hidden rounded-md border bg-muted ${ativo ? "border-primary ring-1 ring-primary" : "border-border"}`} onClick={() => { setSel(null); setEscolhaGaleria(ativo ? null : g.asset_id); if (!a) void carregarAssets([g.asset_id]).catch((e) => setErroIA((e as Error).message)); }}>{a ? <img src={`data:${a.mime};base64,${a.dados}`} alt="Imagem gerada anteriormente" className="h-full w-full object-cover" /> : <span className="text-[10px] text-muted-foreground">Ver</span>}</button>; })}</div>{escolhaGaleria && <p className="text-[11px] text-muted-foreground">Imagem encaixada nas direções A e B acima. Escolhe uma para pré-visualizar; nada é aplicado sem «Aplicar esta versão».</p>}</div>}</div></div>{erroGerar && <p role="alert" className="text-xs text-destructive">{erroGerar}</p>}{res.aviso && <p className="text-xs text-muted-foreground" role="status">{res.aviso}</p>}<div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => gerar(ronda + 1)}><RefreshCw className="mr-1.5 h-4 w-4" />Gerar outras 5</Button><Button variant="ghost" size="sm" onClick={fechar}>Cancelar</Button></div></div></div> : <p className="text-sm text-muted-foreground" role="status">A preparar cinco composições…</p>}</DialogContent></Dialog>;
}