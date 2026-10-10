// Redacção editorial do Brief. Server-only.
//
// Cada peça tem uma chamada própria, para se poder regenerar só essa peça.
// A escrita parte dos factos estruturados, nunca do artigo original.

import type { SupabaseClient } from "npm:npm:@supabase/supabase-js@2.57.4@2.57.4";

import { chamarIaBrief } from "./adaptador-ia.server.ts";
import type { FactoBrief, ImplicacaoBrief, ParagrafoBrief, TipoBrief } from "./tipos.ts";

export type Intencao =
  | "normal"
  | "mais_pragmatico"
  | "mais_curto"
  | "menos_opinativo"
  | "outro_angulo"
  | "simplificar";

const ROTULO_INTENCAO: Record<Intencao, string> = {
  normal: "",
  mais_pragmatico: "Torna o texto mais pragmático: consequências concretas, decisões possíveis.",
  mais_curto: "Corta para o essencial: menos palavras, mesma informação.",
  menos_opinativo: "Retira juízo de valor: fica factual e sóbrio.",
  outro_angulo: "Escolhe outro ângulo do mesmo material, sem repetir a versão anterior.",
  simplificar: "Simplifica a linguagem: frases curtas, sem jargão, siglas explicadas.",
};

const BASE = `Escreves para a Digital Sprint, em português europeu (pt-PT), para gestores e profissionais de marketing e negócio digital.

Regras duras:
- Trabalha só com os factos recebidos. Nunca acrescentes números, datas ou nomes que não estejam lá.
- Texto original: não traduzas nem reescrevas frases do artigo de origem.
- Sem emojis, sem reticências, sem entusiasmo gratuito, sem floreados.
- Explica siglas na primeira utilização. Evita citações; se forem mesmo precisas, curtas e atribuídas.`;

const SISTEMA_30 = `${BASE}

Escreves a secção «Em 30 segundos»: o que aconteceu, em factos.

Devolve APENAS JSON válido: {"paragrafos":["",""]}
- Destaque: 2 a 3 parágrafos curtos. Radar: 1 a 2.
- Cada parágrafo tem 2 a 4 frases completas. Sem opinião.`;

const SISTEMA_PORQUE = `${BASE}

Escreves a secção «Porque interessa»: implicações para quem decide.

Devolve APENAS JSON válido: {"implicacoes":[{"rotulo":"","texto":""}]}
- Destaque: 2 a 3 implicações. Radar: 1 a 2.
- rotulo: 2 a 5 palavras, sentence case.
- texto: 1 a 3 frases. Podes inferir consequências, mas não introduzas números ou dados concretos novos.`;

const SISTEMA_LEITURA = `${BASE}

Escreves uma leitura editorial sugerida, na primeira pessoa, para revisão humana posterior.

Devolve APENAS JSON válido: {"leitura":"","pull_quote":""}
- leitura: 60 a 110 palavras. Tom pragmático, ligeiramente opinativo. Procura a consequência, o paradoxo, o risco ou a decisão que isto obriga a tomar.
- Não repitas «Em 30 segundos» nem «Porque interessa».
- pull_quote: uma frase da leitura, no máximo 20 palavras, ou "" se nenhuma servir.`;

function materialBase(args: {
  titulo: string;
  tipo: TipoBrief;
  factos: FactoBrief[];
  contexto: string[];
  incertezas: string[];
  intencao: Intencao;
}): string {
  const factos = args.factos
    .map((f) => `- [${f.tipo}] ${f.afirmacao}${f.valor ? ` (${f.valor})` : ""}`)
    .join("\n");
  return [
    `Tipo de peça: ${args.tipo === "destaque" ? "Destaque" : "Radar"}`,
    `Título: ${args.titulo}`,
    factos ? `Factos:\n${factos}` : "Factos: (nenhum)",
    args.contexto.length ? `Contexto:\n- ${args.contexto.join("\n- ")}` : "",
    args.incertezas.length ? `Por esclarecer:\n- ${args.incertezas.join("\n- ")}` : "",
    ROTULO_INTENCAO[args.intencao] ? `Instrução extra: ${ROTULO_INTENCAO[args.intencao]}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export interface ArgsRedaccao {
  sb: SupabaseClient;
  briefId?: string | null;
  titulo: string;
  tipo: TipoBrief;
  factos: FactoBrief[];
  contexto: string[];
  incertezas: string[];
  intencao?: Intencao;
  /** Texto anterior, para «outro ângulo» não repetir o mesmo. */
  anterior?: string;
}

export async function gerarEmTrintaSegundos(args: ArgsRedaccao): Promise<ParagrafoBrief[]> {
  const r = await chamarIaBrief<{ paragrafos?: unknown }>({
    papel: "redaccao",
    operacao: "em_30_segundos",
    briefId: args.briefId,
    sb: args.sb,
    system: SISTEMA_30,
    user: [materialBase({ ...args, intencao: args.intencao ?? "normal" }), args.anterior ? `Versão anterior (não repetir):\n${args.anterior}` : ""]
      .filter(Boolean)
      .join("\n\n"),
  });
  const brutos = Array.isArray(r.dados?.paragrafos) ? (r.dados.paragrafos as unknown[]) : [];
  return brutos
    .filter((p): p is string => typeof p === "string")
    .map((texto) => ({ texto: texto.trim() }))
    .filter((p) => p.texto.length > 0)
    .slice(0, args.tipo === "destaque" ? 3 : 2);
}

export async function gerarPorqueInteressa(args: ArgsRedaccao): Promise<ImplicacaoBrief[]> {
  const r = await chamarIaBrief<{ implicacoes?: unknown }>({
    papel: "redaccao",
    operacao: "porque_interessa",
    briefId: args.briefId,
    sb: args.sb,
    system: SISTEMA_PORQUE,
    user: materialBase({ ...args, intencao: args.intencao ?? "normal" }),
  });
  const brutos = Array.isArray(r.dados?.implicacoes)
    ? (r.dados.implicacoes as Record<string, unknown>[])
    : [];
  return brutos
    .map((i, idx) => ({
      ordem: idx + 1,
      rotulo: String(i.rotulo ?? "").trim(),
      texto: String(i.texto ?? "").trim(),
    }))
    .filter((i) => i.rotulo && i.texto)
    .slice(0, args.tipo === "destaque" ? 3 : 2);
}

export interface LeituraGerada {
  leitura: string;
  pullQuote: string;
}

export async function gerarLeituraSugerida(args: ArgsRedaccao): Promise<LeituraGerada> {
  const r = await chamarIaBrief<{ leitura?: unknown; pull_quote?: unknown }>({
    papel: "redaccao",
    operacao: "leitura_sugerida",
    briefId: args.briefId,
    sb: args.sb,
    system: SISTEMA_LEITURA,
    user: [
      materialBase({ ...args, intencao: args.intencao ?? "normal" }),
      args.anterior ? `Leitura anterior (não repetir):\n${args.anterior}` : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
  });
  return {
    leitura: typeof r.dados?.leitura === "string" ? r.dados.leitura.trim() : "",
    pullQuote: typeof r.dados?.pull_quote === "string" ? r.dados.pull_quote.trim() : "",
  };
}
