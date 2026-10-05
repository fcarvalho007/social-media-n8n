// Reusable author context per project. Snapshotted into the job brief at creation so later profile
// edits never change existing jobs. Pure module (browser + Deno + Vitest).
export const VOZES_AUTOR = [
  { id: "consultor", nome: "Autor consultor" },
  { id: "critico", nome: "Olhar crítico e disruptivo, com substância" },
  { id: "implicacoes", nome: "Interpretar implicações práticas" },
  { id: "reflexao", nome: "Provocar reflexão" },
  { id: "nao_resumo", nome: "Evitar mero resumo da notícia" },
  { id: "pt_pt", nome: "Português europeu (pt-PT)" },
  { id: "pedagogico", nome: "Clara, pragmática e pedagógica" },
  { id: "sem_jargao", nome: "Natural, sem floreados nem jargão desnecessário" },
] as const;
export type VozAutor = (typeof VOZES_AUTOR)[number]["id"];
/** Owner-confirmed base; used when the project has no saved profile yet. */
export const VOZ_BASE: VozAutor[] = ["consultor", "critico", "implicacoes", "reflexao", "nao_resumo", "pt_pt"];
export const MAX_NOTAS_AUTOR = 800;
export const LIMITES_PERFIL = { notas: 800, apresentacao: 1500, publico: 500, teses: 2000, objetivo_cronica: 500 } as const;

/** Per-job reading angle (not stored in the profile). */
export const ANGULOS = [
  { id: "implicacoes_negocio", nome: "Implicações para o negócio" },
  { id: "questionar_hype", nome: "Questionar o hype" },
  { id: "aplicacao_pratica", nome: "Aplicação prática" },
] as const;
export type Angulo = (typeof ANGULOS)[number]["id"];
export const MAX_LEITURA_ESPECIFICA = 300;

export interface PerfilAutor {
  voz: VozAutor[];
  notas: string;
  apresentacao: string;
  publico: string;
  teses: string;
  objetivo_cronica: string;
}
export interface LeituraTrabalho { angulo: Angulo | null; especifica: string }

const txt = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

export function normalizarPerfil(p: Partial<Record<keyof PerfilAutor, unknown>> | null | undefined): PerfilAutor {
  const vazio = { notas: "", apresentacao: "", publico: "", teses: "", objetivo_cronica: "" };
  if (!p) return { voz: [...VOZ_BASE], ...vazio };
  const validos = new Set<string>(VOZES_AUTOR.map((v) => v.id));
  const voz = Array.isArray(p.voz) ? [...new Set(p.voz.filter((v): v is VozAutor => typeof v === "string" && validos.has(v)))] : [];
  return {
    voz,
    notas: txt(p.notas, LIMITES_PERFIL.notas),
    apresentacao: txt(p.apresentacao, LIMITES_PERFIL.apresentacao),
    publico: txt(p.publico, LIMITES_PERFIL.publico),
    teses: txt(p.teses, LIMITES_PERFIL.teses),
    objetivo_cronica: txt(p.objetivo_cronica, LIMITES_PERFIL.objetivo_cronica),
  };
}

export function normalizarLeitura(angulo: unknown, especifica: unknown): LeituraTrabalho {
  const a = ANGULOS.find((x) => x.id === angulo)?.id ?? null;
  return { angulo: a, especifica: txt(especifica, MAX_LEITURA_ESPECIFICA) };
}

/** System-prompt rules: author context as a lens + strict separation of source facts and author reading. */
export function regrasAutor(p: PerfilAutor, leitura: boolean, lt?: LeituraTrabalho | null): string {
  const nomes = p.voz.map((id) => VOZES_AUTOR.find((v) => v.id === id)?.nome).filter(Boolean);
  const angulo = lt?.angulo ? ANGULOS.find((a) => a.id === lt.angulo)?.nome : null;
  return [
    "<contexto_autor> (lente de leitura fornecida pelo autor; não são factos da fonte)",
    p.apresentacao ? `Quem escreve: ${p.apresentacao}` : "",
    p.publico ? `Público: ${p.publico}` : "",
    nomes.length ? `Voz: ${nomes.join("; ")}.` : "",
    p.teses ? `Teses do autor (usar só quando pertinentes para esta fonte): ${p.teses}` : "",
    p.objetivo_cronica ? `Objetivo da crónica: ${p.objetivo_cronica}` : "",
    p.notas ? `Especificidades: ${p.notas}` : "",
    angulo ? `Ângulo pedido para este carrossel: ${angulo}.` : "",
    lt?.especifica ? `Leitura específica do autor para esta fonte: ${lt.especifica}` : "",
    "</contexto_autor>",
    "Separa FACTOS de INTERPRETAÇÃO. Factos vêm só da fonte e citam § em 'fontes'; nunca uses o contexto do autor como fonte de factos.",
    leitura
      ? "Este carrossel é a leitura do autor: tese própria, implicações e uma ação ou reflexão útil, não um resumo. Apresenta a interpretação explicitamente como leitura do autor (ex.: «A minha leitura:», «O que isto pode significar»)."
      : "Interpretação do autor só no fecho, e sempre identificada como leitura, nunca como facto.",
    "Usa o contexto como lente; não repitas a biografia nos slides.",
    "Nunca inventes estudos, números, métricas, citações, credenciais, clientes, falas nem experiências pessoais do autor. Nunca atribuas à fonte a opinião do autor, nem ao autor a opinião da fonte.",
  ].filter(Boolean).join("\n");
}

/** Display name of the author-reading objective; the objective text sent to the server starts with it. */
export const OBJETIVO_LEITURA = "A minha leitura";
