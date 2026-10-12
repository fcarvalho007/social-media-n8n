export interface PropostaPecas {
    lede: string;
    ledePosicao: number;
    pullQuote: string;
    pullQuotePosicao: number;
    momento: {
        activo: boolean;
        etiqueta: string;
        valor: string;
        descricao: string;
        posicao: number;
    };
    avisos: string[];
}
/** A frase existe (sem aspas/pontuação final, maiúsculas indiferentes) no texto? */
export declare function citacaoLiteral(frase: string, texto: string): boolean;
/** O valor (número, percentagem…) aparece no texto? */
export declare function valorNoTexto(valor: string, texto: string): boolean;
export declare function validarPropostaPecas(bruto: Record<string, unknown>, textoCronica: string, totalParagrafos: number): PropostaPecas;
