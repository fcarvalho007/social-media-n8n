export type CandidatoFerramenta = {
    nome: string;
    descricao_original: string;
    url: string;
};
export type ResultadoScrape = {
    items: CandidatoFerramenta[];
    razao?: string;
};
export declare function scrapeToolify(url: string, max?: number): Promise<ResultadoScrape>;
export declare function scrapeFuturepedia(url: string, max?: number): Promise<ResultadoScrape>;
export declare function scrapeTAAFT(url: string, max?: number): Promise<ResultadoScrape>;
/** Roteador por nome da fonte. */
export declare function scrapeDirectorio(nome: string, url: string, max?: number): Promise<ResultadoScrape>;
export declare function extrairDominio(url: string): string | null;
export declare function normalizarNome(nome: string): string;
