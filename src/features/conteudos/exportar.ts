// Canvas rendering of the chronicle carousel (1080×1350). Preview and export share this drawing.
import JSZip from "jszip";
import { legendaComLink, type Carrossel, type FonteCronica, type StoryEdicao } from "@/services/conteudos";
import { comporCarrossel, comporStory } from "../../../supabase/functions/_shared/conteudos/apresentacao";
import { layoutTexto, resolverTexto, type PacoteProva } from "../../../supabase/functions/_shared/documento-grafico/nucleo";
import { carregarMedidor } from "@/features/editor-grafico/fontes";
import { renderizarPaginaPng } from "@/features/editor-grafico/desenho";
import { TITULO_SUBSCRICAO, URL_SUBSCRICAO, linkDivulgacao } from "../../../supabase/functions/_shared/conteudos/carrossel";

export async function desenharPacote(canvas: HTMLCanvasElement, pacote: PacoteProva, indice: number) {
  const m = await carregarMedidor();
  const doc = pacote.variantes.A, pagina = doc.paginas[indice];
  if (!pagina) throw new Error("Esta página já não existe na composição.");
  for (const c of pagina.camadas) if (c.tipo === "texto" && layoutTexto(resolverTexto(c, pacote.conteudo), c.estilo, c.w, c.h, m, c.marcas).cortado) {
    throw new Error(`O texto «${c.nome ?? c.id}» não cabe no slide ${indice + 1}. Reparte o texto ou ajusta a caixa no compositor.`);
  }
  const url = await renderizarPaginaPng(pacote, "A", indice, m);
  const img = await new Promise<HTMLImageElement>((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ko(new Error("Não foi possível renderizar a composição.")); i.src = url; });
  canvas.width = doc.largura; canvas.height = doc.altura;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Este navegador não permite desenhar a composição.");
  ctx.drawImage(img, 0, 0);
}

export async function desenharSlide(canvas: HTMLCanvasElement, c: Carrossel, fonte: FonteCronica, indice: number, pacote?: PacoteProva) {
  await desenharPacote(canvas, pacote ?? comporCarrossel(fonte.edicaoId, c, fonte), indice);
}

export function descarregar(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nome;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

async function renderizarTodos(carrossel: Carrossel, fonte: FonteCronica, pacote?: PacoteProva) {
  // Render everything first: a failure never produces a partial file.
  const telas: HTMLCanvasElement[] = [];
  for (let i = 0; i < (pacote?.variantes.A.paginas.length ?? carrossel.slides.length); i++) {
    const c = document.createElement("canvas");
    await desenharSlide(c, carrossel, fonte, i, pacote);
    telas.push(c);
  }
  return telas;
}

const paraPng = (c: HTMLCanvasElement) =>
  new Promise<Blob>((ok, ko) => c.toBlob((b) => (b ? ok(b) : ko(new Error("Falha ao exportar uma imagem."))), "image/png"));

export async function gerarFicheiros(carrossel: Carrossel, fonte: FonteCronica, pacote?: PacoteProva): Promise<{ pngs: Blob[]; pdf: Blob }> {
  const telas = await renderizarTodos(carrossel, fonte, pacote);
  const pngs = await Promise.all(telas.map(paraPng));
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: [540, 675], orientation: "portrait", compress: true });
  doc.setProperties({ title: fonte.titulo, author: "Frederico Carvalho", subject: fonte.destaques?.length ? "DIGITALSPRINT · Carrossel da newsletter" : "DIGITALSPRINT · Carrossel da crónica" });
  telas.forEach((c, i) => {
    if (i) doc.addPage([540, 675], "portrait");
    doc.addImage(c.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, 540, 675);
    if (i === telas.length - 1) doc.link(0, 0, 540, 675, { url: carrossel.slides.at(-1)?.titulo === TITULO_SUBSCRICAO ? linkDivulgacao(URL_SUBSCRICAO, fonte.numero, "carrossel_d1") : fonte.edicaoUrl || fonte.url });
  });
  return { pngs, pdf: doc.output("blob") };
}

export async function exportarCarrossel(tipo: "pdf" | "zip", carrossel: Carrossel, fonte: FonteCronica, pacote?: PacoteProva) {
  const legenda = legendaComLink(carrossel, fonte);
  const { pngs, pdf } = await gerarFicheiros(carrossel, fonte, pacote);
  const nome = `digitalsprint-${fonte.numero}-${fonte.destaques?.length ? "newsletter" : "cronica"}`;
  if (tipo === "pdf") return descarregar(pdf, `${nome}.pdf`);
  const zip = new JSZip();
  pngs.forEach((b, i) => zip.file(`slide-${String(i + 1).padStart(2, "0")}.png`, b));
  zip.file("legenda.txt", legenda);
  descarregar(await zip.generateAsync({ type: "blob", compression: "STORE" }), `${nome}.zip`);
}

/** Story preview, layer editor and PNG export share the same canonical document. */
export async function desenharStory(canvas: HTMLCanvasElement, story: StoryEdicao, numero: number, pacote?: PacoteProva) {
  await desenharPacote(canvas, pacote ?? comporStory(`story-${numero}`, story, numero), 0);
}

export async function exportarStory(story: StoryEdicao, numero: number, pacote?: PacoteProva) {
  const canvas = document.createElement("canvas");
  await desenharStory(canvas, story, numero, pacote);
  descarregar(await paraPng(canvas), `digitalsprint-${numero}-story-dia-envio.png`);
}
