// Canvas rendering of the chronicle carousel (1080×1350). Preview and export share this drawing.
import JSZip from "jszip";
import { R } from "@/newsletter/lib/newsletter-engine/revista/tokens";
import { DIMENSOES, legendaComLink, type Carrossel, type FonteCronica } from "@/services/conteudos";

const TITULO = '"Space Grotesk", "Arial Black", Arial, sans-serif';
const CORPO = '"Inter", Arial, sans-serif';

function linhas(ctx: CanvasRenderingContext2D, texto: string, largura: number): string[] {
  const out: string[] = [];
  for (const par of texto.split(/\n/)) {
    let linha = "";
    for (const palavra of par.split(/\s+/).filter(Boolean)) {
      if (ctx.measureText(palavra).width > largura) throw new Error("Uma palavra é demasiado longa para o slide. Divide-a antes de exportar.");
      const cand = linha ? `${linha} ${palavra}` : palavra;
      if (linha && ctx.measureText(cand).width > largura) { out.push(linha); linha = palavra; } else linha = cand;
    }
    if (linha) out.push(linha);
  }
  return out;
}

function bloco(ctx: CanvasRenderingContext2D, texto: string, y: number, altura: number, tamanho: number, minimo: number, negrito: boolean) {
  let frases: string[] = [];
  let corpo = tamanho;
  for (; corpo >= minimo; corpo -= 2) {
    ctx.font = `${negrito ? 700 : 400} ${corpo}px ${negrito ? TITULO : CORPO}`;
    frases = linhas(ctx, texto, 920);
    if (frases.length * corpo * 1.22 <= altura) break;
  }
  if (corpo < minimo) throw new Error("O texto não cabe no slide. Encurta-o antes de exportar.");
  frases.forEach((l, i) => ctx.fillText(l, 80, y + i * corpo * 1.22));
}

export async function desenharSlide(canvas: HTMLCanvasElement, carrossel: Carrossel, fonte: FonteCronica, indice: number) {
  await Promise.all([document.fonts.load(`700 80px ${TITULO}`), document.fonts.load(`400 44px ${CORPO}`)]).catch(() => undefined);
  canvas.width = DIMENSOES.largura;
  canvas.height = DIMENSOES.altura;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Este navegador não permite desenhar o carrossel.");
  const slide = carrossel.slides[indice];
  const escuro = indice === 0 || indice === carrossel.slides.length - 1;
  ctx.fillStyle = escuro ? R.navy : R.fundoCartao;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textBaseline = "top";
  ctx.fillStyle = escuro ? R.lima : R.navy;
  ctx.font = `700 32px ${TITULO}`;
  ctx.fillText("DIGITALSPRINT", 80, 80);
  ctx.textAlign = "right";
  ctx.fillStyle = escuro ? R.escuroTexto : R.textoSec;
  ctx.font = `400 26px ${CORPO}`;
  ctx.fillText(`Crónica · #${fonte.numero}`, 1000, 84);
  ctx.textAlign = "left";
  ctx.fillStyle = escuro ? R.branco : R.navy;
  bloco(ctx, slide.titulo, 240, 360, indice === 0 ? 96 : 78, 42, true);
  ctx.fillStyle = escuro ? R.escuroTexto : R.texto;
  bloco(ctx, slide.texto, 670, 420, 44, 28, false);
  ctx.fillStyle = escuro ? R.escuroFilete : R.filete;
  ctx.fillRect(80, 1190, 920, 1);
  ctx.fillStyle = escuro ? R.escuroTexto : R.textoSec;
  ctx.font = `400 25px ${CORPO}`;
  ctx.fillText("Frederico Carvalho", 80, 1230);
  ctx.textAlign = "right";
  ctx.fillText(`${indice + 1} / ${carrossel.slides.length}`, 1000, 1230);
  ctx.textAlign = "left";
}

export function descarregar(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nome;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

async function renderizarTodos(carrossel: Carrossel, fonte: FonteCronica) {
  // Render everything first: a failure never produces a partial file.
  const telas: HTMLCanvasElement[] = [];
  for (let i = 0; i < carrossel.slides.length; i++) {
    const c = document.createElement("canvas");
    await desenharSlide(c, carrossel, fonte, i);
    telas.push(c);
  }
  return telas;
}

const paraPng = (c: HTMLCanvasElement) =>
  new Promise<Blob>((ok, ko) => c.toBlob((b) => (b ? ok(b) : ko(new Error("Falha ao exportar uma imagem."))), "image/png"));

export async function gerarFicheiros(carrossel: Carrossel, fonte: FonteCronica): Promise<{ pngs: Blob[]; pdf: Blob }> {
  const telas = await renderizarTodos(carrossel, fonte);
  const pngs = await Promise.all(telas.map(paraPng));
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: [540, 675], orientation: "portrait", compress: true });
  doc.setProperties({ title: fonte.titulo, author: "Frederico Carvalho", subject: "DIGITALSPRINT · Carrossel da crónica" });
  telas.forEach((c, i) => {
    if (i) doc.addPage([540, 675], "portrait");
    doc.addImage(c.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, 540, 675);
    if (i === telas.length - 1) doc.link(0, 0, 540, 675, { url: fonte.url });
  });
  return { pngs, pdf: doc.output("blob") };
}

export async function exportarCarrossel(tipo: "pdf" | "zip", carrossel: Carrossel, fonte: FonteCronica) {
  const legenda = legendaComLink(carrossel, fonte);
  const { pngs, pdf } = await gerarFicheiros(carrossel, fonte);
  const nome = `digitalsprint-${fonte.numero}-cronica`;
  if (tipo === "pdf") return descarregar(pdf, `${nome}.pdf`);
  const zip = new JSZip();
  pngs.forEach((b, i) => zip.file(`slide-${String(i + 1).padStart(2, "0")}.png`, b));
  zip.file("legenda.txt", legenda);
  descarregar(await zip.generateAsync({ type: "blob", compression: "STORE" }), `${nome}.zip`);
}
