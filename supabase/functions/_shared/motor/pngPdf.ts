// Low-CPU PNG → PDF image embedding. pdf-lib's embedPng decodes and re-deflates in JS,
// which exceeds the edge CPU budget on photographic pages. Here inflate/deflate use the
// runtime's native streams and only the per-row unfilter runs in JS.
import { PDFDocument, pushGraphicsState, popGraphicsState, concatTransformationMatrix, drawObject } from "npm:pdf-lib@1.17.1";

async function stream(bytes: Uint8Array, s: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(s));
  return new Uint8Array(await out.arrayBuffer());
}

export interface PngRgb { largura: number; altura: number; rgbDeflate: Uint8Array }

/** Decodes an 8-bit non-interlaced RGB/RGBA PNG into deflated RGB (alpha composited on white). */
export async function pngParaRgb(png: Uint8Array): Promise<PngRgb> {
  const dv = new DataView(png.buffer, png.byteOffset, png.byteLength);
  if (dv.getUint32(0) !== 0x89504e47) throw new Error("PNG inválido");
  let pos = 8, w = 0, h = 0, tipo = 0;
  const idat: Uint8Array[] = [];
  while (pos + 8 <= png.length) {
    const len = dv.getUint32(pos);
    const nome = String.fromCharCode(...png.subarray(pos + 4, pos + 8));
    const dados = png.subarray(pos + 8, pos + 8 + len);
    if (nome === "IHDR") {
      w = dv.getUint32(pos + 8); h = dv.getUint32(pos + 12);
      const prof = png[pos + 16]; tipo = png[pos + 17];
      if (prof !== 8 || (tipo !== 2 && tipo !== 6) || png[pos + 20] !== 0) throw new Error("Formato PNG não suportado");
    } else if (nome === "IDAT") idat.push(dados);
    else if (nome === "IEND") break;
    pos += 12 + len;
  }
  const total = idat.reduce((n, c) => n + c.length, 0);
  const z = new Uint8Array(total); let o = 0;
  for (const c of idat) { z.set(c, o); o += c.length; }
  const raw = await stream(z, new DecompressionStream("deflate"));
  const bpp = tipo === 6 ? 4 : 3, linha = w * bpp;
  if (raw.length < h * (linha + 1)) throw new Error("PNG truncado");
  const cur = new Uint8Array(linha), prev = new Uint8Array(linha);
  const rgb = new Uint8Array(w * h * 3);
  for (let y = 0; y < h; y++) {
    const base = y * (linha + 1), f = raw[base];
    for (let i = 0; i < linha; i++) {
      const x = raw[base + 1 + i], a = i >= bpp ? cur[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      let v: number;
      if (f === 0) v = x;
      else if (f === 1) v = x + a;
      else if (f === 2) v = x + b;
      else if (f === 3) v = x + ((a + b) >> 1);
      else { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); }
      cur[i] = v & 255;
    }
    let d = y * w * 3;
    for (let i = 0; i < linha; i += bpp) {
      if (bpp === 4) {
        const al = cur[i + 3], inv = 255 - al;
        rgb[d++] = (cur[i] * al + 255 * inv + 127) / 255 | 0;
        rgb[d++] = (cur[i + 1] * al + 255 * inv + 127) / 255 | 0;
        rgb[d++] = (cur[i + 2] * al + 255 * inv + 127) / 255 | 0;
      } else { rgb[d++] = cur[i]; rgb[d++] = cur[i + 1]; rgb[d++] = cur[i + 2]; }
    }
    prev.set(cur);
  }
  return { largura: w, altura: h, rgbDeflate: await stream(rgb, new CompressionStream("deflate")) };
}

/** Adds one full-page image (already deflated RGB) to the PDF without pdf-lib re-encoding. */
export function adicionarPaginaRgb(pdf: PDFDocument, img: PngRgb, larguraPt: number, alturaPt: number) {
  const ctx = pdf.context;
  const s = ctx.stream(img.rgbDeflate, {
    Type: "XObject", Subtype: "Image", Width: img.largura, Height: img.altura,
    ColorSpace: "DeviceRGB", BitsPerComponent: 8, Filter: "FlateDecode",
  });
  const ref = ctx.register(s);
  const pg = pdf.addPage([larguraPt, alturaPt]);
  const nome = pg.node.newXObject("Im", ref);
  pg.pushOperators(pushGraphicsState(), concatTransformationMatrix(larguraPt, 0, 0, alturaPt, 0, 0), drawObject(nome), popGraphicsState());

}
