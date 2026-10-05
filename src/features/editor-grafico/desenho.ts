import Konva from "konva";
import {
  ALTURA, ICONES, LARGURA, calcularRecorte, tracarMascara, rgba, camadasOrdenadas, layoutTexto, resolverTexto, geometriaGradiente,
  type Asset, type Camada, type CamadaForma, type CamadaTexto, type Medidor, type PacoteProva, type Variante,
} from "../../../supabase/functions/_shared/documento-grafico/nucleo";

/** Draws a text layer from the shared layout (same line breaks and baselines as the SVG renderer). */
export function desenharTexto(ctx: Konva.Context, c: CamadaTexto, texto: string, m: Medidor) {
  const lay = layoutTexto(texto, c.estilo, c.w, c.h, m);
  const nativo = ctx._context as CanvasRenderingContext2D;
  nativo.fillStyle = c.estilo.cor;
  if (lay.capitular) nativo.fill(new Path2D(m.caminho(lay.capitular.texto, lay.capitular.x, lay.capitular.baseline, lay.capitular.tam, c.estilo.peso, c.estilo.familia)));
  for (const l of lay.linhas) if (l.texto) nativo.fill(new Path2D(m.caminho(l.texto, l.x, l.baseline, lay.tam, c.estilo.peso, c.estilo.familia)));
  return lay;
}

const cacheImagens = new Map<string, Promise<HTMLImageElement>>();

export function carregarImagem(a: Asset): Promise<HTMLImageElement> {
  const chave = `${a.id}:${a.dados.length}:${a.dados.slice(-32)}`;
  let p = cacheImagens.get(chave);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Imagem ${a.id} inválida.`));
      img.src = `data:${a.mime};base64,${a.dados}`;
    });
    cacheImagens.set(chave, p);
  }
  return p;
}

export async function carregarImagens(p: PacoteProva): Promise<Record<string, HTMLImageElement>> {
  const out: Record<string, HTMLImageElement> = {};
  await Promise.all(Object.values(p.assets).map(async (a) => { out[a.id] = await carregarImagem(a); }));
  return out;
}

/** Konva fill props for a gradient layer, in shape-local coordinates, from the shared geometry. */
export function propsGradiente(c: CamadaForma): Record<string, unknown> {
  const g = geometriaGradiente(c);
  const stops = g.paragens.flatMap(([o, a]) => [o, rgba(c.estilo.cor, a)]);
  const p1 = { x: g.x1 - c.x, y: g.y1 - c.y }, p2 = { x: g.x2 - c.x, y: g.y2 - c.y };
  return g.radial
    ? { fillRadialGradientStartPoint: p1, fillRadialGradientEndPoint: p2, fillRadialGradientStartRadius: 0, fillRadialGradientEndRadius: g.raio, fillRadialGradientColorStops: stops }
    : { fillLinearGradientStartPoint: p1, fillLinearGradientEndPoint: p2, fillLinearGradientColorStops: stops };
}

/** Imperative Konva node for one layer (used for export; the editor uses the same geometry). */
function no(c: Camada, p: PacoteProva, imgs: Record<string, HTMLImageElement>, m: Medidor): Konva.Node {
  const op = c.opacidade ?? 1;
  if (c.tipo === "forma") {
    if (c.forma === "gradiente") return new Konva.Rect({ x: c.x, y: c.y, width: c.w, height: c.h, opacity: op, ...propsGradiente(c) });
    if (c.forma === "icone") return new Konva.Path({ x: c.x, y: c.y, data: ICONES[c.estilo.icone ?? "seta"], scaleX: c.w / 24, scaleY: c.h / 24, fill: c.estilo.cor, fillRule: "evenodd", opacity: op });
    return c.forma === "ret"
      ? new Konva.Rect({ x: c.x, y: c.y, width: c.w, height: c.h, cornerRadius: c.estilo.raio ?? 0, fill: c.estilo.cor, opacity: op })
      : new Konva.Ellipse({ x: c.x + c.w / 2, y: c.y + c.h / 2, radiusX: c.w / 2, radiusY: c.h / 2, fill: c.estilo.cor, opacity: op });
  }
  if (c.tipo === "imagem") {
    const k = calcularRecorte(p.assets[c.asset_id], c);
    const img = new Konva.Image({ image: imgs[c.asset_id], x: k.dx, y: k.dy, width: k.dw, height: k.dh, crop: { x: k.sx, y: k.sy, width: k.sw, height: k.sh } });
    const mascara = c.mascara;
    const g = new Konva.Group({ x: c.x, y: c.y, opacity: op, clipFunc: mascara ? (ctx) => { tracarMascara(ctx, mascara, c.w, c.h); } : undefined });
    g.add(img);
    return g;
  }
  const texto = resolverTexto(c, p.conteudo);
  return new Konva.Shape({ x: c.x, y: c.y, width: c.w, height: c.h, opacity: op, sceneFunc: (ctx) => { desenharTexto(ctx, c, texto, m); } });
}

/** Browser render of one page to a PNG data URL at 1080×1350. */
export async function renderizarPaginaPng(p: PacoteProva, v: Variante, indice: number, m: Medidor): Promise<string> {
  const pagina = p.variantes[v].paginas[indice];
  const imgs = await carregarImagens(p);
  const host = document.createElement("div");
  const stage = new Konva.Stage({ container: host, width: LARGURA, height: ALTURA });
  try {
    const layer = new Konva.Layer();
    layer.add(new Konva.Rect({ x: 0, y: 0, width: LARGURA, height: ALTURA, fill: pagina.fundo }));
    for (const c of camadasOrdenadas(pagina)) layer.add(no(c, p, imgs, m) as Konva.Shape | Konva.Group);
    stage.add(layer);
    layer.draw();
    return stage.toDataURL({ pixelRatio: 1, mimeType: "image/png" });
  } finally {
    stage.destroy();
  }
}

export interface MetricasComparacaoPng {
  /** Raw differences include rasterizer/antialiasing noise. */
  fracao: number;
  /** Differences with no matching colour in a 3×3 neighbourhood: likely missing content. */
  perda: number;
  /** Worst likely-content-loss fraction in a 90×90 inspection tile. */
  piorZona: number;
  diferenca: string;
}

/**
 * Compares both the global raster and local content integrity. A one-pixel edge
 * shift is classified as rasterisation; a colour absent from the surrounding
 * 3×3 pixels is classified as probable content loss.
 */
export async function compararPng(a: string, b: string, tolerancia = 48): Promise<MetricasComparacaoPng> {
  const [ia, ib] = await Promise.all([a, b].map((src) => new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("PNG inválido.")); i.src = src;
  })));
  const ler = (img: HTMLImageElement) => {
    const c = document.createElement("canvas"); c.width = LARGURA; c.height = ALTURA;
    const x = c.getContext("2d")!; x.drawImage(img, 0, 0); return x.getImageData(0, 0, LARGURA, ALTURA);
  };
  const da = ler(ia), db = ler(ib);
  const out = new ImageData(LARGURA, ALTURA);
  let diff = 0, perda = 0;
  const zona = 90, colunas = Math.ceil(LARGURA / zona), zonas = new Uint32Array(colunas * Math.ceil(ALTURA / zona));
  const semelhante = (origem: Uint8ClampedArray, destino: Uint8ClampedArray, i: number) => {
    const px = (i / 4) % LARGURA, py = Math.floor(i / 4 / LARGURA);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const x = px + dx, y = py + dy;
      if (x < 0 || x >= LARGURA || y < 0 || y >= ALTURA) continue;
      const j = (y * LARGURA + x) * 4;
      if (Math.max(Math.abs(origem[i] - destino[j]), Math.abs(origem[i + 1] - destino[j + 1]), Math.abs(origem[i + 2] - destino[j + 2])) <= tolerancia) return true;
    }
    return false;
  };
  for (let i = 0; i < da.data.length; i += 4) {
    const d = Math.max(Math.abs(da.data[i] - db.data[i]), Math.abs(da.data[i + 1] - db.data[i + 1]), Math.abs(da.data[i + 2] - db.data[i + 2]));
    const mau = d > tolerancia;
    if (mau) diff++;
    const ausente = mau && (!semelhante(da.data, db.data, i) || !semelhante(db.data, da.data, i));
    if (ausente) {
      perda++;
      const p = i / 4, x = p % LARGURA, y = Math.floor(p / LARGURA);
      zonas[Math.floor(y / zona) * colunas + Math.floor(x / zona)]++;
    }
    out.data[i] = ausente ? 220 : mau ? 234 : da.data[i] * 0.25 + 180;
    out.data[i + 1] = ausente ? 38 : mau ? 148 : da.data[i + 1] * 0.25 + 180;
    out.data[i + 2] = ausente ? 38 : mau ? 18 : da.data[i + 2] * 0.25 + 180;
    out.data[i + 3] = 255;
  }
  const c = document.createElement("canvas"); c.width = LARGURA; c.height = ALTURA;
  c.getContext("2d")!.putImageData(out, 0, 0);
  return {
    fracao: diff / (LARGURA * ALTURA),
    perda: perda / (LARGURA * ALTURA),
    piorZona: Math.max(...zonas) / (zona * zona),
    diferenca: c.toDataURL("image/png"),
  };
}
