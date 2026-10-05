// Reusable author voice per project. Snapshotted into the job brief at creation so later profile
// edits never change existing jobs. Pure module (browser + Deno + Vitest).
export const VOZES_AUTOR = [
  { id: "consultor", nome: "Autor consultor" },
  { id: "critico", nome: "Olhar crítico e disruptivo, com substância" },
  { id: "implicacoes", nome: "Interpretar implicações práticas" },
  { id: "reflexao", nome: "Provocar reflexão" },
  { id: "nao_resumo", nome: "Evitar mero resumo da notícia" },
  { id: "pt_pt", nome: "Português europeu (pt-PT)" },
] as const;
export type VozAutor = (typeof VOZES_AUTOR)[number]["id"];
/** Owner-confirmed base; used when the project has no saved profile yet. */
export const VOZ_BASE: VozAutor[] = VOZES_AUTOR.map((v) => v.id);
export const MAX_NOTAS_AUTOR = 800;

export interface PerfilAutor { voz: VozAutor[]; notas: string }

export function normalizarPerfil(p: { voz?: unknown; notas?: unknown } | null | undefined): PerfilAutor {
  if (!p) return { voz: [...VOZ_BASE], notas: "" };
  const validos = new Set<string>(VOZES_AUTOR.map((v) => v.id));
  const voz = Array.isArray(p.voz) ? [...new Set(p.voz.filter((v): v is VozAutor => typeof v === "string" && validos.has(v)))] : [];
  return { voz, notas: String(p.notas ?? "").trim().slice(0, MAX_NOTAS_AUTOR) };
}

/** System-prompt rules: author voice + strict separation of source facts and author reading. */
export function regrasAutor(p: PerfilAutor, leitura: boolean): string {
  const nomes = p.voz.map((id) => VOZES_AUTOR.find((v) => v.id === id)?.nome).filter(Boolean);
  return [
    nomes.length ? `Voz do autor: ${nomes.join("; ")}.` : "",
    p.notas ? `Especificidades indicadas pelo autor (preferências, não factos): ${p.notas}` : "",
    "Separa FACTOS de INTERPRETAÇÃO. Factos vêm só da fonte e citam § em 'fontes'.",
    leitura
      ? "Este carrossel é a leitura do autor: podes ir além do resumo e interpretar implicações, mas apresenta-o explicitamente como leitura do autor (ex.: «A minha leitura:», «O que isto pode significar»)."
      : "Interpretação do autor só no fecho, e sempre identificada como leitura, nunca como facto.",
    "Nunca inventes estudos, números, citações, credenciais, biografia nem experiências pessoais do autor. Nunca atribuas à fonte a opinião do autor, nem ao autor a opinião da fonte.",
  ].filter(Boolean).join("\n");
}
