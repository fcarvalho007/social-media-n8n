// Visual system = Style (layout/typography) + Variant (A/B composition of that style) + Palette (colours only).
// Pure and shared: Design previews, Composition and tests call the SAME aplicarSistema, so preview = result.
// Text is never changed; a page that does not fit keeps its normal composition (break) or stays as it was.
import { ALTURA, LARGURA, type Camada, type Medidor, type PacoteProva, type Pagina, type Variante } from "../documento-grafico/nucleo.ts";
import { ESTILOS, type EstiloId, type Paleta } from "./estilos.ts";
import { comporModelo } from "./modelos.ts";

export type PaletaId = "navy-editorial" | "navy-digital" | "navy-signal" | "navy-sage" | "navy-ice";
export interface PaletaMarca { id: PaletaId; nome: string; sensacao: string; amostras: [string, string, string, string, string]; cores: Paleta }
/** Technical colours available to the engine, not presented as part of the palettes. */
export const BRANCO = "#FFFFFF", PRETO = "#111111";

const pal = (navy: string, fundo: string, acento: string, secundaria: string, grafite = "#20252B"): Paleta =>
  ({ fundo, fundoCapa: navy, titulo: navy, texto: grafite, destaque: acento, discreto: "#5F6B76", ...(secundaria ? {} : {}) });

export const PALETAS: readonly PaletaMarca[] = [
  { id: "navy-editorial", nome: "Navy Editorial", sensacao: "Autoridade / premium", amostras: ["#0B1F33", "#F4F1EA", "#20252B", "#89939B", "#C6A15B"], cores: pal("#0B1F33", "#F4F1EA", "#C6A15B", "#89939B") },
  { id: "navy-digital", nome: "Navy Digital", sensacao: "Tecnologia / IA", amostras: ["#0B1F33", "#F5F8FB", "#3578E5", "#B8D4F0", "#20252B"], cores: pal("#0B1F33", "#F5F8FB", "#3578E5", "#B8D4F0") },
  { id: "navy-signal", nome: "Navy Signal", sensacao: "Conteúdo forte / opinião", amostras: ["#0B1F33", "#F5F2ED", "#E4573D", "#D9D2C8", "#20252B"], cores: pal("#0B1F33", "#F5F2ED", "#E4573D", "#D9D2C8") },
  { id: "navy-sage", nome: "Navy Sage", sensacao: "Sofisticação / calma", amostras: ["#0B1F33", "#F1F3EF", "#708779", "#C8D0C8", "#20252B"], cores: pal("#0B1F33", "#F1F3EF", "#708779", "#C8D0C8") },
  { id: "navy-ice", nome: "Navy Ice", sensacao: "Dados / investigação", amostras: ["#10283F", "#EEF3F6", "#6FA6B8", "#AAB8C2", "#20252B"], cores: pal("#10283F", "#EEF3F6", "#6FA6B8", "#AAB8C2") },
];
export const obterPaleta = (id: unknown) => PALETAS.find((p) => p.id === id) ?? PALETAS[0];

/** Slide number (1-based) → break on/off. */
export type Quebras = Record<string, boolean>;
export interface SistemaVisual { estilo: EstiloId; variante: Variante; paleta: PaletaId; quebras: Quebras }

/** Default rhythm: breaks on slides 3, 5 and the last (8 in an 8-slide carousel); never on the cover. */
export function quebrasPadrao(total: number): Quebras {
  const q: Quebras = {};
  for (const n of [3, 5, Math.max(total, 1)]) if (n > 1 && n <= total) q[String(n)] = true;
  return q;
}
/** Slides that can carry a break toggle for this carousel size. */
export const slidesQuebra = (total: number) => Object.keys(quebrasPadrao(total)).map(Number).sort((a, b) => a - b);

export const sistemaPadrao = (total: number, estilo: EstiloId = "editorial"): SistemaVisual =>
  ({ estilo, variante: "A", paleta: "navy-editorial", quebras: quebrasPadrao(total) });

const texto = (c: Camada) => c.tipo === "texto" && !!c.ref;
/**
 * Variant B of every style: the contemporary/asymmetric reading of the same composition — the page is
 * mirrored horizontally and, where the title is not sitting on a panel, the text block is anchored low,
 * opening negative space above. Sizes are untouched, so whatever fitted in A fits in B.
 */
export function composicaoB(p: Pagina): Pagina {
  let camadas = p.camadas.map((c) => (c.w >= LARGURA - 1 ? c : { ...c, x: Math.round(LARGURA - c.x - c.w) }));
  const ts = camadas.filter(texto);
  const titulo = ts.find((c) => c.tipo === "texto" && c.ref?.endsWith(".titulo"));
  const sobrePainel = titulo && camadas.some((d) => d.tipo === "forma" && d.id.startsWith("mod-") && d.w < LARGURA && d.h > 120 && d.z < titulo.z
    && d.x <= titulo.x && d.x + d.w >= titulo.x + 20 && d.y <= titulo.y && d.y + d.h >= titulo.y + 20);
  const temImagem = camadas.some((c) => c.tipo === "imagem" && c.h < ALTURA);
  if (ts.length && !sobrePainel && !temImagem) {
    const topo = Math.min(...ts.map((c) => c.y)), base = Math.max(...ts.map((c) => c.y + c.h));
    const desl = Math.floor(1180 - base);
    if (desl > 40) {
      // Move text and the decorations attached to it (rules/marks next to the block); full-page shapes stay.
      camadas = camadas.map((c) => (texto(c) || (c.tipo === "forma" && c.id.startsWith("mod-") && c.h < 400 && c.y >= topo - 140 && c.y <= base + 60)
        ? { ...c, y: c.y + desl } : c));
    }
  }
  return { ...p, camadas };
}

export interface ResultadoSistema {
  pacote: PacoteProva;
  /** Pages left as they were because the style does not fit at the readable minimum. */
  recusadas: Array<{ variante: Variante; pagina: number }>;
  /** Break slides that did not fit with the break composition and use the normal one instead. */
  quebrasRecusadas: Array<{ variante: Variante; pagina: number }>;
  marcador: boolean;
}

/**
 * The single renderer of a visual system. Variant A's document gets the style's A composition and B's the
 * B composition; the palette only supplies colours; breaks follow `quebras`. `paginas` limits to indices.
 */
export function aplicarSistema(pacote: PacoteProva, s: SistemaVisual, m?: Medidor, paginas?: number[]): ResultadoSistema {
  const estilo = ESTILOS.find((e) => e.id === s.estilo) ?? ESTILOS[0];
  const paleta = obterPaleta(s.paleta).cores;
  const recusadas: ResultadoSistema["recusadas"] = [], quebrasRecusadas: ResultadoSistema["quebrasRecusadas"] = [];
  let marcador = false;
  const variantes = { ...pacote.variantes };
  for (const v of ["A", "B"] as const) {
    const doc = pacote.variantes[v];
    const total = doc.paginas.length;
    variantes[v] = { ...doc, paginas: doc.paginas.map((pg, i) => {
      if (paginas && !paginas.includes(i)) return pg;
      const ctx = { indice: i, total, paleta, par: estilo.par, conteudo: pacote.conteudo, assets: pacote.assets, m };
      const forte = i > 0 && !!s.quebras[String(i + 1)];
      let r = comporModelo(pg, s.estilo, { ...ctx, forte });
      if (forte && r && !r.cabe) { quebrasRecusadas.push({ variante: v, pagina: i }); r = comporModelo(pg, s.estilo, ctx); }
      if (!r) return pg;
      if (!r.cabe) { recusadas.push({ variante: v, pagina: i }); return pg; }
      marcador ||= r.marcador;
      return v === "B" ? composicaoB(r.pagina) : r.pagina;
    }) };
  }
  return { pacote: { ...pacote, variantes }, recusadas, quebrasRecusadas, marcador };
}
