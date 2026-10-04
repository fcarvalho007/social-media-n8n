// Tipos partilhados do Digital Sprint Brief (Fase 2A).
// Módulo client-safe: não importa nada de servidor.

export type TipoBrief = "destaque" | "radar";

export type EstadoBrief =
  | "por_gerar"
  | "a_gerar"
  | "gerado"
  | "por_rever"
  | "aprovado"
  | "publicado"
  | "erro";

/** Parágrafo factual de «Em 30 segundos». */
export interface ParagrafoBrief {
  texto: string;
}

/** Implicação numerada de «Porque interessa». */
export interface ImplicacaoBrief {
  ordem: number;
  rotulo: string;
  texto: string;
}

export interface FonteAdicional {
  titulo: string;
  url: string;
}

/** Tipos de facto sujeitos a controlo apertado na verificação. */
export type TipoFacto =
  | "numero"
  | "percentagem"
  | "data"
  | "preco"
  | "empresa"
  | "pessoa"
  | "produto"
  | "disponibilidade"
  | "citacao"
  | "outro";

/** Facto extraído da fonte — nunca conhecimento geral do modelo. */
export interface FactoBrief {
  afirmacao: string;
  tipo: TipoFacto;
  entidade?: string;
  valor?: string;
  fonte: string;
  evidencia: string;
  confianca: number;
}

export type EstadoAfirmacao =
  | "suportado"
  | "parcialmente_suportado"
  | "nao_suportado"
  | "impossivel_verificar";

export interface ItemVerificado {
  afirmacao: string;
  estado: EstadoAfirmacao;
  nota?: string;
}

/** Resultado da passagem de verificação factual (chamada separada da escrita). */
export interface VerificacaoFactual {
  estado: EstadoAfirmacao;
  itens: ItemVerificado[];
  bloqueia: boolean;
}

export type DecisaoProximidadeBrief = "ok" | "rever" | "bloqueado";

export interface ProximidadeGuardada {
  score: number;
  decisao: DecisaoProximidadeBrief;
  trechos: string[];
  maiorSequencia: number;
}

/** Notas de verificação factual e de proximidade textual. */
export interface VerificacaoBrief {
  factual?: "pendente" | "ok" | "falhou";
  proximidade?: number;
  confianca?: number;
  notas?: string[];
  factual_detalhe?: VerificacaoFactual;
  proximidade_detalhe?: ProximidadeGuardada;
  fonte_estado?: "ok" | "indisponivel";
  verificado_em?: string;
}

/** Registo do que a IA fez (Fase 2A: sempre vazio). */
export interface MetaIaBrief {
  modelo?: string;
  prompt_versao?: string;
  geracoes?: number;
  regeneracoes?: number;
}

export interface Brief {
  id: string;
  noticia_id: string | null;
  fingerprint: string;
  slug: string;
  slug_congelado: boolean;
  tipo: TipoBrief;
  estado: EstadoBrief;
  indexavel: boolean;
  /** Título canónico da página pública — identidade editorial do Brief. */
  titulo_editorial: string;
  /** Tese editorial curta: o ângulo que sustenta a peça. */
  tese_editorial: string;
  em_30_segundos: ParagrafoBrief[];
  porque_interessa: ImplicacaoBrief[];
  leitura_sugerida: string;
  leitura_aprovada: string;
  pull_quote_sugerida: string;
  factos: FactoBrief[];
  contexto: string[];
  incertezas: string[];
  aprovada_em: string | null;
  aprovada_por: string | null;
  fonte_url: string | null;
  fonte_url_norm: string | null;
  fonte_publisher: string | null;
  fonte_data: string | null;
  fonte_primaria_url: string | null;
  fontes_adicionais: FonteAdicional[];
  verificacao: VerificacaoBrief;
  ia: MetaIaBrief;
  hash_publicado: string | null;
  publicado_em: string | null;
  erro: string | null;
  tentativas: number;
  created_at: string;
  updated_at: string;
}

/** Associação de um Brief a uma edição. */
export interface BriefEdicao {
  id: string;
  brief_id: string;
  edicao_id: string;
  papel: TipoBrief;
  ordem: number;
  titulo_apresentado: string | null;
  created_at: string;
}

/** Linha da lista interna: o Brief mais o seu lugar na edição. */
export interface BriefDaEdicao extends Brief {
  papel: TipoBrief;
  ordem_edicao: number;
  titulo_apresentado: string | null;
  /** Verdadeiro quando o conteúdo mudou depois de publicado. */
  alterado_apos_publicacao: boolean;
}

/** Limites editoriais, lidos de `configuracoes.brief_limites`. */
export interface LimitesBrief {
  destaque: number;
  radar: number;
}

export const LIMITES_BRIEF_PADRAO: LimitesBrief = { destaque: 3, radar: 5 };

/** Rótulos PT-PT dos estados, para o painel interno. */
const ROTULO_ESTADO: Record<EstadoBrief, string> = {
  por_gerar: "Por gerar",
  a_gerar: "A gerar",
  gerado: "Gerado",
  por_rever: "Por rever",
  aprovado: "Aprovado",
  publicado: "Publicado",
  erro: "Erro",
};

export function rotuloEstadoBrief(e: EstadoBrief | string): string {
  return ROTULO_ESTADO[e as EstadoBrief] ?? "Por gerar";
}

export function rotuloTipoBrief(t: TipoBrief | string): string {
  return t === "radar" ? "Quick Brief · Radar" : "Brief · Destaque";
}
