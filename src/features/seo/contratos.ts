import { z } from 'zod';
import type { ConhecimentoMarca, EstruturaGuardada, GuiaArtigo } from './sequencia';

export const operacoes = ['sugestoes', 'relacionadas', 'ideias', 'visao', 'dominio', 'lacunas', 'volume', 'serp'] as const;
export type OperacaoSeo = typeof operacoes[number];
export const mercados = {
  PT: { nome: 'Portugal · português', location_name: 'Portugal', language_code: 'pt' },
  BR: { nome: 'Brasil · português', location_name: 'Brazil', language_code: 'pt' },
  GB: { nome: 'Reino Unido · inglês', location_name: 'United Kingdom', language_code: 'en' },
} as const;
export const schemaPesquisa = z.object({
  siteId: z.string().min(1).max(80), operacao: z.enum(operacoes), mercado: z.enum(['PT', 'BR', 'GB']).default('PT'),
  termos: z.array(z.string().trim().min(2).max(80)).min(1).max(1000),
  dominio: z.string().max(253).default(''), concorrente: z.string().max(253).default(''),
  limite: z.number().int().min(1).max(1000).default(100), modo: z.enum(['exemplo', 'sandbox', 'real']),
  renovar: z.boolean().default(false),
}).strict();
export interface PesquisaSeo { siteId: string; operacao: OperacaoSeo; mercado: 'PT'|'BR'|'GB'; termos: string[]; dominio: string; concorrente: string; limite: number; modo: 'exemplo'|'sandbox'|'real'; renovar: boolean }
export type ModoSeo = PesquisaSeo['modo'];
export interface PalavraSeo {
  palavra: string; volume: number | null; dificuldade: number | null; cpc: number | null;
  concorrenciaAds: number | null; intencao: string | null; atualizadoEm: string | null;
  meses: { ano: number; mes: number; volume: number | null }[]; posicao: number | null; url: string | null;
}
export interface ResultadoSerp { tipo: string; titulo: string; url: string | null; dominio: string | null; descricao: string; posicao: number | null }
export interface DadosPesquisa { palavras: PalavraSeo[]; serp: ResultadoSerp[]; perguntas: string[]; totalDisponivel: number | null; avisos: string[] }
export interface ConfigGeralSeo {
  revista: number; pausado: boolean; automacaoPausada: boolean; mensalMicro: number; diarioMicro: number; pedidoMicro: number;
  cambio: number; cambioData: string; cacheDias: number;
}
export interface PoliticaSite {
  producao: 'manual' | 'automatica'; publicacao: 'humana' | 'automatica'; ativa: boolean;
  dias: number[]; hora: string; limiteSemanal: number; reservaSemanas: number;
  pesquisarAutomaticamente: boolean; mensalMicro: number; diarioMicro: number; pedidoMicro: number;
  temasPermitidos: string[]; temasExcluidos: string[]; revista: number;
  sequenciaCompleta?: boolean;
}
export interface SiteEditorial {
  id: string; nome: string; dominio: string; estado: 'piloto' | 'planeado'; publico: string; voz: string;
  objetivo: string; oferta: string; revisaoObrigatoria: boolean; politica: PoliticaSite;
  conhecimento?: ConhecimentoMarca;
}
export interface FonteEditorial { id: string; titulo: string; url: string; excerto: string; verificadaEm: string; aprovada: boolean }
export interface TextoEditorial {
  titulo: string; resumo: string; slug: string; corpo: string;
  afirmacoes: { trecho: string; fonteIds: string[] }[]; alertas: string[];
}
export type EstadoPauta = 'planeado' | 'a_preparar' | 'aguarda_revisao' | 'aprovado' | 'pronto_automatico' | 'bloqueado';
export interface PautaEditorial {
  id: string; siteId: string; titulo: string; palavra: string; origem: 'keyword' | 'topico' | 'noticia' | 'documento';
  contributo: string; objetivo: string; cta: string; fontes: FonteEditorial[]; dataPretendida: string;
  pesquisaId: string | null; modoOrigem: ModoSeo | 'manual'; estado: EstadoPauta; versao: number;
  criadoEm: string; alteradoEm: string; texto: TextoEditorial | null; proposta: TextoEditorial | null;
  aprovacao: { assinatura: string; em: string; versao: number } | null; motivo: string | null;
  producaoAutomaticaAutorizada: boolean;
  guia?: GuiaArtigo; estrutura?: EstruturaGuardada | null; propostaEstrutura?: EstruturaGuardada | null;
  estruturaAtual?: boolean;
  pesquisaContexto?: { recolhidaEm: string; mercado: string; consulta: string; perguntas: string[]; resultados: ResultadoSerp[] } | null;
}
export interface LinhaPreco { descricao: string; quantidade: number; unitarioMicro: number; totalMicro: number }
export interface OrcamentoSeo {
  id: string; tipo: 'pesquisa' | 'texto' | 'estrutura'; criadoEm: string; expiraEm: string; siteId: string;
  pesquisa?: PesquisaSeo; pautaId?: string; pautaVersao?: number; assinatura?: string;
  estimativaMicro: number; linhas: LinhaPreco[]; fontePrecos: string; precosEm: string;
  cambio: number; cambioData: string; cacheId: string | null; usadoPor: string | null;
  bloqueios: string[]; automatico: boolean;
}
export interface PedidoSeo {
  id: string; orcamentoId: string; siteId: string; tipo: 'pesquisa' | 'texto' | 'estrutura'; operacao: string;
  fornecedor: 'dataforseo' | 'deepseek' | 'local'; modo: ModoSeo;
  criadoEm: string; terminadoEm: string | null; estado: 'em_curso' | 'concluido' | 'falhou' | 'incerto';
  estimativaMicro: number; custoMicro: number | null; custoOrigem: 'api' | 'tokens' | 'manual' | 'simulado' | 'desconhecido' | 'cache';
  reservaMicro: number; cambio: number; cambioData: string; unidades: number | null;
  taskId: string | null; codigoFornecedor: number | null; detalhe: string; cacheDe: string | null;
  pesquisa?: PesquisaSeo; pautaId?: string; resultadoId: string | null; automatico: boolean;
  consentimento: string; precosEm: string; linhas: LinhaPreco[]; fontePrecos: string; modelo?: string; tokens?: { cacheHit: number; cacheMiss: number; saida: number };
}
export interface RegistoAuditoriaSeo { id: string; em: string; acao: string; alvo: string; detalhe: string }
export interface ContaSeo { verificadaEm: string; saldoUsd: number | null; custoConsultaMicro: number; tarifaBaseInformativa: boolean }
export interface EstadoSeo {
  versao: 1; configuracao: ConfigGeralSeo; sites: SiteEditorial[]; orcamentos: OrcamentoSeo[];
  pedidos: PedidoSeo[]; pautas: PautaEditorial[]; auditoria: RegistoAuditoriaSeo[];
  slots: { id: string; siteId: string; em: string; pautaId: string | null; estado: string; detalhe: string }[];
  conta: ContaSeo | null;
}
export interface EstadoPublicoSeo extends Omit<EstadoSeo, 'orcamentos'> {
  ligacao: { dataforseo: boolean; deepseek: boolean; servidorLigado: boolean }; erroMotor: string | null;
}
export interface PesquisaGuardada { id: string; pedidoId: string; pedido: PesquisaSeo; recolhidaEm: string; dados: DadosPesquisa }

export type DadosPautaEditorial = Pick<PautaEditorial, 'siteId'|'titulo'|'palavra'|'origem'|'contributo'|'objetivo'|'cta'|'fontes'|'dataPretendida'|'pesquisaId'|'producaoAutomaticaAutorizada'|'texto'|'versao'|'guia'> & {id?: string};
