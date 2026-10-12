export type Accao = "cancelar" | "pausar" | "mensal" | "reverter";
export type AccaoRegisto = "cancelado" | "pausado" | "mensal" | "reactivado" | "revertido";
export interface EstadoSubscricao {
    ok: boolean;
    email: string | null;
    /** Estado actual conhecido a partir do último evento registado. */
    estado: "activa" | "cancelada" | "pausada" | "mensal";
    /** Data em que a subscrição volta sozinha (pausa ou ciclo mensal). */
    retomaEm: string | null;
    mensagem?: string;
}
/** Gera o token para o link do rodapé. */
export declare function criarToken(email: string): string;
/** Valida o token e devolve o email; `null` se for inválido. */
export declare function lerToken(token: string): string | null;
/** Chave partilhada para o webhook da E-goi (derivada do segredo, nunca o segredo). */
export declare function chaveWebhookEgoi(): string;
/** Regista um cancelamento feito fora da aplicação (link nativo da E-goi). */
export declare function registarCancelamentoExterno(emailBruto: string, detalhe?: Record<string, unknown>): Promise<void>;
/** Lê o estado actual a partir do último evento registado para o email. */
export declare function estadoSubscricao(token: string): Promise<EstadoSubscricao>;
export declare function estadoPorEmail(emailBruto: string): Promise<EstadoSubscricao>;
export interface ResultadoAccao {
    ok: boolean;
    estado: EstadoSubscricao["estado"];
    retomaEm: string | null;
    mensagem: string;
    /** Verdadeiro quando a E-goi não confirmou a operação em nenhuma lista. */
    avisoEgoi?: boolean;
}
/** Executa a acção escolhida pelo subscritor. */
export declare function aplicarAccao(input: {
    token?: string | null;
    email?: string | null;
    accao: Accao;
    motivo?: string | null;
    /** De onde veio o pedido: página, um clique no cliente de email, E-goi, automático. */
    origem?: string;
}): Promise<ResultadoAccao>;
/**
 * Tarefa diária: reactiva pausas terminadas e faz rodar o ciclo mensal.
 * Idempotente — cada evento é marcado como tratado (`retomado_em`).
 */
export declare function processarRetomas(): Promise<{
    tratados: number;
    falhas: number;
}>;
export interface PassoTeste {
    passo: string;
    ok: boolean;
    detalhe: string;
}
/**
 * Teste controlado do fluxo completo com um email real:
 * pausa → lê estado → reverte. Não deixa o subscritor fora da lista.
 */
export declare function testarFluxo(emailBruto: string): Promise<{
    ok: boolean;
    passos: PassoTeste[];
}>;
