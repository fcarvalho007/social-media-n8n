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

// Editorial intent: what the carousel is FOR. Distinct from the framework (narrative order) and from the
// visual model (layout). Rules never authorise invented evidence.
export const INTENCOES = [
  { id: "cronica", nome: "Crónica crítica", desc: "Tese própria sobre a fonte, com implicações.",
    regra: "Crónica crítica: a capa afirma a tese do autor; os slides alternam factos da fonte e a leitura do autor, claramente separados; termina com uma implicação ou pergunta." },
  { id: "guia", nome: "Guia prático", desc: "Passos ou critérios aplicáveis.",
    regra: "Guia prático: organiza o que a fonte permite fazer em passos ou critérios acionáveis, um por slide; não acrescentes passos que a fonte não sustente; um resumo ou checklist no penúltimo slide só se ajudar e só com o que já foi dito." },
  { id: "dados", nome: "Leitura de dados", desc: "Explica números que estão na fonte.",
    regra: "Leitura de dados: cada slide parte de um número ou dado presente na fonte (com §) e explica o que significa; não calcules, projetes nem cries números novos; se a fonte tiver poucos dados, usa menos slides de dados e diz o que não se sabe." },
  { id: "antes_depois", nome: "Antes/depois", desc: "Mudança documentada na fonte.",
    regra: "Antes/depois: mostra a situação anterior e a posterior apenas como a fonte as documenta; se a fonte não descrever o 'depois', não o inventes; sem resultados, percentagens ou prazos que não estejam na fonte." },
  { id: "solucao", nome: "Apresentar solução", desc: "Problema e solução já descritos na fonte.",
    regra: "Apresentar solução: apresenta o problema e a solução tal como a fonte os descreve e só os benefícios ou transformações documentados; sem urgência artificial, ROI, depoimentos, garantias nem apelo comercial." },
] as const;
export type Intencao = (typeof INTENCOES)[number]["id"];

export const MAX_PUBLICO_OUTRO = 120;

export interface BriefingEditorial { publico: string[]; publicoOutro: string; cta: Cta | null; intencao: Intencao | null }

export function normalizarBriefing(b: { publico?: unknown; publicoOutro?: unknown; cta?: unknown; intencao?: unknown } | null | undefined): BriefingEditorial {
  const ids = new Set<string>(PUBLICOS.map((p) => p.id));
  const publico = Array.isArray(b?.publico) ? [...new Set(b!.publico.filter((x): x is string => typeof x === "string" && ids.has(x)))] : [];
  return {
    publico,
    publicoOutro: String(b?.publicoOutro ?? "").trim().slice(0, MAX_PUBLICO_OUTRO),
    cta: CTAS.find((c) => c.id === b?.cta)?.id ?? null,
    intencao: INTENCOES.find((i) => i.id === b?.intencao)?.id ?? null,
  };
}

/** Prompt lines for the user message (choices, not facts). */
export function linhasBriefing(b: BriefingEditorial): string[] {
  const nomes = [...b.publico.map((id) => PUBLICOS.find((p) => p.id === id)!.nome), ...(b.publicoOutro ? [b.publicoOutro] : [])];
  const cta = b.cta ? CTAS.find((c) => c.id === b.cta)!.regra : "";
  const int = b.intencao ? INTENCOES.find((i) => i.id === b.intencao)!.regra : "";
  return [int ? `Intenção editorial: ${int}` : "", nomes.length ? `Público deste carrossel: ${nomes.join("; ")}.` : "", cta ? `Apelo final: ${cta}` : ""].filter(Boolean);
}

/** Tone text sent to the server: preset name + description, or free text. */
export function textoTom(preset: string | null, livre: string): string {
  const t = TONS.find((x) => x.id === preset);
  const base = t ? `${t.nome} — ${t.desc}` : "";
  return [base, livre.trim()].filter(Boolean).join(" ").slice(0, 80);
}
