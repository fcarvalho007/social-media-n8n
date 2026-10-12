export type UsoIA = {
    modelo: string;
    cacheHit: number;
    cacheMiss: number;
    saida: number;
};
export type ResultadoRelevancia = {
    ok: boolean;
    motivo: string;
    uso: UsoIA;
};
export declare function classificarRelevancia(nome: string, descricao: string): Promise<ResultadoRelevancia>;
export type ResultadoPolir = {
    descricao: string;
    cor: "indigo" | "verde" | "laranja" | "cinzento";
    uso: UsoIA;
};
export declare function polirFerramenta(nome: string, descricaoOriginal: string): Promise<ResultadoPolir>;
