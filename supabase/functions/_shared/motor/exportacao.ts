// Pure export/draft helpers shared by the mc-motor server and the tests (no Deno/npm runtime imports).
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
  if (!/^[a-z0-9-]{1,40}\.(png|pdf|zip)$/.test(nome) || !/^[0-9a-f]{64}$/.test(hash)) throw new Error("Caminho inválido.");
  const [base, ext] = nome.split(".");
  return `motor/${projectId}/${documentoId}/v${versao}/${base}-${hash.slice(0, 16)}.${ext}`;
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

export interface FicheiroExportado { formato: "png" | "pdf" | "zip"; pagina: number | null; url: string; hash: string; bytes: number; nome: string }

/** posts_drafts row following the contract the current Studio → social flow already uses. */
export function linhaRascunho(a: {
  id: string; userId: string; projectId: string; proposta: PropostaEditorial; pngs: string[]; pdf: string;
  trabalhoId: string; documentoId: string; variante: Variante; versao: number; propostaVersao: number;
}) {
  const legenda = a.proposta.legenda.slice(0, 2200);
  return {
    id: a.id,
    user_id: a.userId,
    platform: "instagram_carousel",
    format: "instagram_carousel",
    formats: ["instagram_carousel", "linkedin_document"],
    caption: legenda,
    media_urls: a.pngs,
    media_items: a.pngs.map((url, i) => ({ url, type: "image", mediaType: "image", source: "estudio", name: nomePagina(i) })),
    network_captions: { instagram: legenda, linkedin: legenda },
    use_separate_captions: false,
    publish_immediately: false,
    status: "draft",
    project_id: a.projectId,
    origem: {
      tipo: TIPO_ORIGEM, trabalho_id: a.trabalhoId, documento_id: a.documentoId, variante: a.variante,
      versao: a.versao, proposta_versao: a.propostaVersao, pdf_url: a.pdf, alt: a.proposta.alt.slice(0, 20),
    },
    // Provenance travels with the draft into posts.ai_metadata when it is published (Criar keeps ai_metadata),
    // so a publication can be tied to this exact version and networks even after the draft is consumed.
    ai_metadata: {
      origem_estudio: TIPO_ORIGEM, pdf_linkedin_url: a.pdf,
      motor: { trabalho_id: a.trabalhoId, documento_id: a.documentoId, variante: a.variante, versao: a.versao, proposta_versao: a.propostaVersao, draft_id: a.id, redes: ["instagram", "linkedin"] },
    },
  };
}
