/** Posição convencional «no fim da crónica». */
export declare const POSICAO_FIM = 99;
/** Parágrafos a partir de texto simples com quebras de linha. */
export declare function paragrafosCronica(txt: string): string[];
export type PecaCronica = {
    tipo: "paragrafo";
    texto: string;
    indice: number;
} | {
    tipo: "lede";
} | {
    tipo: "pull_quote";
} | {
    tipo: "momento";
} | {
    tipo: "imagem";
};
export interface OpcoesSequencia {
    excerto: string;
    /** A lede / tese editorial entra na sequência? (fora do email fica no hero) */
    lede?: boolean;
    ledePos?: number;
    /** A frase de destaque entra nesta edição? */
    pullQuote: boolean;
    pullQuotePos: number;
    /** O momento editorial entra nesta edição? */
    momento: boolean;
    momentoPos: number;
    /** A imagem da crónica entra nesta edição? */
    imagem?: boolean;
    imagemPos?: number;
}
/** Normaliza a posição para o intervalo [0, total]. */
export declare function posicaoValida(pos: number | null | undefined, total: number): number;
/**
 * Devolve a sequência final: cada bloco entra depois do número de parágrafos
 * indicado pela sua posição (0 = antes do primeiro parágrafo).
 *
 * A lede é apenas mais uma peça móvel; a imagem com posição negativa é a
 * convenção antiga de «antes da lede» e continua a ser respeitada.
 */
export declare function sequenciaCronica(o: OpcoesSequencia): PecaCronica[];
/** Excerto de recurso: início da crónica em texto, ~600 caracteres, cortado no fim de uma frase. */
export declare function excertoDaCronica(fonte: string, limite?: number): string;
/** Faixa recomendada de palavras para o excerto da crónica. */
export declare const EXCERTO_PALAVRAS_MIN = 80;
export declare const EXCERTO_PALAVRAS_MAX = 120;
export interface EstadoParagrafos {
    paragrafos: string[];
    ledePos: number;
    quotePos: number;
    momentoPos: number;
}
export type OperacaoParagrafo = {
    op: "editar";
    indice: number;
    texto: string;
} | {
    op: "inserir";
    indice: number;
    texto: string;
} | {
    op: "apagar";
    indice: number;
} | {
    op: "mover";
    indice: number;
    delta: -1 | 1;
};
/**
 * Aplica uma operação aos parágrafos do excerto (índices 0-based) mantendo as
 * peças móveis no mesmo sítio relativo. Uma peça na posição p fica depois de p
 * parágrafos.
 */
export declare function editarParagrafos(e: EstadoParagrafos, o: OperacaoParagrafo): EstadoParagrafos;
export declare function contarPalavras(txt: string): number;
