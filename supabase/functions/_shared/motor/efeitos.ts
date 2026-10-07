// Visual effects as style tokens. Effects keep the FUNCTION of the old decorative layer (glow, HUD corners,
// scanlines, glow lines, cinematic shadow…) but not its fixed aesthetics: every colour comes from the palette
// (so a palette change recolours, never re-shapes), and every effect is drawn with ordinary "fx-" shape layers,
// so canvas, thumbnails and PNG/PDF export render them with the same shared core. The image source never matters.
import { ALTURA, LARGURA, type Camada, type CamadaForma, type CamadaTexto, type Pagina } from "../documento-grafico/nucleo.ts";
import type { EstiloId, Paleta } from "./estilos.ts";

export type ChaveEfeito = "accentLine" | "glow" | "shadow" | "grid" | "scanlines" | "corners" | "tom" | "particulas";
export interface TokensEfeitos {
  /** Directional overlay over photos (handled by the image composition; intensity factor per style). */
  gradiente: { intensidade: number };
  vinheta: boolean;
  glass: boolean;
  accentLine: { enabled: boolean; w: number; h: number };
  glow: { enabled: boolean; colorToken: keyof Paleta; intensity: number; blur: number };
  shadow: { enabled: boolean; intensity: number; offset: number };
  grid: { enabled: boolean; passo: number; opacidade: number };
  scanlines: { enabled: boolean };
  corners: { enabled: boolean };
  /** Image treatment. Only brightness is rendered (as a palette-dark veil); contrast/saturation are recorded intent. */
  tom: { brightness: number; contrast: number; saturation: number };
  particulas: { enabled: boolean };
}

const base: TokensEfeitos = {
  gradiente: { intensidade: 1 }, vinheta: false, glass: false,
  accentLine: { enabled: false, w: 64, h: 2 },
  glow: { enabled: false, colorToken: "destaque", intensity: 0, blur: 0 },
  shadow: { enabled: false, intensity: 0, offset: 0 },
  grid: { enabled: false, passo: 108, opacidade: 0 },
  scanlines: { enabled: false }, corners: { enabled: false },
  tom: { brightness: 1, contrast: 1, saturation: 1 },
  particulas: { enabled: false },
};

/** Defaults per style. Editorial never inherits neon/HUD/scanlines; particles are manual-only everywhere. */
export const EFEITOS_ESTILO: Record<EstiloId, TokensEfeitos> = {
  editorial: { ...base, gradiente: { intensidade: 0.8 }, accentLine: { enabled: true, w: 64, h: 2 } },
  contraste: { ...base, gradiente: { intensidade: 1 }, accentLine: { enabled: true, w: 120, h: 8 },
    glow: { enabled: true, colorToken: "destaque", intensity: 0.35, blur: 160 }, shadow: { enabled: true, intensity: 0.35, offset: 18 },
    grid: { enabled: true, passo: 108, opacidade: 0.05 }, scanlines: { enabled: true }, corners: { enabled: true } },
  revista: { ...base, gradiente: { intensidade: 0.95 }, vinheta: true, accentLine: { enabled: true, w: 140, h: 4 }, shadow: { enabled: true, intensity: 0.22, offset: 14 } },
  fotografico: { ...base, gradiente: { intensidade: 1 }, vinheta: true, glass: true, accentLine: { enabled: true, w: 48, h: 3 },
    shadow: { enabled: true, intensity: 0.18, offset: 10 }, tom: { brightness: 0.9, contrast: 1.05, saturation: 0.95 } },
  minimalista: { ...base, gradiente: { intensidade: 0.6 }, accentLine: { enabled: true, w: 32, h: 1 } },
  didatico: { ...base, gradiente: { intensidade: 0.85 }, accentLine: { enabled: true, w: 80, h: 6 },
    glow: { enabled: true, colorToken: "destaque", intensity: 0.18, blur: 120 }, grid: { enabled: true, passo: 90, opacidade: 0.04 }, corners: { enabled: true } },
};

export const NOMES_EFEITO: Record<ChaveEfeito, string> = {
  accentLine: "Linhas de acento", glow: "Brilho", shadow: "Sombra", grid: "Grelha", scanlines: "Linhas de textura",
  corners: "Cantos", tom: "Tratamento da imagem", particulas: "Partículas",
};
export const CHAVES_EFEITO = Object.keys(NOMES_EFEITO) as ChaveEfeito[];

/** Per-page override: key → on/off. Absent = style default. */
export type OverrideEfeitos = Partial<Record<ChaveEfeito, boolean>>;

export function efeitosAtivos(estilo: EstiloId, o: OverrideEfeitos = {}): Record<ChaveEfeito, boolean> {
  const t = EFEITOS_ESTILO[estilo] ?? EFEITOS_ESTILO.editorial;
  const def: Record<ChaveEfeito, boolean> = {
    accentLine: t.accentLine.enabled, glow: t.glow.enabled, shadow: t.shadow.enabled, grid: t.grid.enabled,
    scanlines: t.scanlines.enabled, corners: t.corners.enabled, tom: t.tom.brightness < 1, particulas: t.particulas.enabled,
  };
  for (const k of CHAVES_EFEITO) if (typeof o[k] === "boolean") def[k] = o[k]!;
  return def;
}

const LIMITE = 60;
const ret = (id: string, x: number, y: number, w: number, h: number, z: number, cor: string, opacidade?: number, raio?: number): CamadaForma =>
  ({ id, tipo: "forma", forma: "ret", x: Math.round(x), y: Math.round(y), w: Math.max(1, Math.round(w)), h: Math.max(1, Math.round(h)), z, ...(opacidade !== undefined ? { opacidade } : {}), estilo: { cor, ...(raio ? { raio } : {}) } });

/**
 * Rebuilds the "fx-" layers of a page from the style tokens + palette (idempotent: old fx layers are dropped).
 * Effects never move or resize text/images; they respect the 60-layer limit by dropping the least important.
 */
export function aplicarEfeitos(p: Pagina, estilo: EstiloId, paleta: Paleta, override: OverrideEfeitos = {}, altura = ALTURA): Pagina {
  const ALTURA = altura;
  const t = EFEITOS_ESTILO[estilo] ?? EFEITOS_ESTILO.editorial;
  const on = efeitosAtivos(estilo, override);
  const camadas = p.camadas.filter((c) => !c.id.startsWith("fx-"));
  const zs = camadas.map((c) => c.z);
  const zMin = zs.length ? Math.min(...zs) : 1, zMax = zs.length ? Math.max(...zs) : 1;
  const titulo = camadas.find((c): c is CamadaTexto => c.tipo === "texto" && !!c.ref?.endsWith(".titulo"));
  const destaqueTxt = camadas.find((c): c is CamadaTexto => c.tipo === "texto" && (c.id === "num" || /^mod-(num|dado)/.test(c.id))) ?? titulo;
  const img = camadas.find((c) => c.tipo === "imagem");
  const fullBleed = !!img && img.w >= LARGURA * 0.95 && img.h >= ALTURA * 0.95;
  const escuro = paleta.fundoCapa;
  // Ordered by importance: later groups are dropped first when the layer budget is short.
  const grupos: Camada[][] = [];

  if (on.tom && img) {
    const b = t.tom.brightness < 1 ? t.tom.brightness : 0.92;
    grupos.push([ret("fx-tom", img.x, img.y, img.w, img.h, img.z + 0.1, escuro, Math.round((1 - b) * 100) / 100)]);
  }
  if (on.accentLine && titulo && !camadas.some((c) => c.id === "regua" || /^mod-(filete|linha|regua)/.test(c.id))) {
    const y = titulo.y - t.accentLine.h - 22;
    if (y > 24) {
      const x = titulo.estilo.alinh === "centro" ? titulo.x + (titulo.w - t.accentLine.w) / 2 : titulo.estilo.alinh === "dir" ? titulo.x + titulo.w - t.accentLine.w : titulo.x;
      grupos.push([ret("fx-acento", x, y, t.accentLine.w, t.accentLine.h, titulo.z, paleta.destaque)]);
    }
  }
  if (on.glow && destaqueTxt && !fullBleed) {
    const b = t.glow.blur || 120;
    grupos.push([{ id: "fx-glow", tipo: "forma", forma: "gradiente", x: Math.round(destaqueTxt.x - b), y: Math.round(destaqueTxt.y - b), w: Math.round(destaqueTxt.w + 2 * b), h: Math.round(destaqueTxt.h + 2 * b),
      z: destaqueTxt.z - 0.5, estilo: { cor: paleta[t.glow.colorToken], direcao: "centro", intensidade: Math.max(0.05, t.glow.intensity || 0.15) } }]);
  }
  if (on.shadow && img && !fullBleed) {
    const o = t.shadow.offset || 12;
    grupos.push([ret("fx-sombra", img.x + o, img.y + o, img.w, img.h, img.z - 0.5, escuro, t.shadow.intensity || 0.2)]);
  }
  if (on.corners) {
    const m = 48, a = 40, e = 4, c = paleta.destaque, z = zMax + 1;
    grupos.push([
      ret("fx-canto-1h", m, m, a, e, z, c), ret("fx-canto-1v", m, m, e, a, z, c),
      ret("fx-canto-2h", LARGURA - m - a, ALTURA - m - e, a, e, z, c), ret("fx-canto-2v", LARGURA - m - e, ALTURA - m - a, e, a, z, c),
    ]);
  }
  if (on.grid) {
    const passo = t.grid.passo || 108, op = t.grid.opacidade || 0.04, g: Camada[] = [];
    for (let x = passo; x < LARGURA; x += passo) g.push(ret(`fx-grelha-v${x}`, x, 0, 1, ALTURA, zMin - 1, paleta.discreto, op));
    for (let y = passo * 2; y < ALTURA; y += passo * 2) g.push(ret(`fx-grelha-h${y}`, 0, y, LARGURA, 1, zMin - 1, paleta.discreto, op));
    grupos.push(g);
  }
  if (on.scanlines && img) {
    const g: Camada[] = [];
    for (let y = img.y + 8; y < img.y + img.h; y += 56) g.push(ret(`fx-scan-${Math.round(y)}`, img.x, y, img.w, 2, img.z + 0.2, escuro, 0.08));
    grupos.push(g);
  }
  if (on.particulas) {
    const g: Camada[] = [];
    for (let i = 0; i < 8; i++) {
      const x = ((i * 397) % 960) + 60, y = ((i * 613) % 1230) + 60, r = 4 + (i % 3) * 3;
      g.push({ id: `fx-part-${i}`, tipo: "forma", forma: "elipse", x, y, w: r, h: r, z: zMax + 0.5, opacidade: 0.35, estilo: { cor: paleta.destaque } });
    }
    grupos.push(g);
  }
  const extra: Camada[] = [];
  for (const g of grupos) if (camadas.length + extra.length + g.length <= LIMITE) extra.push(...g);
  return { ...p, camadas: [...camadas, ...extra] };
}
