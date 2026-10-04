// PDF intake in the browser (entry phase only). Uses the official pdfjs-dist with its bundled worker (no CDN).
// Text is extracted per page; pages without a text layer are reported (with image evidence), never OCR'd or guessed.
import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { LIMITES_PDF, type EstadoPagina, type MetaPdf, type PaginaPdf } from "../../../supabase/functions/_shared/motor/fontes";
import { normalizarFonte } from "../../../supabase/functions/_shared/motor/proposta";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export interface PaginaLida { n: number; estado: EstadoPagina; texto: string; paragrafos: string[] }
export interface PdfLido { ficheiro: string; hash: string; bytes: number; paginas: PaginaLida[] }

export class ErroPdf extends Error {}

async function sha256(b: ArrayBuffer): Promise<string> {
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", b));
  return Array.from(d, (x) => x.toString(16).padStart(2, "0")).join("");
}

interface ItemTexto { str: string; hasEOL?: boolean; transform: number[]; height: number }

/** Joins text items into paragraphs using line breaks and vertical gaps (larger gap = new paragraph). */
export function textoDaPagina(items: ItemTexto[]): string {
  let out = "";
  let ultimoY: number | null = null;
  let altura = 0;
  for (const it of items) {
    const y = it.transform?.[5] ?? 0;
    const h = it.height || altura || 10;
    if (ultimoY !== null && Math.abs(ultimoY - y) > h * 1.9 && out && !out.endsWith("\n\n")) out = out.replace(/\s+$/, "") + "\n\n";
    out += it.str;
    if (it.hasEOL) out += "\n";
    ultimoY = y;
    altura = h;
  }
  return out.replace(/-\n(?=\p{Ll})/gu, "").replace(/(?<!\n)\n(?!\n)/g, " ").trim();
}

const OPS_IMAGEM = () => new Set([pdfjs.OPS.paintImageXObject, pdfjs.OPS.paintInlineImageXObject, pdfjs.OPS.paintImageMaskXObject]);

export async function lerPdf(ficheiro: File): Promise<PdfLido> {
  if (ficheiro.size > LIMITES_PDF.maxBytes) throw new ErroPdf(`O ficheiro tem ${(ficheiro.size / 1048576).toFixed(1).replace(".", ",")} MB; o limite é 15 MB.`);
  const buf = await ficheiro.arrayBuffer();
  const cab = new TextDecoder().decode(new Uint8Array(buf.slice(0, 1024)));
  if (!cab.includes("%PDF-")) throw new ErroPdf("O ficheiro não é um PDF.");
  const hash = await sha256(buf);
  let doc: pdfjs.PDFDocumentProxy;
  try {
    doc = await pdfjs.getDocument({ data: new Uint8Array(buf), isEvalSupported: false, disableFontFace: true, useSystemFonts: false }).promise;
  } catch (e) {
    const nome = (e as { name?: string }).name;
    if (nome === "PasswordException") throw new ErroPdf("O PDF está protegido por palavra-passe. Guarda uma cópia sem proteção ou cola o texto.");
    if (nome === "InvalidPDFException") throw new ErroPdf("O PDF está danificado e não pode ser lido. Experimenta exportá-lo de novo ou cola o texto.");
    throw new ErroPdf("Não foi possível abrir o PDF. Cola o texto em alternativa.");
  }
  try {
    if (doc.numPages > LIMITES_PDF.maxPaginas) throw new ErroPdf(`O PDF tem ${doc.numPages} páginas; o limite é ${LIMITES_PDF.maxPaginas}. Divide-o ou cola só a parte que interessa.`);
    const imgOps = OPS_IMAGEM();
    const paginas: PaginaLida[] = [];
    for (let n = 1; n <= doc.numPages; n++) {
      try {
        const pg = await doc.getPage(n);
        const tc = await pg.getTextContent();
        const texto = textoDaPagina(tc.items.filter((i): i is ItemTexto => "str" in i) as ItemTexto[]);
        const paragrafos = normalizarFonte(texto).paragrafos;
        let estado: EstadoPagina = "texto";
        if (!paragrafos.length) {
          const ops = await pg.getOperatorList();
          estado = ops.fnArray.some((f) => imgOps.has(f)) ? "sem_texto_com_imagem" : "vazia";
        }
        paginas.push({ n, estado, texto, paragrafos });
        pg.cleanup();
      } catch {
        paginas.push({ n, estado: "erro", texto: "", paragrafos: [] });
      }
    }
    return { ficheiro: ficheiro.name.slice(0, 200), hash, bytes: ficheiro.size, paginas };
  } finally {
    await doc.destroy();
  }
}

/** Composes the normalised source text and the persisted per-page metadata (paragraph ranges, missing pages). */
export function comporFontePdf(pdf: PdfLido, excluidas: Set<number>, parcialConfirmado: boolean): { texto: string; meta: MetaPdf } {
  const partes: string[] = [];
  let seguinte = 1;
  const paginas: PaginaPdf[] = pdf.paginas.map((p) => {
    const estado: EstadoPagina = p.estado === "texto" && excluidas.has(p.n) ? "excluida" : p.estado;
    if (estado !== "texto") return { n: p.n, estado, caracteres: p.texto.length, paragrafos: null };
    const ini = seguinte;
    partes.push(...p.paragrafos);
    seguinte += p.paragrafos.length;
    return { n: p.n, estado, caracteres: p.texto.length, paragrafos: [ini, seguinte - 1] };
  });
  const emFalta = paginas.filter((p) => p.estado !== "texto").map((p) => p.n);
  return {
    texto: partes.join("\n\n"),
    meta: {
      tipo: "pdf", ficheiro: pdf.ficheiro, hash: pdf.hash, bytes: pdf.bytes, total_paginas: pdf.paginas.length, paginas,
      completo: emFalta.length === 0, paginas_em_falta: emFalta, parcial_confirmado: parcialConfirmado, editado: false,
    },
  };
}

export const NOME_ESTADO_PAGINA: Record<EstadoPagina, string> = {
  texto: "Texto lido",
  sem_texto_com_imagem: "Sem camada de texto (tem imagem) — precisa de OCR ou de texto colado",
  vazia: "Sem texto nem imagem",
  erro: "Erro ao ler a página",
  excluida: "Excluída por ti",
};
