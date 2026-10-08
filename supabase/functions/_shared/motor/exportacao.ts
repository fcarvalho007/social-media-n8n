// Pure export/draft helpers shared by the mc-motor server and the tests (no Deno/npm runtime imports).
import { formatoConteudo } from "../documento-grafico/formatos.ts";
import { validarPacote, type Asset, type DocumentoGrafico, type PacoteProva, type Variante } from "../documento-grafico/nucleo.ts";
import type { PropostaEditorial } from "./proposta.ts";

export const BUCKET_EXPORT = "pdfs"; // same bucket/ACL the current social flow already uses for carousel files
export const PAGINAS_POR_CORRIDA = 3;
export const TIPO_ORIGEM = "carrossel_motor";

export type ClasseFalha = "documento" | "memoria" | "tempo" | "armazenamento" | "renderizacao" | "desconhecido";

export function classificarFalha(e: unknown): { classe: ClasseFalha; definitiva: boolean; mensagem: string } {
  const m = e instanceof Error ? e.message : String(e);
  const nome = e instanceof Error ? e.name : "";
  if (/inválid|não suportad|inexistente|têm de ser|entre 1 e|só PNG|recurso|identificador/i.test(m) && !/HTTP/.test(m))
    return { classe: "documento", definitiva: true, mensagem: `O documento não pode ser exportado: ${m}` };
  if (nome === "RangeError" || /memory|memória|allocation|out of bounds/i.test(m))
    return { classe: "memoria", definitiva: false, mensagem: "O servidor ficou sem memória ao renderizar. Será retomado por lotes." };
  if (nome === "AbortError" || nome === "TimeoutError" || /timeout|tempo esgotado|timed out/i.test(m))
    return { classe: "tempo", definitiva: false, mensagem: "A renderização demorou demasiado. Será retomada a partir da última página guardada." };
  if (/storage|bucket|upload|object|armazen/i.test(m))
    return { classe: "armazenamento", definitiva: false, mensagem: "Não foi possível guardar um ficheiro. Será tentado de novo sem duplicar." };
  if (/resvg|wasm|render/i.test(m))
    return { classe: "renderizacao", definitiva: false, mensagem: "Falha no motor de renderização. Será tentado de novo." };
  return { classe: "desconhecido", definitiva: false, mensagem: "Falha inesperada na exportação. Será tentado de novo." };
}

const SEG = /^[0-9a-f-]{36}$/i;
/** Versioned, content-addressed path: never reused across versions, never overwritten. */
export function caminhoFicheiro(projectId: string, documentoId: string, versao: number, nome: string, hash: string): string {
  if (!SEG.test(projectId) || !SEG.test(documentoId) || !Number.isInteger(versao) || versao < 1) throw new Error("Caminho inválido.");
  if (!/^[a-z0-9-]{1,40}\.(png|pdf|zip|mp4)$/.test(nome) || !/^[0-9a-f]{64}$/.test(hash)) throw new Error("Caminho inválido.");
  const [base, ext] = nome.split(".");
  return `motor/${projectId}/${documentoId}/v${versao}/${base}-${hash.slice(0, 16)}.${ext}`;
}

/** Ceiling matches GIPHY animations (mc_animacoes): a browser-recorded slide never exceeds 50 MB. */
export const VIDEO_MAX_BYTES = 52428800;
/** Magic bytes only (never trusts the declared MIME): MP4 starts with "ftyp" at offset 4, WebM with the EBML header. */
export function validarVideo(b: Uint8Array): "video/mp4" | "video/webm" {
  if (b.length < 12 || b.length > VIDEO_MAX_BYTES) throw new Error("O vídeo tem de ter entre 12 bytes e 50 MB.");
  if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) return "video/mp4";
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return "video/webm";
  throw new Error("O ficheiro não é um vídeo MP4 ou WebM válido.");
}

export const nomePagina = (i: number) => `slide-${String(i + 1).padStart(2, "0")}.png`;

/** Frozen version → validated real package for one variant. Assets must be pre-resolved, verified bytes of mc_assets (never URLs). */
export function pacoteParaExportar(id: string, proposta: PropostaEditorial, variante: Variante, doc: DocumentoGrafico, assets: Record<string, Asset> = {}): PacoteProva {
  const bruto = {
    v: 1, id: id.slice(0, 80), nome: (proposta.titulo || "Carrossel").slice(0, 120), sintetico: false,
    conteudo: { slides: proposta.slides.map((s) => ({ id: s.id, titulo: s.titulo, texto: s.texto })) },
    assets,
    variantes: { A: variante === "A" ? doc : { ...doc, variante: "A" }, B: variante === "B" ? doc : { ...doc, variante: "B" } },
  };
  return validarPacote(bruto, { real: true });
}

export interface FicheiroExportado { formato: "png" | "pdf" | "zip" | "mp4"; pagina: number | null; url: string; hash: string; bytes: number; nome: string }

export interface Mp4Pagina { pagina: number; url: string; png: string }

/** posts_drafts row following the contract the current Studio → social flow already uses. */
export function linhaRascunho(a: {
  id: string; userId: string; projectId: string; proposta: PropostaEditorial; pngs: string[];
  /** Recorded slide videos; each takes the PNG's position, with the PNG kept as thumbnail. */
  mp4s?: Mp4Pagina[]; pdf?: string | null;
  trabalhoId: string; documentoId: string; variante: Variante; versao: number; propostaVersao: number;
}) {
  const formato = formatoConteudo(a.proposta.formato);
  if (formato !== "carrossel" && a.pngs.length !== 1) throw new Error("Post e story precisam de uma imagem.");
  if (formato === "carrossel" && !a.pdf) throw new Error("Falta o PDF do carrossel.");
  const platform = formato === "story" ? "instagram_stories" : formato === "post" ? "instagram_image" : "instagram_carousel";
  const formats = formato === "story" ? [platform] : [platform, formato === "post" ? "linkedin_post" : "linkedin_document"];
  const legenda = a.proposta.legenda.slice(0, 2200);
  const videoPorPagina = new Map((a.mp4s ?? [])
    .filter((m) => Number.isInteger(m.pagina) && m.pagina >= 1 && m.pagina <= a.pngs.length && !!m.url)
    .map((m) => [m.pagina, m]));
  const itens = a.pngs.map((url, i) => {
    const v = videoPorPagina.get(i + 1);
    return v
      ? { url: v.url, type: "video", mediaType: "video", source: "estudio", name: `slide-${String(i + 1).padStart(2, "0")}.mp4`, thumbnailUrl: url }
      : { url, type: "image", mediaType: "image", source: "estudio", name: nomePagina(i) };
  });
  return {
    id: a.id,
    user_id: a.userId,
    platform,
    format: platform,
    formats,
    caption: legenda,
    media_urls: itens.map((it) => it.url),
    media_items: itens,
    network_captions: { instagram: legenda, linkedin: legenda },
    use_separate_captions: false,
    publish_immediately: false,
    status: "draft",
    project_id: a.projectId,
    origem: {
      tipo: TIPO_ORIGEM, trabalho_id: a.trabalhoId, documento_id: a.documentoId, variante: a.variante,
      versao: a.versao, proposta_versao: a.propostaVersao, formato, ...(a.pdf ? { pdf_url: a.pdf } : {}), alt: a.proposta.alt.slice(0, 20),
    },
    // Provenance travels with the draft into posts.ai_metadata when it is published (Criar keeps ai_metadata),
    // so a publication can be tied to this exact version and networks even after the draft is consumed.
    ai_metadata: {
      origem_estudio: TIPO_ORIGEM, ...(a.pdf ? { pdf_linkedin_url: a.pdf } : {}),
      motor: { trabalho_id: a.trabalhoId, documento_id: a.documentoId, variante: a.variante, versao: a.versao, proposta_versao: a.propostaVersao, draft_id: a.id, formato, redes: formato === "story" ? ["instagram"] : ["instagram", "linkedin"] },
    },
  };
}
