import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { gerarPropostasImagemIA, kieConfig, kieEstado, lerAssets, recuperarPropostasImagemIA, type TarefaPropostaImagemIA, type TipoPropostaImagemIA } from "@/services/motor";
import type { Asset, Medidor, PacoteProva, Variante } from "../../../supabase/functions/_shared/documento-grafico/nucleo";
import type { SistemaVisual } from "../../../supabase/functions/_shared/motor/sistema";
import { aceitaImagemIA, aplicarCandidato, redesenharPagina, substituirImagemIA, type CandidatoRedesign } from "../../../supabase/functions/_shared/motor/redesenhar";
import { PaginaCanvas } from "./PaginaCanvas";
import type { ComposicaoImagem } from "../../../supabase/functions/_shared/motor/imagem";

const NOME_MODO: Record<string, string> = { full_bleed: "Fundo total", hero: "Hero", split: "Dividida", contained: "Contida", background: "Fundo suave", none: "Sem imagem" };
const NOME_REGIAO: Record<string, string> = { left: "texto à esquerda", right: "texto à direita", top: "texto em cima", bottom: "texto em baixo", center: "texto ao centro" };
type Imagens = Parameters<typeof PaginaCanvas>[0]["imagens"];

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
  const gerar = (r: number) => { setRonda(r); setSel(null); setRes(redesenharPagina({ pacote, sistema, variante, indice, m: medidor, modo: "manter", imagens: "auto", ronda: r, incluirIA: false })); };

  useEffect(() => {
    if (!aberto) return;
    gerar(0); setConfirmarIA(false); setErroIA(null);
    if (!projectId) return;
    kieConfig(projectId).then((c) => setSeedreamDisponivel(c.modelos.some((m) => m.id === "kie-seedream-fast"))).catch(() => setSeedreamDisponivel(false));
    try { const v = localStorage.getItem(chaveTarefas(projectId, pacote, variante, indice)); setTarefas(v ? JSON.parse(v) as TarefaPropostaImagemIA[] : []); } catch { setTarefas([]); }
    recuperarPropostasImagemIA(projectId, contextoTarefas(pacote, variante, indice)).then((r) => { if (r.tarefas.length) setTarefas(r.tarefas); }).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, pacote.id, variante, indice, projectId]);

  const guardarTarefas = useCallback((ts: TarefaPropostaImagemIA[]) => {
    setTarefas(ts); if (!projectId) return;
    try { if (ts.length) localStorage.setItem(chaveTarefas(projectId, pacote, variante, indice), JSON.stringify(ts)); else localStorage.removeItem(chaveTarefas(projectId, pacote, variante, indice)); } catch { /* persists server-side */ }
  }, [projectId, pacote, variante, indice]);
  const consultar = useCallback(async () => {
    if (!projectId || !tarefas.length) return;
    try {
      const estados = await Promise.all(tarefas.map(async (t) => ({ ...t, resposta: await kieEstado(projectId, t.tarefa) })));
      const concluidos = estados.filter((t) => t.resposta.estado === "concluida" && t.resposta.asset_id);
      const ids = concluidos.map((t) => String(t.resposta.asset_id));
      if (ids.length) {
        const lidos = await lerAssets(projectId, ids);
        setAssetsIA((a) => ({ ...a, ...lidos.assets }));
        setImagensIA((atuais) => ({ ...atuais, ...Object.fromEntries(Object.entries(lidos.assets).map(([id, asset]) => [id, imagemHtml(asset)])) }));
        setResultados((atuais) => ({ ...atuais, ...Object.fromEntries(concluidos.map((t) => [t.tipo, String(t.resposta.asset_id)])) }));
      }
      const pendentes = estados.filter((t) => t.resposta.estado === "criada" || t.resposta.estado === "reservada").map(({ tipo, tarefa, resposta }) => ({ tipo, tarefa, estado: resposta.estado }));
      const falha = estados.find((t) => t.resposta.estado === "falhou" || t.resposta.estado === "desconhecido");
      if (falha) setErroIA(falha.resposta.estado === "desconhecido" ? "O resultado deste pedido é desconhecido e não será repetido automaticamente." : `Uma proposta falhou: ${falha.resposta.erro ?? "sem detalhe"}`);
      guardarTarefas(pendentes);
    } catch (e) { setErroIA((e as Error).message); }
  }, [projectId, tarefas, guardarTarefas]);
  useEffect(() => { if (!aberto || !tarefas.length) return; void consultar(); const t = window.setInterval(() => { void consultar(); }, 5000); return () => window.clearInterval(t); }, [aberto, tarefas.length, consultar]);

  const fechar = () => { setRes(null); setSel(null); setConfirmarIA(false); onFechar(); };
  const layoutIA = useMemo(() => redesenharPagina({ pacote, sistema, variante, indice, m: medidor, n: 1, ronda, incluirIA: true }).candidatos.find((c) => c.requiresAiImage), [pacote, sistema, variante, indice, medidor, ronda]);
  const candidatosIA = useMemo(() => {
    const out: Array<{ tipo: TipoPropostaImagemIA; candidato: CandidatoRedesign; pacote: PacoteProva; aviso: string }> = [];
    const editavel = resultados.editavel && assetsIA[resultados.editavel] && layoutIA ? substituirImagemIA(layoutIA, resultados.editavel, { modelo: "Seedream 5 Flash" }) : null;
    if (editavel && resultados.editavel) { const p = { ...pacote, assets: { ...pacote.assets, [resultados.editavel]: assetsIA[resultados.editavel] } }; out.push({ tipo: "editavel", candidato: editavel, pacote: aplicarCandidato(p, variante, indice, editavel), aviso: "Texto e elementos continuam editáveis." }); }
    const assetFinal = resultados.final ? assetsIA[resultados.final] : undefined;
    const original = pacote.variantes[variante].paginas[indice];
    if (assetFinal && original) {
      const candidato: CandidatoRedesign = { id: "ia-final", strategy: "AI_IMAGE_COMPOSITION", label: "Imagem final IA", reason: "Slide completo criado pela IA a partir do conteúdo visível.", estilo: sistema.estilo, requiresAiImage: true, estimatedCost: null, pagina: { ...original, fundo: "#ffffff", composicao: { modo: "full_bleed", origem: "kie", asset_id: assetFinal.id }, camadas: [{ id: `imagem-final-${assetFinal.id}`, nome: "Imagem final IA", tipo: "imagem", asset_id: assetFinal.id, recorte: "cover", foco: { x: 0.5, y: 0.5 }, x: 0, y: 0, w: pacote.variantes[variante].largura, h: pacote.variantes[variante].altura, z: 1, manual: true }] } };
      const p = { ...pacote, assets: { ...pacote.assets, [assetFinal.id]: assetFinal } }; out.push({ tipo: "final", candidato, pacote: aplicarCandidato(p, variante, indice, candidato), aviso: "Texto não editável · rever ortografia antes de aplicar." });
    }
    return out;
  }, [resultados, assetsIA, layoutIA, pacote, variante, indice, sistema.estilo]);
  const selecionadoIA = candidatosIA.find((x) => x.candidato.id === sel?.id);
  const vista = useMemo(() => selecionadoIA?.pacote ?? (sel ? aplicarCandidato(pacote, variante, indice, sel) : pacote), [selecionadoIA, sel, pacote, variante, indice]);
  const imagensVista = useMemo(() => ({ ...imagens, ...imagensIA }), [imagens, imagensIA]);
  const aplicar = (c: CandidatoRedesign, p = aplicarCandidato(pacote, variante, indice, c)) => { onAplicar(p, c); fechar(); };
  const ficha = (c: CandidatoRedesign) => { const comp = (c.pagina.composicao ?? {}) as ComposicaoImagem; const temImg = aceitaImagemIA(c); return [temImg ? NOME_MODO[comp.modo ?? ""] ?? "Com imagem" : "Só tipografia", comp.regiao ? NOME_REGIAO[comp.regiao] : "", temImg ? "com espaço para imagem" : ""].filter(Boolean).join(" · "); };
  const iniciarIA = async () => {
    if (!projectId) return;
    setAGerar(true); setErroIA(null); setConfirmarIA(false); setResultados({}); setAssetsIA({}); setImagensIA({});
    try { const r = await gerarPropostasImagemIA(projectId, pacote, variante, indice, contextoTarefas(pacote, variante, indice)); guardarTarefas(r.tarefas); if (r.aviso) setErroIA(r.aviso); } catch (e) { setErroIA((e as Error).message); } finally { setAGerar(false); }
  };
  const cartao = (p: PacoteProva, rotulo: string, ativo: boolean, onClick: () => void, c?: CandidatoRedesign) => <div key={c?.id ?? "orig"} className={`flex min-w-0 flex-col gap-1.5 rounded-lg border p-2 transition-colors ${ativo ? "border-primary ring-1 ring-primary" : "border-border hover:border-muted-foreground"}`}><button type="button" onClick={onClick} className="relative block overflow-hidden rounded-md text-left" aria-label={rotulo}><PaginaCanvas pacote={p} variante={variante} indice={indice} medidor={medidor} imagens={imagensVista} escala={0.17} /></button><span className="text-xs font-medium leading-tight">{rotulo}</span>{c && <div className="flex flex-wrap items-center gap-1.5"><span className="text-[11px] leading-tight text-muted-foreground">{ficha(c)}</span>{c.disruptiva && <span className="rounded-sm bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-accent-foreground">Disruptiva</span>}</div>}{c && <span className="text-[11px] leading-tight text-muted-foreground">{c.reason}</span>}</div>;

  return <Dialog open={aberto} onOpenChange={(o) => { if (!o) fechar(); }}><DialogContent className="max-h-[94vh] w-[96vw] max-w-[1400px] overflow-y-auto"><DialogHeader><DialogTitle>Escolher nova composição</DialogTitle><DialogDescription>Cinco composições gratuitas e uma opção de IA paga. Nada é aplicado sem aprovação.</DialogDescription></DialogHeader>{res ? <div className="grid gap-5 lg:grid-cols-[auto_1fr]"><div className="space-y-2 lg:sticky lg:top-0 lg:self-start"><PaginaCanvas pacote={vista} variante={variante} indice={indice} medidor={medidor} imagens={imagensVista} escala={0.36} />{sel ? <div className="space-y-2"><p className="text-xs text-muted-foreground">{selecionadoIA?.aviso ?? ficha(sel)}</p><div className="flex flex-wrap gap-2"><Button onClick={() => aplicar(sel, selecionadoIA?.pacote)}>Aplicar esta versão</Button><Button variant="ghost" onClick={() => setSel(null)}>Ver original</Button></div></div> : <p className="text-xs text-muted-foreground">Original. Escolhe uma versão para a ver em grande.</p>}</div><div className="space-y-3"><div className="grid grid-cols-2 gap-3 xl:grid-cols-3">{res.candidatos.map((c, i) => cartao(aplicarCandidato(pacote, variante, indice, c), `Versão ${i + 1} · ${c.label}`, sel?.id === c.id, () => setSel(c), c))}<div className="flex min-h-48 min-w-0 flex-col justify-between gap-3 rounded-lg border border-dashed border-primary/50 bg-primary/5 p-3"><div><Sparkles className="mb-2 h-5 w-5 text-primary" /><p className="text-sm font-semibold">Versão 6 · Criar com IA</p><p className="mt-1 text-xs text-muted-foreground">Duas propostas Seedream 5 Flash: uma editável e uma imagem final.</p></div>{candidatosIA.length > 0 ? <div className="grid grid-cols-2 gap-2">{candidatosIA.map((x) => <button key={x.tipo} type="button" className={`rounded-md border p-1.5 text-left ${sel?.id === x.candidato.id ? "border-primary ring-1 ring-primary" : "border-border"}`} onClick={() => setSel(x.candidato)}><PaginaCanvas pacote={x.pacote} variante={variante} indice={indice} medidor={medidor} imagens={imagensVista} escala={0.115} /><span className="mt-1 block text-[11px] font-medium">{x.tipo === "editavel" ? "Editável" : "Imagem final"}</span></button>)}</div> : tarefas.length || aGerar ? <p className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 motion-safe:animate-spin" />A gerar {tarefas.length || 2} propostas… podes fechar e voltar.</p> : confirmarIA ? <div className="space-y-2 rounded-md border border-border bg-background p-2"><p className="text-xs"><strong>2 pedidos pagos</strong><br />2 × US$ 0,0162 = <strong>US$ 0,0324 estimados</strong><br />Formato {pacote.variantes[variante].altura === 1920 ? "9:16" : "3:4"}. O valor real é o cobrado pela Kie.ai.</p><Button className="h-9 w-full" onClick={() => { void iniciarIA(); }}>Confirmar e gerar</Button><Button variant="ghost" className="h-8 w-full" onClick={() => setConfirmarIA(false)}>Cancelar</Button></div> : <Button variant="outline" className="h-10 w-full" disabled={!projectId || seedreamDisponivel === false} onClick={() => setConfirmarIA(true)}>{seedreamDisponivel === null ? "A verificar…" : seedreamDisponivel ? "Rever custo e gerar" : "Seedream indisponível"}</Button>}{erroIA && <p role="alert" className="text-xs text-destructive">{erroIA}</p>}</div></div>{res.aviso && <p className="text-xs text-muted-foreground" role="status">{res.aviso}</p>}<div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => gerar(ronda + 1)}><RefreshCw className="mr-1.5 h-4 w-4" />Gerar outras 5</Button><Button variant="ghost" size="sm" onClick={fechar}>Cancelar</Button></div></div></div> : <p className="text-sm text-muted-foreground" role="status">A preparar cinco composições…</p>}</DialogContent></Dialog>;
}