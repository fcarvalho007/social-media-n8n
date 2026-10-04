export declare function normalizarTexto(texto: string): string;
/**
 * Proporção das palavras de conteúdo do título que também aparecem na
 * descrição. É o sinal mais directo de «a descrição repete o título».
 */
export declare function coberturaDoTitulo(titulo: string, descricao: string): number;
/** Limiar acima do qual consideramos que a descrição repete o título. */
export declare const LIMIAR_REPETICAO_DESCRICAO = 0.7;
export interface AvaliacaoDescricao {
    /** 0 a 1. Quanto maior, mais a descrição repete o título. */
    score: number;
    cobertura: number;
    dice: number;
    trigramas: number;
    repete: boolean;
}
export declare function avaliarDescricao(titulo: string | null | undefined, descricao: string | null | undefined): AvaliacaoDescricao;
