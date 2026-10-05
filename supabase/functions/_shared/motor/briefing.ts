// Editorial briefing presets (tone, audience, call to action, length). Each choice is stored in the
// job brief and turned into prompt lines; nothing here is decorative. Pure module.
export const TONS = [
  { id: "critico", nome: "Crítico e provocador", desc: "Questiona e toma posição, com substância." },
  { id: "pedagogico", nome: "Pedagógico", desc: "Explica passo a passo, para leigos." },
  { id: "pragmatico", nome: "Pragmático", desc: "Vai direto ao que fazer." },
  { id: "proximo", nome: "Profissional próximo", desc: "Sóbrio, mas caloroso e natural." },
] as const;

export const PUBLICOS = [
  { id: "marketing", nome: "Profissionais de marketing" },
  { id: "gestores", nome: "Gestores e empresários" },
  { id: "pme", nome: "PME portuguesas" },
] as const;

export const CTAS = [
  { id: "refletir", nome: "Refletir", regra: "Fecha com uma pergunta ou reflexão para o leitor." },
  { id: "comentar", nome: "Comentar", regra: "Fecha a convidar o leitor a comentar a sua experiência ou opinião." },
  { id: "guardar", nome: "Guardar", regra: "Fecha a convidar o leitor a guardar o carrossel para consultar depois." },
  { id: "newsletter", nome: "Ler a newsletter", regra: "Fecha a convidar a ler a newsletter, sem inventar nomes, endereços nem URLs." },
] as const;
export type Cta = (typeof CTAS)[number]["id"];

export type Quantidade = "breve" | "equilibrado" | "aprofundado";
export const QUANTIDADES: { id: Quantidade; nome: string }[] = [
  { id: "breve", nome: "Breve" }, { id: "equilibrado", nome: "Equilibrado" }, { id: "aprofundado", nome: "Aprofundado" },
];

/** Real slide counts for each preset, always within what the source can support. */
export function slidesPorQuantidade(sugeridos: number, max: number): Record<Quantidade, number> {
  const lim = (n: number) => Math.max(2, Math.min(Math.max(2, max), Math.round(n)));
  return { breve: lim(Math.min(sugeridos - 2, sugeridos * 0.6)), equilibrado: lim(sugeridos), aprofundado: lim(Math.max(sugeridos + 2, sugeridos * 1.5)) };
}

export const MAX_PUBLICO_OUTRO = 120;

export interface BriefingEditorial { publico: string[]; publicoOutro: string; cta: Cta | null }

export function normalizarBriefing(b: { publico?: unknown; publicoOutro?: unknown; cta?: unknown } | null | undefined): BriefingEditorial {
  const ids = new Set<string>(PUBLICOS.map((p) => p.id));
  const publico = Array.isArray(b?.publico) ? [...new Set(b!.publico.filter((x): x is string => typeof x === "string" && ids.has(x)))] : [];
  return {
    publico,
    publicoOutro: String(b?.publicoOutro ?? "").trim().slice(0, MAX_PUBLICO_OUTRO),
    cta: CTAS.find((c) => c.id === b?.cta)?.id ?? null,
  };
}

/** Prompt lines for the user message (choices, not facts). */
export function linhasBriefing(b: BriefingEditorial): string[] {
  const nomes = [...b.publico.map((id) => PUBLICOS.find((p) => p.id === id)!.nome), ...(b.publicoOutro ? [b.publicoOutro] : [])];
  const cta = b.cta ? CTAS.find((c) => c.id === b.cta)!.regra : "";
  return [nomes.length ? `Público deste carrossel: ${nomes.join("; ")}.` : "", cta ? `Apelo final: ${cta}` : ""].filter(Boolean);
}

/** Tone text sent to the server: preset name + description, or free text. */
export function textoTom(preset: string | null, livre: string): string {
  const t = TONS.find((x) => x.id === preset);
  const base = t ? `${t.nome} — ${t.desc}` : "";
  return [base, livre.trim()].filter(Boolean).join(" ").slice(0, 80);
}
