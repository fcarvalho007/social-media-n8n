// Recorte da imagem da crónica numa faixa 556×200 (gerada a 2x: 1112×400).

import type { EnquadramentoImagem } from "./data-revista";

export const FAIXA_LARGURA = 1112;
export const FAIXA_ALTURA = 400;

export interface EnquadramentoNormal { x: number; y: number; zoom: number }

export function normalizarEnquadramento(e: EnquadramentoImagem | null | undefined): EnquadramentoNormal {
  const lim = (v: unknown, min: number, max: number, def: number) =>
    typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : def;
  return { x: lim(e?.x, 0, 1, 0.5), y: lim(e?.y, 0, 1, 0.5), zoom: lim(e?.zoom, 1, 4, 1) };
}

/** Calcula a posição/tamanho da imagem dentro de uma moldura w×h. */
export function geometria(iw: number, ih: number, w: number, h: number, e: EnquadramentoNormal) {
  const escala = Math.max(w / iw, h / ih) * e.zoom;
  const dw = iw * escala;
  const dh = ih * escala;
  const left = Math.min(0, Math.max(w - dw, w / 2 - e.x * dw));
  const top = Math.min(0, Math.max(h - dh, h / 2 - e.y * dh));
  return { left, top, dw, dh };
}

export function desenhar(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number, e: EnquadramentoNormal) {
  const g = geometria(img.naturalWidth, img.naturalHeight, w, h, e);
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(img, g.left, g.top, g.dw, g.dh);
}

export function carregarImagem(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Não foi possível abrir a imagem."));
    img.src = dataUrl;
  });
}

/** Gera o JPEG da faixa e devolve-o em base64 (sem prefixo). */
export function gerarFaixa(img: HTMLImageElement, e: EnquadramentoNormal): string {
  const c = document.createElement("canvas");
  c.width = FAIXA_LARGURA;
  c.height = FAIXA_ALTURA;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("O browser não permitiu recortar a imagem.");
  ctx.imageSmoothingQuality = "high";
  desenhar(ctx, img, FAIXA_LARGURA, FAIXA_ALTURA, e);
  return c.toDataURL("image/jpeg", 0.85).split(",")[1] ?? "";
}
