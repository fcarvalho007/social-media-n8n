// Narrative frameworks for carousel proposals. Pure TS (shared by browser and edge).
// Each structure adapts to the frozen source: it never invents problems, benefits, promises,
// statistics or commercial CTAs; every factual slide still cites § paragraphs.
export type FrameworkId = "editorial" | "pas" | "aida" | "ponte" | "valor";

export interface Framework {
  id: FrameworkId;
  nome: string;
  descricao: string;
  /** Model-facing structure rules (system prompt addendum). */
  regras: string;
}

const COMUM = [
  "Adapta a estrutura ao que a fonte realmente diz. Se a fonte não tiver um elemento da estrutura (problema, dor, benefício, resultado), não o inventes: usa o elemento mais próximo que a fonte sustente ou funde etapas.",
  "Proibido acrescentar promessas, garantias, números, percentagens, prazos, preços, testemunhos ou apelos comerciais que não estejam na fonte.",
  "O fecho propõe no máximo uma ação, a do apelo final pedido (se nenhum, reflexão ou ler a fonte); nunca vende.",
];

export const FRAMEWORKS: readonly Framework[] = [
  {
    id: "editorial",
    nome: "Editorial",
    descricao: "Explica com contexto e clareza.",
    regras: "Estrutura editorial: capa com a ideia central; contexto; desenvolvimento por pontos sustentados; fecho que resume.",
  },
  {
    id: "pas",
    nome: "PAS",
    descricao: "Problema, agitação, solução.",
    regras: "Estrutura PAS: capa com o problema descrito na fonte; um ou dois slides que mostram as consequências que a fonte refere (sem exagerar); solução ou resposta que a fonte apresenta; fecho.",
  },
  {
    id: "aida",
    nome: "AIDA",
    descricao: "Atenção, interesse, desejo, ação.",
    regras: "Estrutura AIDA: capa que capta atenção com um facto da fonte; interesse com detalhe; relevância para o leitor apenas se a fonte a sustentar; fecho com uma ação neutra (ler, guardar, refletir), nunca comprar.",
  },
  {
    id: "ponte",
    nome: "Antes/Depois/Ponte",
    descricao: "Situação atual, mudança e o que liga as duas.",
    regras: "Estrutura Antes/Depois/Ponte: situação antes segundo a fonte; situação depois segundo a fonte; a ponte (o que mudou ou o que permite a mudança) segundo a fonte; fecho. Se a fonte não descrever um 'depois', descreve o que está em curso sem prever resultados.",
  },
  {
    id: "valor",
    nome: "Direto ao valor",
    descricao: "O essencial primeiro, inspirado em Hormozi.",
    regras: "Estrutura 'direto ao valor' (inspirada em Alex Hormozi, sem o tom de venda): capa com a conclusão mais útil da fonte; slides curtos, um ponto prático por slide, cada um sustentado; sem promessas de resultado; fecho que resume o ponto mais útil.",
  },
];

export function obterFramework(id: unknown): Framework | null {
  return FRAMEWORKS.find((f) => f.id === id) ?? null;
}

export function regrasFramework(f: Framework): string {
  return [`Estrutura pedida: ${f.nome}.`, f.regras, ...COMUM].join("\n");
}
