import Konva from "konva";
import {
  ALTURA, LARGURA, calcularRecorte, camadasOrdenadas, layoutTexto, resolverTexto,
  type Asset, type Camada, type CamadaTexto, type Medidor, type PacoteProva, type Variante,
} from "../../../supabase/functions/_shared/documento-grafico/nucleo";

/** Draws a text layer from the shared layout (same line breaks and baselines as the SVG renderer). */
export function desenharTexto(ctx: Konva.Context, c: CamadaTexto, texto: string, m: Medidor) {
  const lay = layoutTexto(texto, c.estilo, c.w, c.h, m);
  const nativo = ctx._context as CanvasRenderingContext2D;
  nativo.fillStyle = c.estilo.cor;
  for (const l of lay.linhas) if (l.texto) nativo.fill(new Path2D(m.caminho(l.texto, l.x, l.baseline, lay.tam, c.estilo.peso)));
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

/** Imperative Konva node for one layer (used for export; the editor uses the same geometry). */
function no(c: Camada, p: PacoteProva, imgs: Record<string, HTMLImageElement>, m: Medidor): Konva.Node {
  const op = c.opacidade ?? 1;
  if (c.tipo === "forma") {
    return c.forma === "ret"
      ? new Konva.Rect({ x: c.x, y: c.y, width: c.w, height: c.h, cornerRadius: c.estilo.raio ?? 0, fill: c.estilo.cor, opacity: op })
      : new Konva.Ellipse({ x: c.x + c.w / 2, y: c.y + c.h / 2, radiusX: c.w / 2, radiusY: c.h / 2, fill: c.estilo.cor, opacity: op });
  }
  if (c.tipo === "imagem") {
    const k = calcularRecorte(p.assets[c.asset_id], c);
    return new Konva.Image({ image: imgs[c.asset_id], x: c.x + k.dx, y: c.y + k.dy, width: k.dw, height: k.dh, crop: { x: k.sx, y: k.sy, width: k.sw, height: k.sh }, opacity: op });
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
    for (const c of camadasOrdenadas(pagina)) layer.add(no(c, p, imgs, m) as Konva.Shape);
    stage.add(layer);
    layer.draw();
    return stage.toDataURL({ pixelRatio: 1, mimeType: "image/png" });
  } finally {
    stage.destroy();
  }
}

/** Fraction of pixels whose max channel difference exceeds the tolerance. */
export async function compararPng(a: string, b: string, tolerancia = 48): Promise<{ fracao: number; diferenca: string }> {
  const [ia, ib] = await Promise.all([a, b].map((src) => new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("PNG inválido.")); i.src = src;
  })));
  const ler = (img: HTMLImageElement) => {
    const c = document.createElement("canvas"); c.width = LARGURA; c.height = ALTURA;
    const x = c.getContext("2d")!; x.drawImage(img, 0, 0); return x.getImageData(0, 0, LARGURA, ALTURA);
  };
  const da = ler(ia), db = ler(ib);
  const out = new ImageData(LARGURA, ALTURA);
  let diff = 0;
  for (let i = 0; i < da.data.length; i += 4) {
    const d = Math.max(Math.abs(da.data[i] - db.data[i]), Math.abs(da.data[i + 1] - db.data[i + 1]), Math.abs(da.data[i + 2] - db.data[i + 2]));
    const mau = d > tolerancia;
    if (mau) diff++;
    out.data[i] = mau ? 220 : da.data[i] * 0.25 + 180;
    out.data[i + 1] = mau ? 38 : da.data[i + 1] * 0.25 + 180;
    out.data[i + 2] = mau ? 38 : da.data[i + 2] * 0.25 + 180;
    out.data[i + 3] = 255;
  }
  const c = document.createElement("canvas"); c.width = LARGURA; c.height = ALTURA;
  c.getContext("2d")!.putImageData(out, 0, 0);
  return { fracao: diff / (LARGURA * ALTURA), diferenca: c.toDataURL("image/png") };
}
