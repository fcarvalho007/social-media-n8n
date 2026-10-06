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
import { ASSET_IA_PENDENTE, aplicarCandidato, imagemInadequada, redesenharPagina, substituirImagemIA, type CandidatoRedesign } from "../../../supabase/functions/_shared/motor/redesenhar";
import { PaginaCanvas } from "./PaginaCanvas";

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

type EstadoIA = { fase: "idle" } | { fase: "a_gerar"; tarefa: string } | { fase: "erro"; msg: string } | { fase: "pronta" };

/** Composition exploration for one page. Nothing touches the document until "Aplicar esta versão". */
export function PainelRedesenhar({ aberto, onFechar, pacote, sistema, variante, indice, medidor, imagens, onAplicar, onGerarIA, projectId }: Props) {
  const [modo, setModo] = useState<"manter" | "explorar">("manter");
  const [fonte, setFonte] = useState<"auto" | "sem_novas" | "ia">("auto");
  const [ronda, setRonda] = useState(0);
  const [res, setRes] = useState<ReturnType<typeof redesenharPagina> | null>(null);
  const [sel, setSel] = useState<CandidatoRedesign | null>(null);
  const [assetsIA, setAssetsIA] = useState<PacoteProva["assets"]>({});
  const [imgsIA, setImgsIA] = useState<Imagens>({});
  const [ia, setIa] = useState<EstadoIA>({ fase: "idle" });
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
      try { e = await kieEstado(projectId, tarefa); } catch (err) { setIa({ fase: "erro", msg: (err as Error).message }); return; }
      if (e.estado === "concluida" && e.asset_id) {
        const { assets } = await lerAssets(projectId, [e.asset_id]);
        const imgs = await carregarImagens({ ...pacote, assets });
        if (!vivo.current) return;
        setAssetsIA((x) => ({ ...x, ...assets }));
        setImgsIA((x) => ({ ...x, ...imgs }));
        const id = e.asset_id;
        setRes((r) => r && { ...r, candidatos: r.candidatos.map((c) => (c.id === alvoId ? substituirImagemIA(c, id, { modelo, prompt }) : c)) });
        setSel((s) => (s?.id === alvoId ? substituirImagemIA(s, id, { modelo, prompt }) : s));
        setIa({ fase: "pronta" });
        return;
      }
      if (e.estado === "falhou" || e.estado === "desconhecido") {
        setIa({ fase: "erro", msg: e.estado === "desconhecido" ? "Resultado desconhecido na Kie; o pedido não foi repetido." : e.erro ?? "A geração falhou." });
        return;
      }
    }
    if (vivo.current) setIa({ fase: "erro", msg: "A imagem ainda não chegou. O pedido continua reservado e não foi repetido." });
  };
  /** One paid request per explicit click: initial redesign or "Regenerar imagem IA". */
  const pedirIA = async (c: CandidatoRedesign) => {
    if (!projectId || !c.promptIA) return;
    setIa({ fase: "a_gerar", tarefa: "" });
    try {
      const r = await kieGerar(projectId, c.promptIA) as { tarefa: string; estado: string; modelo?: string };
      setIa({ fase: "a_gerar", tarefa: r.tarefa });
      void acompanhar(r.tarefa, c.id, c.promptIA, r.modelo);
    } catch (err) { setIa({ fase: "erro", msg: (err as Error).message }); }
  };
  const gerar = (r: number, autorizarIA: boolean) => {
    setRonda(r);
    setSel(null);
    setIa({ fase: "idle" });
    const out = redesenharPagina({ pacote, sistema, variante, indice, m: medidor, modo, imagens: fonte === "ia" ? "auto" : fonte, ronda: r, incluirIA: comIA && autorizarIA });
    setRes(out);
    const alvo = out.candidatos.find((c) => c.requiresAiImage);
    if (alvo) void pedirIA(alvo);
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
  const iaCand = res?.candidatos.find((c) => c.requiresAiImage);
  const mini = (p: PacoteProva, rotulo: string, ativo: boolean, onClick: () => void, sub?: string, selo?: React.ReactNode) => (
    <button type="button" onClick={onClick} className={`relative space-y-1 rounded-md border p-1 text-left transition-colors ${ativo ? "border-primary" : "border-border hover:border-muted-foreground"}`}>
      <PaginaCanvas pacote={p} variante={variante} indice={indice} medidor={medidor} imagens={imgsTodas} escala={0.12} />
      {selo}
      <span className="block text-xs font-medium">{rotulo}</span>
      {sub && <span className="block text-[11px] leading-tight text-muted-foreground">{sub}</span>}
    </button>
  );

  return (
    <Dialog open={aberto} onOpenChange={(o) => { if (!o) fechar(); }}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Redesenhar este slide</DialogTitle>
          <DialogDescription>Mantém o conteúdo e cria 5 composições gráficas alternativas.</DialogDescription>
        </DialogHeader>
        {!res ? (
          <div className="space-y-3">
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground"><ChevronDown className="h-3.5 w-3.5" />Opções avançadas</CollapsibleTrigger>
              <CollapsibleContent className="grid gap-4 pt-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-xs font-medium">Direção</p>
                  <RadioGroup value={modo} onValueChange={(v) => setModo(v as typeof modo)}>
                    <div className="flex items-center gap-2"><RadioGroupItem id="rd-manter" value="manter" /><Label htmlFor="rd-manter" className="text-sm font-normal">Manter direção visual actual</Label></div>
                    <div className="flex items-center gap-2"><RadioGroupItem id="rd-explorar" value="explorar" /><Label htmlFor="rd-explorar" className="text-sm font-normal">Explorar livremente</Label></div>
                  </RadioGroup>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium">Imagens</p>
                  <RadioGroup value={fonte} onValueChange={(v) => setFonte(v as typeof fonte)}>
                    <div className="flex items-center gap-2"><RadioGroupItem id="ri-auto" value="auto" /><Label htmlFor="ri-auto" className="text-sm font-normal">Automático</Label></div>
                    <div className="flex items-center gap-2"><RadioGroupItem id="ri-sem" value="sem_novas" /><Label htmlFor="ri-sem" className="text-sm font-normal">Sem novas imagens</Label></div>
                    <div className="flex items-center gap-2"><RadioGroupItem id="ri-ia" value="ia" /><Label htmlFor="ri-ia" className="text-sm font-normal">Permitir imagem IA (pede confirmação de custo)</Label></div>
                  </RadioGroup>
                </div>
              </CollapsibleContent>
            </Collapsible>
            <p className="text-xs text-muted-foreground">O texto, os números e o papel da página não mudam.{comIA ? " Uma das propostas usa 1 imagem gerada por IA (modelo de baixo custo, conta para o limite diário do projeto); clicar autoriza esse único pedido." : " Nenhuma imagem paga é gerada."}</p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => gerar(0, true)}><Sparkles className="mr-1.5 h-4 w-4" />{comIA ? "Redesenhar 5 versões · inclui 1 imagem IA" : "Gerar 5 propostas"}</Button>
              {comIA && <Button variant="ghost" onClick={() => gerar(0, false)}>Sem imagem IA</Button>}
            </div>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
            <div className="space-y-2">
              <PaginaCanvas pacote={vista} variante={variante} indice={indice} medidor={medidor} imagens={imgsTodas} escala={0.3} />
              {sel ? (
                <div className="flex flex-wrap gap-2">
                  <Button disabled={!!sel.pendente} onClick={() => aplicar(sel)}>{sel.pendente ? "À espera da imagem IA" : "Aplicar esta versão"}</Button>
                  {sel.requiresAiImage && !sel.pendente && ia.fase !== "a_gerar" && (
                    <Button variant="outline" onClick={() => void pedirIA(sel)}><RefreshCw className="mr-1.5 h-4 w-4" />Regenerar imagem IA</Button>
                  )}
                  <Button variant="outline" onClick={() => setSel(null)}>Voltar às propostas</Button>
                </div>
              ) : <p className="text-xs text-muted-foreground">Original. Escolhe uma versão para a ver em grande.</p>}
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {mini(pacote, "Original", !sel, () => setSel(null))}
                {res.candidatos.map((c, i) => mini(comPendente(c), `Versão ${i + 1} · ${c.label}`, sel?.id === c.id, () => setSel(c), c.reason,
                  c.requiresAiImage ? <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-sm bg-background/90 px-1.5 py-0.5 text-[10px] font-medium text-foreground shadow-sm">
                    {c.pendente && ia.fase === "a_gerar" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 text-primary" />}Imagem IA</span> : undefined))}
              </div>
              {iaCand && ia.fase === "a_gerar" && <p className="text-xs text-muted-foreground" role="status">A gerar composição com IA… as outras versões já podem ser vistas.</p>}
              {iaCand && ia.fase === "erro" && <p className="text-xs text-destructive" role="alert">Imagem IA: {ia.msg}</p>}
              {res.aviso && <p className="text-xs text-muted-foreground" role="status">{res.aviso}</p>}
              {res.sugerirIA && fonte === "ia" && onGerarIA && (
                <p className="text-xs">Este slide beneficiaria de uma imagem própria. <button type="button" className="underline" onClick={() => { fechar(); onGerarIA(); }}>Gerar imagem IA</button> (pede confirmação de pedido pago).</p>
              )}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { if (ia.fase === "a_gerar") { toast.info("Aguarda a imagem IA em curso."); return; } gerar(ronda + 1, false); }}>Gerar mais 5</Button>
                <Button variant="ghost" size="sm" onClick={fechar}>Cancelar</Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
