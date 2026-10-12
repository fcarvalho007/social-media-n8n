export declare const COLUNAS_NOTICIA_EDICAO = "id, titulo, descricao, url, url_curto, categoria, ordem, destino";
/** Estados que contam como «aprovada da edição» (inclui já enviada). */
export declare const ESTADOS_NOTICIA_EDICAO: readonly ["aprovada", "enviada"];
export interface NoticiaDaEdicao {
    id: string;
    titulo: string;
    descricao: string | null;
    url: string | null;
    url_curto: string | null;
    categoria: string;
    ordem: number;
    destino: string | null;
}
/** Cliente mínimo aceite (browser ou service role). */
interface ClienteMinimo {
    from: (t: string) => {
        select: (c: string) => {
            eq: (c: string, v: string) => {
                in: (c: string, v: readonly string[]) => {
                    order: (c: string, o: {
                        ascending: boolean;
                    }) => PromiseLike<{
                        data: unknown;
                        error: unknown;
                    }>;
                };
            };
        };
    };
}
/** Fonte única de verdade do universo de notícias de uma edição Revista. */
export declare function carregarNoticiasDaEdicao(sb: ClienteMinimo, edicaoId: string): Promise<NoticiaDaEdicao[]>;
export {};
