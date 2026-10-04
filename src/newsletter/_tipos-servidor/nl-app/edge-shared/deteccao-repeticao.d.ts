export interface UsoDedup {
    cacheHit: number;
    cacheMiss: number;
    saida: number;
}
export type ChatDedupResposta = {
    conteudo: string;
    usage: UsoDedup;
    modelo: string;
} | null;
type Admin = any;
export interface CandidatoTrgm {
    id: string;
    titulo: string;
    edicao_id: string | null;
    edicao_numero: number | null;
    created_at: string;
    score: number;
}
export interface RepeticaoConfirmada {
    candidato_id: string;
    candidato_titulo: string;
    candidato_edicao_numero: number | null;
    score_trgm: number;
    justificacao: string;
    /**
     * `confirmada` → a notícia nova NÃO deve ser inserida (é a mesma história).
     * `provavel`   → insere-se marcada com o selo «Possível repetição».
     */
    nivel: "confirmada" | "provavel";
}
/** Acima deste score de título consideramos repetição sem sequer perguntar à IA. */
export declare const LIMIAR_REPETICAO_CERTA = 0.85;
/** Acima deste score marcamos como possível repetição mesmo sem confirmação. */
export declare const LIMIAR_REPETICAO_PROVAVEL = 0.6;
/**
 * Fase 1 + Fase 2. Devolve o primeiro candidato confirmado pela IA ou `null`.
 * `chamarChat(system, user)` deve devolver o texto bruto da resposta (ou `null`).
 * Só chama `chamarChat` para os candidatos que a Fase 1 devolver.
 *
 * `opts.fase2Activa` (default `true`): quando `false`, a Fase 1 corre sempre,
 * mas o loop DeepSeek é saltado. `opts.onFase1IgnoradaPorConfig` é invocado
 * (se fornecido) para o call site registar em `audit_log` que houve candidatos
 * mas a confirmação por IA está desligada.
 */
export declare function confirmarRepeticaoIA(admin: Admin, novo: {
    titulo: string;
    descricao: string | null;
    categoria: string;
}, chamarChat: (system: string, user: string) => Promise<ChatDedupResposta>, opts?: {
    limiarTrgm?: number;
    fase2Activa?: boolean;
    origem?: string;
    edicaoId?: string | null;
    onFase1IgnoradaPorConfig?: (candidatos: CandidatoTrgm[]) => Promise<void> | void;
}): Promise<RepeticaoConfirmada | null>;
export {};
