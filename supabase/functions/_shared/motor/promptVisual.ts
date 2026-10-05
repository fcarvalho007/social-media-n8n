// Deterministic visual prompt / stock query builder (no AI). Pexels and AI start from the same intent;
// only the source differs, and the renderer never distinguishes them.
import type { ModoImagem, PapelVisual, RegiaoTexto } from "./imagem.ts";

export type FonteSugerida = "none" | "renderer" | "pexels" | "biblioteca" | "ia";

/** Decide first whether the slide needs a photo, then recommend sources (never triggers paid generation). */
export function inferirFonte(papel: PapelVisual): { precisa: boolean; fontes: FonteSugerida[]; razao: string } {
  switch (papel) {
    case "data": case "comparison": case "actions": case "transition":
      return { precisa: false, fontes: ["renderer"], razao: "Este papel lê-se melhor com números, formas e cartões desenhados do que com fotografia." };
    case "concept": return { precisa: false, fontes: ["renderer", "ia"], razao: "Conceitos funcionam com desenho gráfico; uma metáfora gerada por IA é alternativa." };
    case "case_study": return { precisa: true, fontes: ["pexels", "biblioteca"], razao: "Um caso real ganha com fotografia documental." };
    case "visual_story": return { precisa: true, fontes: ["pexels", "ia"], razao: "Slide de história visual: fotografia ou imagem gerada." };
    case "cover": return { precisa: true, fontes: ["pexels", "biblioteca", "ia"], razao: "A capa beneficia de uma imagem forte." };
    default: return { precisa: false, fontes: ["renderer", "pexels"], razao: "Imagem opcional; a grelha de texto chega." };
  }
}

const ESTILO_FOTO: Record<string, string> = {
  editorial: "restrained editorial photography, natural tones, print-magazine sensibility",
  contraste: "bold graphic photography, strong shadows, high but natural contrast",
  revista: "magazine cover photography, dramatic crop, polished lighting",
  fotografico: "cinematic photography, soft film grade, shallow depth of field",
  minimalista: "minimal photography, large calm empty areas, very few elements",
  didatico: "clear explanatory photography, uncluttered, friendly daylight",
};
const PALETA: Record<string, string> = {
  "navy-editorial": "deep navy and warm off-white tones", "navy-digital": "navy with cool electric-blue accents",
  "navy-signal": "navy with a single warm signal-orange accent", "navy-sage": "navy with muted sage green",
  "navy-ice": "navy with pale icy blues",
};
const COLOCACAO: Record<RegiaoTexto, string> = {
  left: "main subject on the right third; clean, uncluttered negative space on the left for text",
  right: "main subject on the left third; clean negative space on the right for text",
  bottom: "subject in the upper / upper-middle area; calm visual breathing room in the lower portion",
  top: "subject in the lower-middle area; calm negative space at the top",
  center: "subject softly framed around a calm central area that can hold text",
} as Record<RegiaoTexto, string>;
const SEM_TEXTO = "Absolutely no text, letters, numbers, logos, labels, signage, readable screens, dashboards, user interfaces or charts with text.";

export interface EntradaPrompt {
  titulo: string; texto?: string; intencao?: string; papel: PapelVisual;
  estilo: string; variante: "A" | "B"; paleta: string; modo: ModoImagem; regiao: RegiaoTexto;
}

export function construirPromptVisual(e: EntradaPrompt): string {
  const sujeito = (e.intencao?.trim() || `${e.titulo}${e.texto ? ` — ${e.texto.slice(0, 160)}` : ""}`).replace(/\s+/g, " ");
  const modo = e.modo === "hero" ? "Subject must stay legible within the upper third; the lower area fades smoothly into a plain background."
    : e.modo === "full_bleed" ? "Cinematic full-frame composition with a protected safe zone for text."
    : e.modo === "split" ? "Tight composition that works cropped into a half panel."
    : "Contained composition with a clear focal point.";
  return [
    `Subject and action: a scene that conveys "${sujeito}".`,
    "Setting: realistic, contemporary, professional environment.",
    `Camera angle: ${e.papel === "cover" ? "eye level, slightly wide" : "eye level, medium shot"}.`,
    `Lighting: ${e.estilo === "fotografico" ? "soft directional cinematic light" : "soft natural light"}.`,
    "Depth of field: shallow, background gently blurred.",
    `Composition and subject placement: ${COLOCACAO[e.regiao] ?? COLOCACAO.bottom}. ${modo}`,
    `Colour palette: ${PALETA[e.paleta] ?? "navy-led palette"}.`,
    `Visual style: ${ESTILO_FOTO[e.estilo] ?? ESTILO_FOTO.editorial}${e.variante === "B" ? ", more asymmetric and bolder crop" : ""}.`,
    "Format: 1080x1350 portrait composition (4:5).",
    SEM_TEXTO,
  ].join("\n");
}

const PARAR = new Set(["de", "da", "do", "das", "dos", "a", "o", "as", "os", "e", "em", "um", "uma", "para", "com", "que", "na", "no", "por", "se", "não", "é"]);
/** Search terms for stock photos from the same intent (editable by the user). */
export function construirQueryVisual(intencao: string | undefined, titulo: string): string {
  const base = (intencao?.trim() || titulo).toLowerCase().replace(/[^\p{L}\s-]/gu, " ");
  return base.split(/\s+/).filter((p) => p.length > 2 && !PARAR.has(p)).slice(0, 6).join(" ");
}
