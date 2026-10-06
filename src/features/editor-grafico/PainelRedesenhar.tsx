import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { kieEstado, kieGerar, lerAssets } from "@/services/motor";
import { carregarImagens } from "./desenho";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { Medidor, PacoteProva, Variante } from "../../../supabase/functions/_shared/documento-grafico/nucleo";
import type { SistemaVisual } from "../../../supabase/functions/_shared/motor/sistema";
import { ASSET_IA_PENDENTE, aceitaImagemIA, aplicarCandidato, converterParaIA, imagemInadequada, redesenharPagina, substituirImagemIA, type CandidatoRedesign } from "../../../supabase/functions/_shared/motor/redesenhar";
import { PaginaCanvas } from "./PaginaCanvas";
import { rotuloCusto } from "../motor/custosIa";
import type { ComposicaoImagem } from "../../../supabase/functions/_shared/motor/imagem";

const NOME_MODO: Record<string, string> = { full_bleed: "Fundo total", hero: "Hero", split: "Dividida", contained: "Contida", background: "Fundo suave", none: "Sem imagem" };
const NOME_REGIAO: Record<string, string> = { left: "texto à esquerda", right: "texto à direita", top: "texto em cima", bottom: "texto em baixo", center: "texto ao centro" };

type Imagens = Parameters<typeof PaginaCanvas>[0]["imagens"];

interface Props {
  aberto: boolean;
  onFechar: () => void;
  pacote: PacoteProva;
  sistema: SistemaVisual;
  variante: Variante;
  indice: number;
  medidor: Medidor;
  imagens: Imagens;
  onAplicar: (p: PacoteProva, c: CandidatoRedesign) => void;
  /** Opens the existing AI image flow (asks for paid-request confirmation there). */
  onGerarIA?: () => void;
  /** Needed for the redesign's single AI image (server-side generation, reserved per click). */
  projectId?: string;
}

type EstadoIA = { fase: "idle"; alvo?: string } | { fase: "a_gerar"; tarefa: string; alvo?: string } | { fase: "erro"; msg: string; alvo?: string } | { fase: "pronta"; alvo?: string };

/** Composition exploration for one page. Nothing touches the document until "Aplicar esta versão". */
export function PainelRedesenhar({ aberto, onFechar, pacote, sistema, variante, indice, medidor, imagens, onAplicar, projectId }: Props) {
  const [modo, setModo] = useState<"manter" | "explorar">("manter");
  const [fonte, setFonte] = useState<"auto" | "sem_novas" | "ia">("auto");
  const [ronda, setRonda] = useState(0);
  const [res, setRes] = useState<ReturnType<typeof redesenharPagina> | null>(null);
  const [sel, setSel] = useState<CandidatoRedesign | null>(null);
  const [assetsIA, setAssetsIA] = useState<PacoteProva["assets"]>({});
  const [imgsIA, setImgsIA] = useState<Imagens>({});
  const [ia, setIa] = useState<EstadoIA>({ fase: "idle" });
  const [kieIndisponivel, setKieIndisponivel] = useState(false);
  const vivo = useRef(true);
  useEffect(() => { vivo.current = true; return () => { vivo.current = false; }; }, []);
  const papel = pacote.variantes[variante].paginas[indice]?.papel as Parameters<typeof imagemInadequada>[0];
  const comIA = !!projectId && fonte !== "sem_novas" && !imagemInadequada(papel);

  /** Polls the reserved task; never re-creates it (unknown outcome stays unknown). */
  const acompanhar = async (tarefa: string, alvoId: string, prompt: string, modelo?: string) => {
    if (!projectId) return;
    for (let i = 0; i < 90 && vivo.current; i++) {
      await new Promise((r) => setTimeout(r, 4000));
      let e;
      try { e = await kieEstado(projectId, tarefa); } catch (err) { setIa({ fase: "erro", msg: (err as Error).message, alvo: alvoId }); return; }
      if (e.estado === "concluida" && e.asset_id) {
        const { assets } = await lerAssets(projectId, [e.asset_id]);
        const imgs = await carregarImagens({ ...pacote, assets });
        if (!vivo.current) return;
        setAssetsIA((x) => ({ ...x, ...assets }));
        setImgsIA((x) => ({ ...x, ...imgs }));
        const id = e.asset_id;
        setRes((r) => r && { ...r, candidatos: r.candidatos.map((c) => (c.id === alvoId ? substituirImagemIA(c, id, { modelo, prompt }) : c)) });
        setSel((s) => (s?.id === alvoId ? substituirImagemIA(s, id, { modelo, prompt }) : s));
        setIa({ fase: "pronta", alvo: alvoId });
        return;
      }
      if (e.estado === "falhou" || e.estado === "desconhecido") {
        setIa({ alvo: alvoId, fase: "erro", msg: e.estado === "desconhecido" ? "Resultado desconhecido na Kie; o pedido não foi repetido." : e.erro ?? "A geração falhou." });
        return;
      }
    }
    if (vivo.current) setIa({ alvo: alvoId, fase: "erro", msg: "A imagem ainda não chegou. O pedido continua reservado e não foi repetido." });
  };
  /** One paid request per explicit click: initial redesign or "Regenerar imagem IA". */
  const pedirIA = async (c: CandidatoRedesign) => {
    if (!projectId || !c.promptIA) return;
    setIa({ fase: "a_gerar", tarefa: "", alvo: c.id });
    try {
      const r = await kieGerar(projectId, c.promptIA) as { tarefa: string; estado: string; modelo?: string };
      setIa({ fase: "a_gerar", tarefa: r.tarefa, alvo: c.id });
      acompanhar(r.tarefa, c.id, c.promptIA, r.modelo).catch((err: Error) => { if (vivo.current) setIa({ fase: "erro", msg: err.message || "A imagem IA falhou.", alvo: c.id }); });
    } catch (err) {
      const m = (err as Error).message;
      if (/chave|unauthori/i.test(m)) setKieIndisponivel(true);
      setIa({ fase: "erro", msg: m, alvo: c.id });
    }
  };
  /** Explicit click on one version: converts its image slot to an AI image for THAT layout, then one paid request. */
  const usarIA = (c: CandidatoRedesign) => {
    if (ia.fase === "a_gerar") { toast.info("Aguarda a imagem IA em curso."); return; }
    const conv = converterParaIA(c, pacote, sistema);
    setRes((r) => r && { ...r, candidatos: r.candidatos.map((x) => (x.id === c.id ? conv : x)) });
    setSel(conv);
    void pedirIA(conv);
  };
  // Redesign itself is always free; AI is only requested by an explicit click on a version.
  const gerar = (r: number) => {
    setRonda(r);
    setSel(null);
    setIa({ fase: "idle" });
    setRes(redesenharPagina({ pacote, sistema, variante, indice, m: medidor, modo, imagens: fonte === "ia" ? "auto" : fonte, ronda: r, incluirIA: comIA }));
  };
  const fechar = () => { setRes(null); setSel(null); setIa({ fase: "idle" }); onFechar(); };
  // Local package/images: the AI asset (and the structural placeholder) live here until "Aplicar".
  const base = useMemo(() => ({ ...pacote, assets: { ...pacote.assets, ...assetsIA } }), [pacote, assetsIA]);
  const imgsVista = useMemo(() => ({ ...imagens, ...imgsIA }), [imagens, imgsIA]);
  const comPendente = (c: CandidatoRedesign) => c.pendente ? aplicarCandidato({ ...base, assets: { ...base.assets, [ASSET_IA_PENDENTE]: { id: ASSET_IA_PENDENTE, mime: "image/png", largura: 1080, altura: 1350, dados: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNgYGD4DwABBAEAwS2OUAAAAABJRU5ErkJggg==" } } }, variante, indice, c) : aplicarCandidato(base, variante, indice, c);
  const vista = useMemo(() => (sel ? comPendente(sel) : pacote), [sel, base, pacote, variante, indice]); // eslint-disable-line react-hooks/exhaustive-deps
  // Only assets actually used by the applied page are added to the document.
  const aplicar = (c: CandidatoRedesign) => {
    const p = aplicarCandidato(base, variante, indice, c);
    const usados = new Set(p.variantes[variante].paginas[indice].camadas.flatMap((l) => (l.tipo === "imagem" ? [l.asset_id] : [])));
    const assets = Object.fromEntries(Object.entries(p.assets).filter(([k]) => k in pacote.assets || usados.has(k)));
    onAplicar({ ...p, assets }, c);
    fechar();
  };
  const [imgsPendente, setImgsPendente] = useState<Imagens>({});
  useEffect(() => {
    void carregarImagens({ ...pacote, assets: { [ASSET_IA_PENDENTE]: { id: ASSET_IA_PENDENTE, mime: "image/png", largura: 1080, altura: 1350, dados: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNgYGD4DwABBAEAwS2OUAAAAABJRU5ErkJggg==" } } }).then(setImgsPendente).catch(() => undefined);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const imgsTodas = useMemo(() => ({ ...imgsVista, ...imgsPendente }), [imgsVista, imgsPendente]);
  const podeIA = !!projectId && !kieIndisponivel && fonte !== "sem_novas" && !imagemInadequada(papel);
  const ficha = (c: CandidatoRedesign) => {
    const comp = (c.pagina.composicao ?? {}) as ComposicaoImagem;
    const temImg = aceitaImagemIA(c);
    const origem = c.requiresAiImage ? "Imagem IA" : temImg ? "Imagem atual" : "Sem imagem";
    return [temImg ? NOME_MODO[comp.modo ?? ""] ?? "Com imagem" : "Só tipografia", comp.regiao ? NOME_REGIAO[comp.regiao] : "", origem].filter(Boolean).join(" · ");
  };
  const cartao = (p: PacoteProva, rotulo: string, ativo: boolean, onClick: () => void, c?: CandidatoRedesign) => {
    const aGerar = c && ia.fase === "a_gerar" && ia.alvo === c.id;
    const erro = c && ia.fase === "erro" && ia.alvo === c.id ? ia.msg : null;
    return (
      <div key={c?.id ?? "orig"} className={`flex flex-col gap-1.5 rounded-lg border p-2 transition-colors ${ativo ? "border-primary ring-1 ring-primary" : "border-border hover:border-muted-foreground"}`}>
        <button type="button" onClick={onClick} className="relative block overflow-hidden rounded-md text-left" aria-label={rotulo}>
          <PaginaCanvas pacote={p} variante={variante} indice={indice} medidor={medidor} imagens={imgsTodas} escala={0.17} />
          {c?.requiresAiImage && <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-sm bg-background/90 px-1.5 py-0.5 text-[10px] font-medium text-foreground shadow-sm">
            {aGerar ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 text-primary" />}Imagem IA</span>}
        </button>
        <span className="text-xs font-medium leading-tight">{rotulo}</span>
        {c && <span className="text-[11px] leading-tight text-muted-foreground">{ficha(c)}</span>}
        {c && <span className="text-[11px] leading-tight text-muted-foreground">{c.reason}</span>}
        {c && aceitaImagemIA(c) && podeIA && (c.pendente || !c.requiresAiImage) && !aGerar && (
          <Button variant="outline" size="sm" className="mt-auto h-8 text-xs" onClick={() => usarIA(c)} title="Gera uma imagem por IA pensada para este enquadramento. Clicar autoriza este único pedido pago.">
            <Sparkles className="mr-1 h-3.5 w-3.5" />Usar imagem IA · {rotuloCusto("imagem_ia")}
          </Button>
        )}
        {aGerar && <span className="text-[11px] text-muted-foreground" role="status">A gerar imagem IA…</span>}
        {erro && <span className="text-[11px] leading-tight text-destructive" role="alert">{erro}</span>}
      </div>
    );
  };

  return (
    <Dialog open={aberto} onOpenChange={(o) => { if (!o) fechar(); }}>
      <DialogContent className="max-h-[94vh] w-[96vw] max-w-[1400px] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Redesenhar este slide</DialogTitle>
          <DialogDescription>Mantém o conteúdo e cria 5 composições alternativas. Redesenhar não tem custo; a imagem IA só é pedida quando clicas em «Usar imagem IA» numa versão.</DialogDescription>
        </DialogHeader>
        {!res ? (
          <div className="space-y-3">
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground"><ChevronDown className="h-3.5 w-3.5" />Opções avançadas</CollapsibleTrigger>
              <CollapsibleContent className="grid gap-4 pt-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-xs font-medium">Direção</p>
                  <RadioGroup value={modo} onValueChange={(v) => setModo(v as typeof modo)}>
                    <div className="flex items-center gap-2"><RadioGroupItem id="rd-manter" value="manter" /><Label htmlFor="rd-manter" className="text-sm font-normal">Manter direção visual atual</Label></div>
                    <div className="flex items-center gap-2"><RadioGroupItem id="rd-explorar" value="explorar" /><Label htmlFor="rd-explorar" className="text-sm font-normal">Explorar livremente</Label></div>
                  </RadioGroup>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium">Imagens</p>
                  <RadioGroup value={fonte} onValueChange={(v) => setFonte(v as typeof fonte)}>
                    <div className="flex items-center gap-2"><RadioGroupItem id="ri-auto" value="auto" /><Label htmlFor="ri-auto" className="text-sm font-normal">Automático (imagens já existentes)</Label></div>
                    <div className="flex items-center gap-2"><RadioGroupItem id="ri-sem" value="sem_novas" /><Label htmlFor="ri-sem" className="text-sm font-normal">Sem novas imagens</Label></div>
                  </RadioGroup>
                </div>
              </CollapsibleContent>
            </Collapsible>
            <p className="text-xs text-muted-foreground">O texto, os números e o papel da página não mudam. Nenhum pedido pago é feito ao gerar as propostas.</p>
            <Button onClick={() => gerar(0)}><Sparkles className="mr-1.5 h-4 w-4" />Gerar 5 propostas · sem custo</Button>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[auto_1fr]">
            <div className="space-y-2 lg:sticky lg:top-0 lg:self-start">
              <PaginaCanvas pacote={vista} variante={variante} indice={indice} medidor={medidor} imagens={imgsTodas} escala={0.36} />
              {sel ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">{ficha(sel)}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button disabled={!!sel.pendente} onClick={() => aplicar(sel)}>{sel.pendente ? "À espera da imagem IA" : "Aplicar esta versão"}</Button>
                    {sel.requiresAiImage && !sel.pendente && ia.fase !== "a_gerar" && podeIA && (
                      <Button variant="outline" onClick={() => void pedirIA(sel)}><RefreshCw className="mr-1.5 h-4 w-4" />Regenerar imagem IA · {rotuloCusto("imagem_ia")}</Button>
                    )}
                    <Button variant="ghost" onClick={() => setSel(null)}>Ver original</Button>
                  </div>
                </div>
              ) : <p className="text-xs text-muted-foreground">Original. Escolhe uma versão para a ver em grande.</p>}
            </div>
            <div className="space-y-3">
              {kieIndisponivel && <p className="text-xs text-destructive" role="alert">Serviço de imagens IA indisponível neste momento (chave do servidor recusada). As propostas continuam disponíveis; nada foi cobrado.</p>}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                {cartao(pacote, "Original", !sel, () => setSel(null))}
                {res.candidatos.map((c, i) => cartao(comPendente(c), `Versão ${i + 1} · ${c.label}`, sel?.id === c.id, () => setSel(c), c))}
              </div>
              {res.aviso && <p className="text-xs text-muted-foreground" role="status">{res.aviso}</p>}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { if (ia.fase === "a_gerar") { toast.info("Aguarda a imagem IA em curso."); return; } gerar(ronda + 1); }}>Gerar mais 5 · sem custo</Button>
                <Button variant="ghost" size="sm" onClick={fechar}>Cancelar</Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
