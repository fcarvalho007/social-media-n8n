export type ArtigoHtml = {
    titulo: string;
    url: string;
    descricao: string;
    publicado: number;
};
/**
 * Extrai artigos de uma página de listagem HTML.
 * Combina 3 heurísticas: <article>, <h1-3><a>, JSON-LD.
 * Devolve até `maxItens` artigos deduplicados, ordenados por data (recentes primeiro).
 */
export declare function extrairArtigosHtml(listUrl: string, opts?: {
    maxItens?: number;
    timeoutMs?: number;
}): Promise<{
    ok: boolean;
    artigos: ArtigoHtml[];
    erro?: string;
}>;
