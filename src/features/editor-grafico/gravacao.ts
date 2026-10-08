// Records one slide's animation to a video file entirely in this browser (no server rendering, no cost).
// MediaRecorder captures the Konva canvas at native resolution while the companion videos play.
import Konva from "konva";
import { camadasOrdenadas, type Medidor, type PacoteProva, type Variante } from "../../supabase/functions/_shared/documento-grafico/nucleo";
import { carregarImagens, noCamada } from "./desenho";

export interface OpcoesGravacao {
  pacote: PacoteProva;
  variante: Variante;
  indice: number;
  medidor: Medidor;
  videos: Record<string, HTMLVideoElement>;
  duracaoMs: number;
  aoProgresso?: (ms: number) => void;
  cancelado?: () => boolean;
}
export interface ResultadoGravacao { blob: Blob; extensao: "mp4" | "webm"; duracaoMs: number }

/** Best available recorder format; MP4 on Chromium, WebM elsewhere (the caller warns in that case). */
export function suporteGravacao(): { mime: string; extensao: "mp4" | "webm" } | null {
  if (typeof MediaRecorder === "undefined") return null;
  const candidatos: Array<[string, "mp4" | "webm"]> = [
    ["video/mp4;codecs=avc1.42E01E", "mp4"],
    ["video/mp4", "mp4"],
    ["video/webm;codecs=vp9", "webm"],
    ["video/webm", "webm"],
  ];
  for (const [mime, extensao] of candidatos) if (MediaRecorder.isTypeSupported(mime)) return { mime, extensao };
  return null;
}

/** True when this slide has an animation companion to record. */
export function paginaTemAnimacao(p: PacoteProva, variante: Variante, indice: number): boolean {
  return p.variantes[variante].paginas[indice]?.camadas.some((c) => c.tipo === "imagem" && c.animacao_id) ?? false;
}

/** Animation duration of the slide (max of the layers' duracao_ms; default 3000 ms). */
export function duracaoPagina(p: PacoteProva, variante: Variante, indice: number): number {
  const pag = p.variantes[variante].paginas[indice];
  const durs = (pag?.camadas ?? []).filter((c) => c.tipo === "imagem" && typeof c.duracao_ms === "number").map((c) => c.duracao_ms as number);
  return Math.min(Math.max(...durs, 1000), 60000);
}

export async function gravarPagina(o: OpcoesGravacao): Promise<ResultadoGravacao> {
  const suporte = suporteGravacao();
  if (!suporte) throw new Error("Este navegador não consegue gravar vídeo. O rascunho seguirá com a imagem estática.");
  const v = o.pacote.variantes[o.variante];
  const pagina = v.paginas[o.indice];
  if (!pagina) throw new Error("Página inexistente.");
  const animadas = pagina.camadas.filter((c) => c.tipo === "imagem" && c.animacao_id && o.videos[c.animacao_id]);
  if (!animadas.length) throw new Error("Esta página não tem sticker animado.");
  const imgs = await carregarImagens(o.pacote);
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-100000px;top:0;width:1px;height:1px;overflow:hidden;";
  document.body.appendChild(host);
  const stage = new Konva.Stage({ container: host, width: v.largura, height: v.altura });
  const layer = new Konva.Layer();
  layer.add(new Konva.Rect({ x: 0, y: 0, width: v.largura, height: v.altura, fill: pagina.fundo }));
  for (const c of camadasOrdenadas(pagina)) {
    const n = noCamada(c, o.pacote, imgs, o.medidor, o.videos);
    if (n) layer.add(n);
  }
  stage.add(layer);
  layer.draw();
  let raf = 0;
  try {
    const tela = (layer.getCanvas() as unknown as { _canvas: HTMLCanvasElement })._canvas;
    const rec = new MediaRecorder(tela.captureStream(30), { mimeType: suporte.mime, videoBitsPerSecond: 6_000_000 });
    const partes: Blob[] = [];
    rec.ondataavailable = (e) => { if (e.data.size) partes.push(e.data); };
    const feito = new Promise<void>((res) => { rec.onstop = () => res(); });
    for (const c of animadas) {
      const vid = o.videos[c.animacao_id!];
      try { vid.currentTime = 0; await vid.play(); } catch { /* capa estática */ }
    }
    // Konva only redraws on demand: keep drawing while the videos advance.
    const loop = () => { layer.batchDraw(); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    rec.start(250);
    const inicio = performance.now();
    try {
      await new Promise<void>((res, rej) => {
        const t = setInterval(() => {
          const ms = performance.now() - inicio;
          o.aoProgresso?.(Math.min(ms, o.duracaoMs));
          if (o.cancelado?.()) { clearInterval(t); rej(new Error("cancelado")); }
          else if (ms >= o.duracaoMs + 250) { clearInterval(t); res(); }
        }, 100);
      });
    } finally {
      rec.stop();
      await feito;
    }
    return { blob: new Blob(partes, { type: suporte.mime.split(";")[0] }), extensao: suporte.extensao, duracaoMs: o.duracaoMs };
  } finally {
    cancelAnimationFrame(raf);
    for (const c of animadas) o.videos[c.animacao_id!]?.pause();
    stage.destroy();
    host.remove();
  }
}
