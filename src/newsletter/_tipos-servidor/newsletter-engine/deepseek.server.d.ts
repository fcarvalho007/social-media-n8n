export declare const MODELO_DEEPSEEK_PADRAO = "deepseek-flash";
export declare const DEEPSEEK_ENDPOINT = "https://api.deepseek.com/chat/completions";
export type DeepSeekUsage = {
    cacheHit: number;
    cacheMiss: number;
    saida: number;
};
export type DeepSeekResposta = {
    conteudo: string;
    modelo: string;
    usage: DeepSeekUsage;
};
interface Opcoes {
    modelo?: string;
    responseJson?: boolean;
    temperatura?: number;
}
/**
 * Chama a DeepSeek com um `system` + `user`. Devolve o conteúdo em bruto,
 * o modelo efectivamente usado e os tokens consumidos (para registo em `ia_uso`).
 *
 * Trata:
 *  - 401/403: chave inválida ou sem permissões
 *  - 402:     saldo insuficiente na DeepSeek
 *  - 429:     rate limit — devolve mensagem em pt-PT
 *  - 5xx:     falha transitória — devolve mensagem em pt-PT
 */
export declare function chamarDeepSeek(system: string, user: string, opts?: Opcoes): Promise<DeepSeekResposta>;
/** Extrai o primeiro objecto JSON válido de um texto (a DeepSeek por vezes acrescenta prosa). */
export declare function parseJsonTolerante<T = unknown>(texto: string): T | null;
export {};
