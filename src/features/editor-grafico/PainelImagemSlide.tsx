import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronDown, HelpCircle, Library, Search, Sparkles, Upload } from "lucide-react";
import { custoDe, formatarCusto } from "@/features/motor/custosIa";
import type { inferirFonte } from "../../../supabase/functions/_shared/motor/promptVisual";
import { MODOS, PAPEIS, REGIOES, type ComposicaoImagem, type DecisaoImagem, type TipoOverlay } from "../../../supabase/functions/_shared/motor/imagem";

interface Props {
  decisao: DecisaoImagem | null;
  comp: ComposicaoImagem;
  temImagem: boolean;
  ocupado: boolean;
  onMudar: (c: ComposicaoImagem, msg: string) => void;
  onSubstituir?: () => void;
  /** Deterministic recommendation: whether the slide needs a photo and which sources fit. */
  sugestao?: ReturnType<typeof inferirFonte>;
  /** Auto-built AI prompt and stock terms, from the same visual intent. */
  promptIA?: string;
  queryPexels?: string;
  /** Opens the AI generator with this prompt; generation still needs explicit paid confirmation there. */
  onGerarIA?: (prompt: string) => void;
  origemIA?: boolean;
}
const NOME_FONTE: Record<string, string> = { none: "sem imagem", renderer: "desenho do sistema", pexels: "Pexels/Unsplash", biblioteca: "Biblioteca", ia: "IA" };

const OVERLAYS: Array<{ id: TipoOverlay; nome: string }> = [{ id: "none", nome: "Nenhum" }, { id: "gradient", nome: "Gradiente" }, { id: "vignette", nome: "Vinheta" }, { id: "glass", nome: "Glass" }];
const sel = "h-9 w-full rounded-[var(--mc-r-md)] border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Per-slide image composition. Every field starts on "Automático"; a change becomes an explicit override. */
export function PainelImagemSlide({ decisao, comp, temImagem, ocupado, onMudar, onSubstituir, sugestao, promptIA, queryPexels, onGerarIA, origemIA }: Props) {
  const [prompt, setPrompt] = useState(comp.visual_prompt ?? promptIA ?? "");
  const [aberto, setAberto] = useState(true);
  const [foco, setFoco] = useState(comp.foco ?? decisao?.foco ?? { x: 0.5, y: 0.4 });
  const [int, setInt] = useState(comp.intensidade ?? decisao?.intensidade ?? 0.85);
  const nome = <T extends string>(l: ReadonlyArray<{ id: T; nome: string }>, id?: T) => l.find((x) => x.id === id)?.nome ?? "—";
  const mudar = (k: keyof ComposicaoImagem, v: unknown, msg: string) => {
    const n: ComposicaoImagem = { ...comp };
    if (v === "" || v === undefined) delete n[k]; else (n as Record<string, unknown>)[k] = v;
    onMudar(n, msg);
  };
  const [iaAberta, setIaAberta] = useState(false);
  const resumo = decisao ? `${nome(PAPEIS, decisao.papel)} · ${nome(MODOS, decisao.modo)}${decisao.modo !== "none" ? ` · texto ${nome(REGIOES, decisao.regiao).toLowerCase()}` : ""}` : null;
  const ajuda = [decisao?.razao, sugestao?.razao].filter(Boolean).join(" ");
  const FONTES = [{ id: "biblioteca", nome: "Biblioteca", Icone: Library }, { id: "fotos", nome: "Fotos", Icone: Search }, { id: "carregar", nome: "Carregar", Icone: Upload }] as const;
  return (
    <section className="space-y-3 border-t border-border pt-4 text-sm">
      <button type="button" className="flex min-h-9 w-full items-center justify-between text-left" aria-expanded={aberto} onClick={() => setAberto((a) => !a)}>
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Imagem</span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${aberto ? "rotate-180" : ""}`} />
      </button>
      {aberto && (
        <div className="space-y-3">
          {resumo && (
            <div className="flex items-start gap-2 rounded-[var(--mc-r-md)] bg-muted/50 px-2.5 py-2">
              <p className="min-w-0 flex-1 text-xs leading-snug"><span className="font-medium">{resumo}</span>{sugestao && <span className="block text-muted-foreground">Sugestão: {sugestao.precisa ? sugestao.fontes.map((f) => NOME_FONTE[f]).join(" ou ") : "sem fotografia"}</span>}</p>
              {ajuda && <Tooltip><TooltipTrigger asChild><button type="button" className="shrink-0 text-muted-foreground hover:text-foreground" aria-label="Porquê?"><HelpCircle className="h-4 w-4" /></button></TooltipTrigger>
                <TooltipContent side="left" className="max-w-xs text-xs">{ajuda}{queryPexels ? ` Termos de pesquisa: «${queryPexels}».` : ""}</TooltipContent></Tooltip>}
            </div>
          )}
          {(onSubstituir || onGerarIA) && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">{temImagem ? "Trocar imagem" : "Escolher imagem"}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {onSubstituir && FONTES.map(({ id, nome: n, Icone }) => (
                  <Button key={id} variant="outline" size="sm" className="h-9 justify-start gap-1.5 px-2 text-xs" disabled={ocupado} onClick={() => onSubstituir(id)}><Icone className="h-3.5 w-3.5" />{n}</Button>
                ))}
                {onGerarIA && <Button variant={iaAberta ? "secondary" : "outline"} size="sm" className="h-9 justify-start gap-1.5 px-2 text-xs" disabled={ocupado} aria-expanded={iaAberta} onClick={() => setIaAberta((v) => !v)}><Sparkles className="h-3.5 w-3.5" />{origemIA ? "Regenerar IA" : "Gerar IA"}</Button>}
              </div>
            </div>
          )}
          {onGerarIA && iaAberta && (
            <div className="space-y-2 rounded-[var(--mc-r-md)] border border-border p-2">
              <Label htmlFor="pi-prompt" className="text-xs text-muted-foreground">Descrição da imagem (editável)</Label>
              <Textarea id="pi-prompt" rows={5} maxLength={2000} value={prompt} disabled={ocupado} onChange={(e) => setPrompt(e.target.value)} className="text-xs" />
              <Button className="h-9 w-full text-xs" disabled={ocupado || prompt.trim().length < 5} onClick={() => { if (prompt.trim() !== (comp.visual_prompt ?? "")) mudar("visual_prompt", prompt.trim(), "Descrição da imagem IA guardada"); onGerarIA(prompt); }}>Continuar · {formatarCusto(custoDe("imagem_ia")?.euros ?? null)} por imagem</Button>
              <p className="text-[11px] text-muted-foreground">Pede confirmação antes de gerar. Texto, modo e efeitos mantêm-se.</p>
            </div>
          )}
          <div className="space-y-1"><Label htmlFor="pi-modo" className="text-xs text-muted-foreground">Modo</Label>
            <select id="pi-modo" className={sel} disabled={ocupado || !temImagem} value={comp.modo ?? ""} onChange={(e) => mudar("modo", e.target.value, "Modo da imagem alterado")}>
              <option value="">Automático</option>
              {MODOS.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
            </div>
          {temImagem && <>
            <div className="space-y-1"><Label htmlFor="pi-regiao" className="text-xs text-muted-foreground">Posição do texto</Label>
              <select id="pi-regiao" className={sel} disabled={ocupado} value={comp.regiao ?? ""} onChange={(e) => mudar("regiao", e.target.value, "Posição do texto alterada")}>
                <option value="">Automático</option>
                {REGIOES.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select></div>
            <div className="space-y-1"><Label htmlFor="pi-ov" className="text-xs text-muted-foreground">Overlay</Label>
              <select id="pi-ov" className={sel} disabled={ocupado} value={comp.overlay ?? ""} onChange={(e) => mudar("overlay", e.target.value, "Overlay alterado")}>
                <option value="">Automático</option>
                {OVERLAYS.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select></div>
            <div className="space-y-2"><Label>Intensidade do overlay · {Math.round(int * 100)}%</Label>
              <Slider min={0} max={100} step={5} value={[Math.round(int * 100)]} disabled={ocupado} onValueChange={([v]) => setInt(v / 100)} onValueCommit={([v]) => mudar("intensidade", v / 100, "Intensidade alterada")} aria-label="Intensidade do overlay" /></div>
            <div className="space-y-2"><Label>Enquadramento (ponto de foco)</Label>
              <Slider min={0} max={100} step={5} value={[Math.round(foco.x * 100)]} disabled={ocupado} onValueChange={([v]) => setFoco((f) => ({ ...f, x: v / 100 }))} onValueCommit={([v]) => mudar("foco", { ...foco, x: v / 100 }, "Enquadramento alterado")} aria-label="Foco horizontal" />
              <Slider min={0} max={100} step={5} value={[Math.round(foco.y * 100)]} disabled={ocupado} onValueChange={([v]) => setFoco((f) => ({ ...f, y: v / 100 }))} onValueCommit={([v]) => mudar("foco", { ...foco, y: v / 100 }, "Enquadramento alterado")} aria-label="Foco vertical" />
              </div>
          </>}
          {Object.keys(comp).length > 0 && <Button variant="ghost" size="sm" className="h-8 w-full text-xs" disabled={ocupado} onClick={() => onMudar({}, "Imagem deste slide em automático")}>Voltar ao automático</Button>}
        </div>
      )}
    </section>
  );
}
