import type { PropostaEditorial } from "../../../supabase/functions/_shared/motor/proposta";

export type ResultadoFusao =
  | { ok: true; conteudo: PropostaEditorial }
  | { ok: false; motivo: "contagem"; atual: number; proposta: number };

/**
 * Applies a framework proposal onto the current narrative without touching the composition:
 * slide ids (bound to the visual layers) are kept; text, role and § evidence come from the proposal.
 * Different slide counts are refused — the caller offers the proposal as a separate carousel instead.
 */
export function fundirProposta(atual: PropostaEditorial, proposta: PropostaEditorial): ResultadoFusao {
  if (atual.slides.length !== proposta.slides.length) {
    return { ok: false, motivo: "contagem", atual: atual.slides.length, proposta: proposta.slides.length };
  }
  return {
    ok: true,
    conteudo: {
      ...atual,
      metodo: "ia",
      demonstracao: false,
      titulo: proposta.titulo,
      slides: atual.slides.map((s, i) => ({ ...s, papel: proposta.slides[i].papel, titulo: proposta.slides[i].titulo, texto: proposta.slides[i].texto, fontes: [...proposta.slides[i].fontes] })),
      legenda: proposta.legenda,
      alt: proposta.alt ?? atual.alt,
    },
  };
}

const CHAVE = (trabalhoId: string) => `mc-estrutura:${trabalhoId}`;
export interface EstruturaPendente { trabalho: string; framework: string }
export function lerPendente(trabalhoId: string): EstruturaPendente | null {
  try { const v = localStorage.getItem(CHAVE(trabalhoId)); return v ? JSON.parse(v) as EstruturaPendente : null; } catch { return null; }
}
export function guardarPendente(trabalhoId: string, p: EstruturaPendente | null) {
  try { if (p) localStorage.setItem(CHAVE(trabalhoId), JSON.stringify(p)); else localStorage.removeItem(CHAVE(trabalhoId)); } catch { /* sem armazenamento: só nesta sessão */ }
}

// ---------- hybrid per-slide merge (deterministic, free: no AI) ----------

/** `escopo` = slide id for single-slide regenerations (usable only for that slide). */
export interface Candidato { trabalho: string; framework: string; conteudo: PropostaEditorial; escopo?: string | null }
/** Per slide index: null = keep current; otherwise the candidate job id supplying that slide. */
export type Selecao = (string | null)[];

export type Compatibilidade = { ok: true } | { ok: false; motivo: string };

/** Same slide count and cover/close in the same places; never aligns different-sized sets by index. */
export function compatibilidade(atual: PropostaEditorial, c: PropostaEditorial): Compatibilidade {
  if (c.slides.length !== atual.slides.length) return { ok: false, motivo: `Tem ${c.slides.length} slides e o atual tem ${atual.slides.length}; não é possível comparar slide a slide.` };
  for (let i = 0; i < atual.slides.length; i++) {
    const a = atual.slides[i].papel, p = c.slides[i].papel;
    if ((a === "capa" || a === "fecho" || p === "capa" || p === "fecho") && a !== p) return { ok: false, motivo: `O slide ${i + 1} é «${a}» no atual e «${p}» na proposta.` };
  }
  return { ok: true };
}

export type ResultadoSelecao =
  | { ok: true; conteudo: PropostaEditorial; trocados: number; transicoes: number[] }
  | { ok: false; motivo: string };

/**
 * Builds the merged narrative: chosen slides take title, text, § sources, role and alt text from their
 * candidate; slide ids (bound to the composition), caption and everything else stay current.
 * `transicoes` lists boundaries where adjacent slides come from different origins (review hint only).
 */
export function fundirSelecao(atual: PropostaEditorial, candidatos: Candidato[], selecao: Selecao): ResultadoSelecao {
  if (selecao.length !== atual.slides.length) return { ok: false, motivo: "A seleção não corresponde ao número de slides atual." };
  const porId = new Map(candidatos.map((c) => [c.trabalho, c]));
  const origem: Record<string, { framework: string; trabalho: string }> = { ...(atual.origem_slides ?? {}) };
  const alt = [...(atual.alt ?? atual.slides.map(() => ""))];
  let trocados = 0;
  const slides = atual.slides.map((s, i) => {
    const id = selecao[i];
    if (!id) return s;
    const c = porId.get(id);
    if (!c) throw new Error(`Proposta ${id} indisponível.`);
    const escopo = c.escopo ?? c.conteudo.escopo_slide ?? null;
    if (escopo && escopo !== s.id) throw new Error(`Essa alternativa foi gerada só para outro slide; não pode entrar no slide ${i + 1}.`);
    const comp = compatibilidade(atual, c.conteudo);
    if ("motivo" in comp) throw new Error(comp.motivo);
    const p = c.conteudo.slides[i];
    trocados++;
    alt[i] = c.conteudo.alt?.[i] ?? alt[i];
    origem[s.id] = { framework: c.framework, trabalho: c.trabalho };
    return { ...s, papel: p.papel, titulo: p.titulo, texto: p.texto, fontes: [...p.fontes] };
  });
  const transicoes: number[] = [];
  for (let i = 1; i < selecao.length; i++) if ((selecao[i] ?? null) !== (selecao[i - 1] ?? null)) transicoes.push(i);
  if (!trocados) return { ok: false, motivo: "Nenhum slide foi escolhido." };
  return { ok: true, trocados, transicoes, // Title follows slide 1 (same invariant as aplicarTextoNaProposta) so autosave sees no diff and never writes a duplicate version.
    conteudo: { ...atual, escopo_slide: undefined, metodo: "ia", demonstracao: false, titulo: slides[0]?.titulo ?? atual.titulo, slides, alt, origem_slides: origem } };
}

const CHAVE_SEL = (trabalhoId: string, versao: number) => `mc-selecao:${trabalhoId}:v${versao}`;
/** Selection survives refresh, isolated per document and base version (a newer version starts empty). */
export function lerSelecao(trabalhoId: string, versao: number, n: number): Selecao {
  try {
    const v = JSON.parse(localStorage.getItem(CHAVE_SEL(trabalhoId, versao)) ?? "null") as unknown;
    if (Array.isArray(v) && v.length === n) return v.map((x) => (typeof x === "string" ? x : null));
  } catch { /* ignore */ }
  return Array.from({ length: n }, () => null);
}
export function guardarSelecao(trabalhoId: string, versao: number, s: Selecao | null) {
  try { if (s && s.some(Boolean)) localStorage.setItem(CHAVE_SEL(trabalhoId, versao), JSON.stringify(s)); else localStorage.removeItem(CHAVE_SEL(trabalhoId, versao)); } catch { /* session only */ }
}
