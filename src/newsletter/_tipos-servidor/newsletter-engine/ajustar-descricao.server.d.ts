export interface AjustarOpts {
    /** Comprimento máximo aceitável em caracteres (aprox. 3 linhas). */
    max?: number;
    /** Mínimo desejado para o corte procurar um limite de frase natural. */
    min?: number;
}
/** Variante para cartões de destaque (cartão mais largo, fonte 15px). */
export declare function ajustarDescricaoDestaque(texto: string | null | undefined): string;
/** Devolve `texto` inalterado se `≤ max`; caso contrário corta no último
 *  limite de frase (. ! ?) ≥ min. Se não existir, tenta alargar a janela
 *  até `max+40` para apanhar a frase completa. Nunca acrescenta `…`. */
export declare function ajustarDescricao(texto: string | null | undefined, opts?: AjustarOpts): string;
/** Categoriza uma descrição face ao alvo ideal (≈2 linhas). */
export declare function estadoDescricao(texto: string | null | undefined): "curta" | "ideal" | "longa" | "excessiva" | "vazia";
