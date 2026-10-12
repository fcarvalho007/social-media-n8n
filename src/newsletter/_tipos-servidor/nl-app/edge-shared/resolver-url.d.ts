export declare function ehLinkRastreio(url: string): boolean;
/** Segue redireccionamentos e devolve o URL final, sem parâmetros de tracking. */
export declare function resolverUrlFinal(url: string, timeoutMs?: number): Promise<string>;
export type FonteEstado = "ok" | "resolvida" | "por_confirmar";
export type ResultadoFonte = {
    url: string;
    estado: FonteEstado;
    urlOriginal: string | null;
};
/** Falso quando o URL é homepage/secção genérica em vez de um artigo. */
export declare function apontaParaArtigo(url: string): boolean;
/**
 * Devolve o melhor URL possível para a notícia.
 * - `ok`: o link já aponta para o artigo.
 * - `resolvida`: o link de rastreio foi seguido ou substituído por outra fonte.
 * - `por_confirmar`: não foi possível chegar ao artigo — precisa de revisão manual.
 */
export declare function resolverFonteArtigo(entrada: {
    titulo: string;
    descricao?: string | null;
    url: string;
}): Promise<ResultadoFonte>;
