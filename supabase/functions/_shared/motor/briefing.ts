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

export const MAX_TONS = 2;
export const MAX_INTENCOES = 2;
export const MAX_PUBLICOS = 3;
export type Tom = (typeof TONS)[number]["id"];

/** What each audience needs to take away; used only as prompt guidance. */
const NECESSIDADE_PUBLICO: Record<string, string> = {
  marketing: "o que muda no trabalho de marketing e como aplicar",
  gestores: "a decisão a tomar, o impacto e o risco para o negócio",
  pme: "a aplicação realista com poucos recursos e equipas pequenas",
};
/** How each tone behaves when combined with another one. */
const PAPEL_TOM: Record<string, string> = {
  critico: "toma posição e questiona na tese e nas implicações",
  pedagogico: "explica os conceitos passo a passo, sem jargão",
  pragmatico: "converte cada ideia em algo a fazer",
  proximo: "mantém uma voz sóbria e calorosa em todo o texto",
};

export interface BriefingEditorial { publico: string[]; publicoOutro: string; cta: Cta | null; intencao: Intencao | null; intencoes: Intencao[]; tons: Tom[] }

/** Keeps order, removes duplicates/unknown ids, caps to `max` (most recent choices win). */
export function limitarEscolhas<T extends string>(lista: unknown, validos: readonly T[], max: number): T[] {
  if (!Array.isArray(lista)) return [];
  const ok = [...new Set(lista.filter((x): x is T => typeof x === "string" && (validos as readonly string[]).includes(x)))];
  return ok.slice(Math.max(0, ok.length - max));
}

/** Toggle helper for capped multi-select: adding beyond the cap drops the oldest choice. */
export function alternarEscolha<T>(lista: T[], id: T, max: number): T[] {
  if (lista.includes(id)) return lista.filter((x) => x !== id);
  const n = [...lista, id];
  return n.slice(Math.max(0, n.length - max));
}

export function normalizarBriefing(b: { publico?: unknown; publicoOutro?: unknown; cta?: unknown; intencao?: unknown; intencoes?: unknown; tons?: unknown } | null | undefined): BriefingEditorial {
  const publico = limitarEscolhas(b?.publico, PUBLICOS.map((p) => p.id), MAX_PUBLICOS);
  const idsInt = INTENCOES.map((i) => i.id);
  // Legacy documents carry a single `intencao`; it becomes the primary intent.
  const intencoes = Array.isArray(b?.intencoes) ? limitarEscolhas<Intencao>(b!.intencoes, idsInt, MAX_INTENCOES) : limitarEscolhas<Intencao>([b?.intencao], idsInt, 1);
  return {
    publico,
    publicoOutro: String(b?.publicoOutro ?? "").trim().slice(0, MAX_PUBLICO_OUTRO),
    cta: CTAS.find((c) => c.id === b?.cta)?.id ?? null,
    intencao: intencoes[0] ?? null,
    intencoes,
    tons: limitarEscolhas<Tom>(b?.tons, TONS.map((t) => t.id), MAX_TONS),
  };
}

/** Deterministic synthesis telling the model to re-read the source in light of all choices. */
export function blocoDirecaoEditorial(b: BriefingEditorial, desafio?: { objetivo?: string }): string[] {
  const tons = b.tons.map((id) => TONS.find((t) => t.id === id)!);
  const pubs = b.publico.map((id) => PUBLICOS.find((p) => p.id === id)!);
  if (!tons.length && !pubs.length && !b.publicoOutro && !b.intencoes.length) return [];
  const l = ["Direção editorial (aplica a TODOS os slides; não é matéria factual):"];
  if (desafio?.objetivo) l.push(`- Desafio: ${desafio.objetivo}`);
  if (pubs.length || b.publicoOutro) l.push(`- Para quem: ${[...pubs.map((p) => `${p.nome} (precisa de ${NECESSIDADE_PUBLICO[p.id]})`), ...(b.publicoOutro ? [b.publicoOutro] : [])].join("; ")}. Com vários públicos, escolhe exemplos e implicações que sirvam todos; não escrevas uma secção por público.`);
  if (tons.length === 1) l.push(`- Como soa: ${tons[0].nome} — ${tons[0].desc}`);
  if (tons.length === 2) l.push(`- Como soa: combina ${tons[0].nome} e ${tons[1].nome}: o primeiro ${PAPEL_TOM[tons[0].id]}; o segundo ${PAPEL_TOM[tons[1].id]}. Se os tons entrarem em tensão, prevalece o primeiro na capa e no fecho, e o segundo no desenvolvimento.`);
  if (b.intencoes.length === 2) l.push(`- Para que serve: a intenção principal (acima) define a espinha do carrossel; a secundária só entra onde a fonte o sustente, sem desviar a estrutura.`);
  l.push("- Relê a fonte à luz desta direção: escolhe os factos que mais servem este público e este desafio, ordena-os segundo a estrutura pedida e escreve no tom indicado. A direção muda a seleção, a ordem e a voz; nunca os factos.");
  l.push("- Continua proibido: factos, números, citações ou exemplos que não estejam na fonte; cada afirmação factual mantém o seu §.");
  return l;
}

/** Prompt lines for the user message (choices, not facts). */
export function linhasBriefing(b: BriefingEditorial): string[] {
  const nomes = [...b.publico.map((id) => PUBLICOS.find((p) => p.id === id)!.nome), ...(b.publicoOutro ? [b.publicoOutro] : [])];
  const cta = b.cta ? CTAS.find((c) => c.id === b.cta)!.regra : "";
  const [p, sec] = b.intencoes.map((id) => INTENCOES.find((i) => i.id === id)!.regra);
  return [p ? `Intenção editorial: ${p}` : "", sec ? `Intenção secundária: ${sec}` : "", nomes.length ? `Público deste carrossel: ${nomes.join("; ")}.` : "", cta ? `Apelo final: ${cta}` : "", ...blocoDirecaoEditorial(b)].filter(Boolean);
}

/** Tone text sent to the server: preset name + description, or free text. */
export const MAX_TOM = 300;
export function textoTom(preset: string | string[] | null, livre: string): string {
  const ids = Array.isArray(preset) ? preset : preset ? [preset] : [];
  const base = ids.map((id) => TONS.find((x) => x.id === id)).filter(Boolean).map((t) => `${t!.nome} — ${t!.desc}`).join(" + ");
  return [base, livre.trim()].filter(Boolean).join(" ").slice(0, MAX_TOM);
}
