export type CorFerramenta = "indigo" | "verde" | "laranja" | "cinzento";
export interface PaletaFerramenta {
    chave: CorFerramenta;
    nome: string;
    descricao: string;
    solid: string;
    ink: string;
    pastel: string;
    pastelForte: string;
    borda: string;
}
export declare const PALETAS_FERRAMENTA: Record<CorFerramenta, PaletaFerramenta>;
export declare const CORES_FERRAMENTA: CorFerramenta[];
export declare function paletaFerramenta(cor: string | null | undefined): PaletaFerramenta;
