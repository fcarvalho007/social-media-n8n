import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
const NOME_FONTE: Record<string, string> = { none: "sem imagem", renderer: "desenho do sistema", pexels: "Pexels", biblioteca: "Biblioteca", ia: "IA" };

const OVERLAYS: Array<{ id: TipoOverlay; nome: string }> = [{ id: "none", nome: "Nenhum" }, { id: "gradient", nome: "Gradiente" }, { id: "vignette", nome: "Vinheta" }, { id: "glass", nome: "Glass" }];
const sel = "h-10 w-full rounded-[var(--mc-r-md)] border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

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
  return (
    <div className="space-y-3 rounded-[var(--mc-r-md)] border border-border p-3 text-sm">
      <button type="button" className="flex min-h-10 w-full items-center justify-between text-left font-medium" aria-expanded={aberto} onClick={() => setAberto((a) => !a)}>
        <span>Imagem</span><span className="text-muted-foreground">{aberto ? "−" : "+"}</span>
      </button>
      {decisao && <p className="text-xs text-muted-foreground">{nome(PAPEIS, decisao.papel)} · {nome(MODOS, decisao.modo)}{decisao.modo !== "none" ? ` · texto ${nome(REGIOES, decisao.regiao).toLowerCase()}` : ""}. <span className="italic">{decisao.razao}</span></p>}
      {aberto && (
        <div className="space-y-3">
          {sugestao && <p className="text-xs text-muted-foreground" role="note">Automático: {sugestao.precisa ? "usar imagem" : "sem fotografia"} · sugestão {sugestao.fontes.map((f) => NOME_FONTE[f]).join(" ou ")}. {sugestao.razao}{queryPexels ? ` Termos Pexels: «${queryPexels}».` : ""}</p>}
          {onSubstituir && <Button variant="outline" className="h-10 w-full" disabled={ocupado} onClick={onSubstituir}>{temImagem ? "Trocar imagem" : "Escolher imagem"} · Biblioteca, Pexels, Envio ou IA</Button>}
          <div className="space-y-1"><Label htmlFor="pi-modo">Modo</Label>
            <select id="pi-modo" className={sel} disabled={ocupado || !temImagem} value={comp.modo ?? ""} onChange={(e) => mudar("modo", e.target.value, "Modo da imagem alterado")}>
              <option value="">Automático</option>
              {MODOS.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
            {!temImagem && <p className="text-xs text-muted-foreground">Sem imagem neste slide: a composição é gráfica.</p>}</div>
          {temImagem && <>
            <div className="space-y-1"><Label htmlFor="pi-regiao">Posição do texto</Label>
              <select id="pi-regiao" className={sel} disabled={ocupado} value={comp.regiao ?? ""} onChange={(e) => mudar("regiao", e.target.value, "Posição do texto alterada")}>
                <option value="">Automático</option>
                {REGIOES.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select></div>
            <div className="space-y-1"><Label htmlFor="pi-ov">Overlay</Label>
              <select id="pi-ov" className={sel} disabled={ocupado} value={comp.overlay ?? ""} onChange={(e) => mudar("overlay", e.target.value, "Overlay alterado")}>
                <option value="">Automático</option>
                {OVERLAYS.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select></div>
            <div className="space-y-2"><Label>Intensidade do overlay · {Math.round(int * 100)}%</Label>
              <Slider min={0} max={100} step={5} value={[Math.round(int * 100)]} disabled={ocupado} onValueChange={([v]) => setInt(v / 100)} onValueCommit={([v]) => mudar("intensidade", v / 100, "Intensidade alterada")} aria-label="Intensidade do overlay" /></div>
            <div className="space-y-2"><Label>Enquadramento (ponto de foco)</Label>
              <Slider min={0} max={100} step={5} value={[Math.round(foco.x * 100)]} disabled={ocupado} onValueChange={([v]) => setFoco((f) => ({ ...f, x: v / 100 }))} onValueCommit={([v]) => mudar("foco", { ...foco, x: v / 100 }, "Enquadramento alterado")} aria-label="Foco horizontal" />
              <Slider min={0} max={100} step={5} value={[Math.round(foco.y * 100)]} disabled={ocupado} onValueChange={([v]) => setFoco((f) => ({ ...f, y: v / 100 }))} onValueCommit={([v]) => mudar("foco", { ...foco, y: v / 100 }, "Enquadramento alterado")} aria-label="Foco vertical" />
              <p className="text-xs text-muted-foreground">Horizontal e vertical. Só muda o recorte, nunca a imagem.</p></div>
          </>}
          {onGerarIA && (
            <details className="space-y-2 rounded-[var(--mc-r-md)] border border-border p-2">
              <summary className="flex min-h-10 cursor-pointer items-center text-sm font-medium">{origemIA ? "Regenerar com IA" : "Gerar com IA"}</summary>
              <Label htmlFor="pi-prompt" className="text-xs text-muted-foreground">Prompt criado a partir do slide, do estilo e da posição do texto (editável)</Label>
              <Textarea id="pi-prompt" rows={6} maxLength={2000} value={prompt} disabled={ocupado} onChange={(e) => setPrompt(e.target.value)} />
              <Button variant="outline" className="h-10 w-full" disabled={ocupado || prompt.trim().length < 5} onClick={() => onGerarIA(prompt)}>Continuar para gerar · pede confirmação de pedido pago</Button>
              <p className="text-xs text-muted-foreground">Nada é gerado sem confirmares. O resultado entra como qualquer outra imagem; texto, modo e efeitos mantêm-se.</p>
            </details>
          )}
          {Object.keys(comp).length > 0 && <Button variant="ghost" className="h-10 w-full" disabled={ocupado} onClick={() => onMudar({}, "Imagem deste slide em automático")}>Voltar ao automático</Button>}
        </div>
      )}
    </div>
  );
}
