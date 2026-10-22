// Visual criteria applied when a carousel is first composed (pure, no AI, no cost). Follows the
// carousel practices the owner adopted: cover hook inside the 1:1 grid-crop square, a slide-2 "second
// hook", an icon per slide function, a progress bar and a swipe arrow. Text, refs and order never change;
// a decoration is only added when it does not overlap any text layer. Layers use the "mod-" prefix so
// compositions rebuild them as model decorations.
import { ALTURA, LARGURA, type Camada, type CamadaForma, type IconeId, type Pagina } from "../documento-grafico/nucleo.ts";
import { contraste } from "./composicoes.ts";

/** Safe zones (document px). The profile grid crops 135 px top/bottom of the 4:5 cover. */
export const ZONA_SEGURA = { gradeTopo: 135, gradeBase: ALTURA - 135, base: ALTURA - 100, lateral: 40 } as const;

export interface SlideEnriquecer { id: string; papel: string; titulo: string; texto: string }

const NUMERO = /(\d+[.,]?\d*\s?(%|€|\$|mil|milhões|M\b|B\b))|(\b\d{3,}\b)/i;
const LISTA = /^\s*(\d+[.)]|[-•–])\s+/;

/** Icon chosen from the slide's function in the story (deterministic). */
export function iconeSlide(s: SlideEnriquecer, i: number, total: number): IconeId | null {
  if (s.papel === "capa" || i === 0) return null;
  if (s.papel === "fecho" || i === total - 1) return "check";
  if (NUMERO.test(`${s.titulo} ${s.texto}`)) return "grafico";
  if (s.texto.split("\n").filter((l) => LISTA.test(l)).length >= 2) return "check";
  if (i === 1) return "alvo";
  if (s.papel === "contexto") return "info";
  return "lampada";
}

const cruza = (a: Camada, b: { x: number; y: number; w: number; h: number }) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const livre = (p: Pagina, caixa: { x: number; y: number; w: number; h: number }) =>
  !p.camadas.some((c) => (c.tipo === "texto" || c.tipo === "imagem") && cruza(c, caixa));
const HEX = /^#[0-9a-f]{6}$/i;
const acento = (marca: string, fundo: string) => {
  if (HEX.test(marca) && HEX.test(fundo) && contraste(marca, fundo) >= 3) return marca;
  return HEX.test(fundo) && contraste("#ffffff", fundo) > contraste("#16181d", fundo) ? "#ffffff" : "#16181d";
};
const forma = (id: string, f: CamadaForma["forma"], x: number, y: number, w: number, h: number, cor: string, extra: Partial<CamadaForma["estilo"]> = {}, opacidade?: number): CamadaForma =>
  ({ id, tipo: "forma", forma: f, x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), z: 15, ...(opacidade ? { opacidade } : {}), estilo: { cor, ...extra } });

function capaSegura(p: Pagina): Pagina {
  // Keep the cover's text inside the central square and give the title the Black weight.
  const camadas = p.camadas.map((c) => {
    if (c.tipo !== "texto" || c.id === "num") return c;
    let y = Math.max(c.y, ZONA_SEGURA.gradeTopo), h = c.h;
    if (y + h > ZONA_SEGURA.gradeBase) { const fim = ZONA_SEGURA.gradeBase; if (fim - h >= ZONA_SEGURA.gradeTopo) y = fim - h; else h = fim - y; }
    const titulo = c.ref?.endsWith(".titulo");
    return { ...c, y, h, estilo: titulo && c.estilo.familia === "montserrat" ? { ...c.estilo, peso: 900 as const } : c.estilo };
  });
  return { ...p, camadas };
}

/** Applies the first-composition visual criteria to one document's pages. */
export function enriquecerPaginas(paginas: Pagina[], slides: SlideEnriquecer[], marca: string): Pagina[] {
  const total = paginas.length;
  return paginas.map((p0, i) => {
    const s = slides[i];
    if (!s) return p0;
    let p = i === 0 ? capaSegura(p0) : p0;
    const cor = acento(marca, p.fundo);
    const extra: Camada[] = [];
    // Slide 2 is re-shown by Instagram when the cover is skipped: a "second hook" with a lateral accent band
    // and a heavier short title (only when the title is short enough for the Black weight to keep fitting).
    if (i === 1 && total > 2 && !p.camadas.some((c) => c.tipo === "imagem")) {
      if (livre(p, { x: 0, y: 0, w: 32, h: ALTURA })) extra.push(forma("mod-gancho-faixa", "ret", 0, 0, 32, ALTURA, cor));
      if (s.titulo.length <= 60) p = { ...p, camadas: p.camadas.map((c) => (c.tipo === "texto" && c.ref?.endsWith(".titulo") && c.estilo.familia === "montserrat" ? { ...c, estilo: { ...c.estilo, peso: 900 as const } } : c)) };
    }
    const ic = iconeSlide(s, i, total);
    const caixaIcone = { x: LARGURA - 96 - 72, y: 72, w: 72, h: 72 };
    if (ic && livre(p, caixaIcone)) extra.push(forma("mod-icone", "icone", caixaIcone.x, caixaIcone.y, 72, 72, cor, { icone: ic }));
    // Progress bar along the bottom safe margin (above the native pagination dots).
    const y = ALTURA - 40;
    extra.push(forma("mod-progresso-base", "ret", 96, y, LARGURA - 192, 6, cor, { raio: 3 }, 0.2));
    extra.push(forma("mod-progresso", "ret", 96, y, Math.max(12, ((LARGURA - 192) * (i + 1)) / total), 6, cor, { raio: 3 }));
    // Swipe arrow on every page but the last.
    const caixaSeta = { x: LARGURA - 96 - 56, y: ALTURA - 112, w: 56, h: 56 };
    if (i < total - 1 && livre(p, caixaSeta)) extra.push(forma("mod-seta", "icone", caixaSeta.x, caixaSeta.y, 56, 56, cor, { icone: "seta" }));
    p = { ...p, camadas: [...p.camadas, ...extra] };
    return p;
  });
}

export interface AvisoCarga { slide: string; motivo: string }
/** Cognitive-load warnings per slide (too much text or more than four list points). */
export function avisosCarga(slides: SlideEnriquecer[]): AvisoCarga[] {
  const r: AvisoCarga[] = [];
  for (const s of slides) {
    if (s.papel === "fecho") continue;
    const pontos = s.texto.split("\n").filter((l) => LISTA.test(l)).length;
    if (s.texto.length > 420) r.push({ slide: s.id, motivo: `Texto longo (${s.texto.length} caracteres): considera dividir em dois slides.` });
    else if (pontos > 4) r.push({ slide: s.id, motivo: `${pontos} pontos numa lista: no telemóvel, mais de 4 pesa na leitura.` });
  }
  return r;
}

/** Splits a slide text at the paragraph/line break closest to the middle (falls back to a sentence end). */
export function dividirTextoSlide(texto: string): [string, string] | null {
  const t = texto.trim();
  if (t.length < 80) return null;
  const meio = t.length / 2;
  const cortes: number[] = [];
  for (const re of [/\n+/g, /[.!?…]\s+/g]) {
    for (const m of t.matchAll(re)) cortes.push((m.index ?? 0) + m[0].length);
    if (cortes.length) break;
  }
  if (!cortes.length) return null;
  const c = cortes.sort((a, b) => Math.abs(a - meio) - Math.abs(b - meio))[0];
  const a = t.slice(0, c).trim(), b = t.slice(c).trim();
  return a && b ? [a, b] : null;
}
