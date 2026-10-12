/**
 * Correcção de descrições que ficaram a repetir o título.
 * Lê o artigo original (guardando-o para reutilização) e pede à IA uma
 * descrição que acrescente informação. Nunca inventa: se o artigo não estiver
 * acessível, trabalha com o material existente.
 */
export declare const corrigirDescricoes: import("../_shim/start.ts").NlServerFn<unknown, {
    corrigidas: number;
    inalteradas: number;
    falhas: string[];
}>;
