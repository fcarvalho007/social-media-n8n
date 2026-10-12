export interface AjustarOpts {
    max?: number;
    min?: number;
}
export declare function ajustarDescricaoDestaque(texto: string | null | undefined): string;
export declare function ajustarDescricao(texto: string | null | undefined, opts?: AjustarOpts): string;
export type EstadoDescricao = "curta" | "ideal" | "longa" | "excessiva" | "vazia";
export declare function estadoDescricao(texto: string | null | undefined): EstadoDescricao;
export declare function corEstadoDescricao(estado: EstadoDescricao): string;
