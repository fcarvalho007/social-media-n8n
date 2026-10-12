import { type EdicaoRevista, type AtualidadeRevista } from "./compose.server.ts";
import type { TipoBrief } from "./brief/tipos.ts";
export interface ResumoEdicaoPublica {
    numero: number;
    data: string | null;
    titulo: string;
    lede: string;
    /** Edição efectivamente enviada — só aí é indexável. */
    enviada: boolean;
}
export interface GrupoAtualidades {
    categoria: string;
    rotulo: string;
    itens: AtualidadeRevista[];
}
export interface VizinhaPublica {
    numero: number;
    titulo: string;
}
/** Ligação de uma peça ao seu Brief público, por notícia. */
export interface LigacaoBriefPublica {
    slug: string;
    tipo: TipoBrief;
    /** Só é incluído na pré-visualização interna. */
    estado?: string;
}
export interface PaginaEdicaoPublica {
    estrutura: EdicaoRevista;
    grupos: GrupoAtualidades[];
    anterior: VizinhaPublica | null;
    seguinte: VizinhaPublica | null;
    /** `false` enquanto a edição ainda não saiu por email: página `noindex`. */
    enviada: boolean;
    /** Briefs desta edição: congelados no snapshot quando já foi enviada. */
    briefs: Record<string, LigacaoBriefPublica>;
}
/** Arquivo público: só edições Revista já enviadas, mais recente primeiro. */
export declare function listarEdicoesPublicas(): Promise<ResumoEdicaoPublica[]>;
/** Agrupa as atualidades pela ordem da taxonomia existente. */
export declare function agruparAtualidades(itens: AtualidadeRevista[]): GrupoAtualidades[];
/**
 * Ligações congeladas no snapshot. É esta a fonte histórica de uma edição já
 * enviada: uma associação criada depois do envio não altera a edição antiga.
 * Snapshots anteriores a esta fase não trazem o bloco e devolvem `{}`.
 */
export declare function briefsDoSnapshot(e: EdicaoRevista): Record<string, LigacaoBriefPublica>;
/**
 * Página pública de uma edição. Devolve `null` quando o número não existe ou
 * a edição não é pública — a rota traduz isso num 404.
 */
export declare function obterPaginaEdicaoPublica(numero: number): Promise<PaginaEdicaoPublica | null>;
