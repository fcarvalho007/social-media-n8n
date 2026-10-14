// Editorial launch kit. No AI, network, scheduler or social publication side effects.
import { linkDivulgacao, dividirTexto, slidesDosDestaques, slideFinalNewsletter, validarCarrossel, verificarLeiturasLiterais, type Carrossel, type FonteCronica } from "./carrossel.ts";

export interface StoryEdicao { titulo: string; texto: string; cta: string; url: string }
export interface DivulgacaoEdicao {
  schema: 1; fonte_hash: string; teste: boolean; confirmado_em: string | null;
  story: StoryEdicao; estado: "rascunho" | "revisto";
}
export const LIMITES_STORY = { titulo: 140, texto: 260, cta: 40 } as const;

export { linkDivulgacao } from "./carrossel.ts";

export function validarStory(s: StoryEdicao): StoryEdicao {
  for (const k of ["titulo", "texto", "cta"] as const) {
    if (typeof s[k] !== "string" || !s[k].trim() || s[k].length > LIMITES_STORY[k]) throw new Error(`Revê ${k === "cta" ? "o convite" : `o ${k}`} do Story (máximo ${LIMITES_STORY[k]} caracteres).`);
  }
  const u = new URL(s.url);
  if (u.protocol !== "https:" || u.username || u.password || s.url.length > 1500) throw new Error("Usa um endereço HTTPS público para o Story.");
  return { titulo: s.titulo.trim(), texto: s.texto.trim(), cta: s.cta.trim(), url: s.url };
}

export function prepararDivulgacaoBase(fonte: FonteCronica, confirmadoEm: string | null): DivulgacaoEdicao {
  if (!fonte.teste && (!confirmadoEm || !Number.isFinite(Date.parse(confirmadoEm)))) throw new Error("A divulgação automática precisa de um envio real confirmado.");
  const titulo = fonte.titulo.length <= LIMITES_STORY.titulo ? fonte.titulo : `A crónica da edição #${fonte.numero}`;
  const normalizarTitulo = (t: string) => t.replace(/\s+/g, " ").trim().toLocaleLowerCase("pt-PT").replace(/[.!?:;…]+$/, "");
  const candidatos = fonte.paragrafos.filter((p) => p.trim() && !p.startsWith("[Destaque") && normalizarTitulo(p) !== normalizarTitulo(fonte.titulo));
  // Imported HTML may repeat the heading as paragraph 1. Prefer prose to a short section label.
  const primeiro = candidatos.find((p) => p.trim().length >= 80) ?? candidatos[0] ?? "";
  // A literal excerpt with an explicit ellipsis, never presented as a full quotation.
  const partes = dividirTexto(primeiro, LIMITES_STORY.texto - 2);
  const texto = partes.length ? `${partes[0]}${partes.length > 1 ? "…" : ""}` : `Já podes ler a crónica da edição #${fonte.numero}.`;
  return { schema: 1, fonte_hash: fonte.hash, teste: !!fonte.teste, confirmado_em: fonte.teste ? null : confirmadoEm,
    estado: "rascunho", story: validarStory({ titulo, texto, cta: "Ler a crónica", url: linkDivulgacao(fonte.url, fonte.numero, "story_d0") }) };
}

/** The next-day piece offers a different angle: highlights, rather than repeating the launch chronicle. */
export function carrosselDivulgacao(fonte: FonteCronica): Carrossel | null {
  if (!fonte.destaques?.length) return null; // Keep old chronicle-only editions supported.
  const c = validarCarrossel({
    slides: [{ titulo: `${fonte.destaques.length} destaques para ler com outra perspetiva`, texto: `Da edição #${fonte.numero} da DIGITALSPRINT: os factos, as fontes e a leitura de Frederico Carvalho. Desliza para explorar.`, fontes: [] },
      ...slidesDosDestaques(fonte), slideFinalNewsletter(fonte)],
    legenda: `Os destaques da DIGITALSPRINT #${fonte.numero}, com as fontes originais e a minha leitura.\n\nGuarda para ler com tempo. A edição completa reúne a crónica e as restantes novidades.`,
  }, fonte);
  verificarLeiturasLiterais(c, fonte);
  return c;
}

/** Fail closed: an internal campaign can never confirm the launch of a real edition. */
export function campanhaReal(c: { tipo?: string | null }): boolean { return c.tipo === "real"; }
