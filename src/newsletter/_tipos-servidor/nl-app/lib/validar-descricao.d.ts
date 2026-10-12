export declare const MIN_PALAVRAS = 18;
export declare const MAX_PALAVRAS = 30;
export interface ResultadoValidacao {
    estado: "ok" | "curta" | "longa" | "vazia";
    palavras: number;
    texto: string;
    aparada?: string;
}
export declare function normalizarLexico(texto: string): string;
export declare function contarPalavras(texto: string): number;
export declare function validarDescricao(texto: string | null | undefined): ResultadoValidacao;
