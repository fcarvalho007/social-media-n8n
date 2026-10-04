// Server-side render proof: DocumentoGrafico v1 → SVG (shared layout) → PNG via resvg-wasm.
// Loaded lazily by nl-conteudos ("render_prova"), so it adds no new public endpoint.
import { initWasm, Resvg } from "npm:@resvg/resvg-wasm@2.6.2";
import { parse } from "npm:opentype.js@1.3.4";
import { criarMedidor, paginaParaSvg, validarPacote, type FonteOT, type Medidor, type Variante } from "./nucleo.ts";
import { WORK_SANS_400, WORK_SANS_700 } from "./fontes-b64.ts";

const WASM_URL = "https://unpkg.com/@resvg/resvg-wasm@2.6.2/index_bg.wasm";

function bytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

let pronto: Promise<{ medidor: Medidor; fontes: Uint8Array[] }> | null = null;

function preparar() {
  if (!pronto) {
    pronto = (async () => {
      const resp = await fetch(WASM_URL);
      if (!resp.ok) throw new Error(`Não foi possível obter o motor de renderização (HTTP ${resp.status}).`);
      await initWasm(resp);
      const f400 = bytes(WORK_SANS_400);
      const f700 = bytes(WORK_SANS_700);
      const ab = (u: Uint8Array) => u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength) as ArrayBuffer;
      const medidor = criarMedidor({ 400: parse(ab(f400)) as unknown as FonteOT, 700: parse(ab(f700)) as unknown as FonteOT });
      return { medidor, fontes: [f400, f700] };
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
