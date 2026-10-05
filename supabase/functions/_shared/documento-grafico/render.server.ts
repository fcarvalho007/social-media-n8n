// Server-side render proof: DocumentoGrafico v1 → SVG (shared layout) → PNG via resvg-wasm.
// Loaded lazily by nl-conteudos ("render_prova"), so it adds no new public endpoint.
import { initWasm, Resvg } from "npm:@resvg/resvg-wasm@2.6.2";
import { paginaParaSvg, validarPacote, type Medidor, type PacoteProva, type Variante } from "./nucleo.ts";
import { fontesServidor } from "./fontes-servidor.ts";

const WASM_URL = "https://unpkg.com/@resvg/resvg-wasm@2.6.2/index_bg.wasm";

let pronto: Promise<{ medidor: Medidor; fontes: Uint8Array[] }> | null = null;

function preparar() {
  if (!pronto) {
    pronto = (async () => {
      const resp = await fetch(WASM_URL);
      if (!resp.ok) throw new Error(`Não foi possível obter o motor de renderização (HTTP ${resp.status}).`);
      await initWasm(resp);
      const f = fontesServidor();
      return { medidor: f.medidor, fontes: f.buffers };
    })().catch((e) => {
      pronto = null;
      throw e;
    });
  }
  return pronto;
}

function base64(u: Uint8Array): string {
  let s = "";
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
}

export async function renderizarProva(pacoteBruto: unknown, variante: Variante, pagina: number) {
  const inicio = performance.now();
  const pacote = validarPacote(pacoteBruto);
  const { medidor, fontes } = await preparar();
  const preparado = performance.now();
  const svg = paginaParaSvg(pacote, variante, pagina, medidor);
  const png = new Resvg(svg, { font: { fontBuffers: fontes, loadSystemFonts: false, defaultFontFamily: "Work Sans" } }).render().asPng();
  return {
    png: base64(png),
    bytes: png.length,
    ms_preparacao: Math.round(preparado - inicio),
    ms_render: Math.round(performance.now() - preparado),
  };
}

/** Final export path: an already-validated real package → PNG bytes (same core/fonts as the proof). */
export async function renderizarPaginaPng(pacote: PacoteProva, variante: Variante, pagina: number): Promise<Uint8Array> {
  const { medidor, fontes } = await preparar();
  const svg = paginaParaSvg(pacote, variante, pagina, medidor);
  return new Resvg(svg, { font: { fontBuffers: fontes, loadSystemFonts: false, defaultFontFamily: "Work Sans" } }).render().asPng();
}
