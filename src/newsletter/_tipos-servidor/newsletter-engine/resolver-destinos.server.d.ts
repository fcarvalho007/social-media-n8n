export declare const MAX_TOTAL_EMAIL = 12;
export declare const MAX_POR_CATEGORIA = 2;
export type OverrideDestino = "auto" | "email" | "site";
export type RazaoDestino = "pin_email" | "pin_site" | "destaque" | "auto_top" | "auto_extra_categoria" | "auto_corte_global" | "categoria_oculta";
export interface EntradaResolve {
    id: string;
    ordem: number;
    categoria: string;
    destaque: boolean;
    override: OverrideDestino;
}
export interface ResultadoDestino {
    destino: "email" | "site";
    razao: RazaoDestino;
}
export interface OpcoesResolver {
    categoriasOcultas: Set<string>;
    maxTotal?: number;
    maxPorCategoria?: number;
}
export declare function resolverDestinos(itens: EntradaResolve[], opts: OpcoesResolver): Map<string, ResultadoDestino>;
