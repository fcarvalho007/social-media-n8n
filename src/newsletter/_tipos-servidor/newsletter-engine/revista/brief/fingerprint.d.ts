/** Forma canónica do URL da fonte (reutiliza a normalização já usada na curadoria). */
export declare function urlFonteCanonico(url: string | null | undefined): string | null;
/** Título reduzido ao essencial, para quando não há URL utilizável. */
export declare function tituloCanonico(titulo: string): string;
/**
 * Impressão digital determinística. Prefere sempre o URL: é o sinal mais
 * fiável. Sem URL, cai no título canónico.
 */
export declare function calcularFingerprint(args: {
    url?: string | null;
    titulo: string;
}): string;
