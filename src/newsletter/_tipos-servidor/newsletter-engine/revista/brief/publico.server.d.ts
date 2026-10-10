import type { ImplicacaoBrief, ParagrafoBrief, TipoBrief } from "./tipos.ts";
export interface RelacionadoPublico {
    slug: string;
    titulo: string;
    categoria: string;
    tempo: string;
    tipo: TipoBrief;
}
export interface BriefPublico {
    slug: string;
    tipo: TipoBrief;
    indexavel: boolean;
    /** Edição de origem já enviada por email. */
    enviada: boolean;
    titulo: string;
    /** Tese editorial curta, usada como descrição quando existe. */
    tese: string;
    categoria: string;
    categoriaId: string;
    dataISO: string;
    actualizadoISO: string;
    tempo: string;
    fonte: string;
    fonteUrl: string;
    resumo: string[];
    implicacoes: Array<{
        titulo: string;
        texto: string;
    }>;
    leitura: string;
    edicaoNumero: number;
    relacionados: RelacionadoPublico[];
}
interface LinhaBrief {
    id: string;
    slug: string;
    tipo: TipoBrief;
    estado: string;
    indexavel: boolean;
    noticia_id: string | null;
    titulo_editorial: string | null;
    tese_editorial: string | null;
    em_30_segundos: ParagrafoBrief[] | null;
    porque_interessa: ImplicacaoBrief[] | null;
    leitura_aprovada: string | null;
    fonte_url: string | null;
    fonte_publisher: string | null;
    fonte_data: string | null;
    publicado_em: string | null;
    updated_at: string;
}
interface Candidato {
    brief: LinhaBrief;
    edicaoId: string;
    numero: number;
    dataEdicao: string | null;
    categoria: string | null;
    /** Título canónico da página: identidade editorial do próprio Brief. */
    titulo: string;
    /** Edição já enviada por email. */
    enviada: boolean;
}
/**
 * Relacionados por prioridade: mesma edição + categoria → mesma categoria
 * noutras edições → mesma edição → mais recentes. Sem repetidos.
 */
export declare function escolherRelacionados(alvo: Candidato, todos: Candidato[], limite?: number): RelacionadoPublico[];
/**
 * Página pública de um Brief. `null` quando o slug não existe ou não é
 * público. `preview` só é usado por rotas autenticadas — nunca pelo leitor.
 */
export declare function obterBriefPublico(slug: string, opcoes?: {
    preview?: boolean;
}): Promise<BriefPublico | null>;
/** Slugs de Destaque indexáveis, para o mapa do site. */
export declare function listarBriefsIndexaveis(): Promise<Array<{
    slug: string;
    lastmod: string;
}>>;
/** Mapa `noticiaId → Brief público` de uma edição, para as ligações do hub. */
export declare function mapaBriefsDaEdicao(edicaoNumero: number, opcoes?: {
    preview?: boolean;
}): Promise<Record<string, {
    slug: string;
    tipo: TipoBrief;
    estado?: string;
}>>;
export {};
