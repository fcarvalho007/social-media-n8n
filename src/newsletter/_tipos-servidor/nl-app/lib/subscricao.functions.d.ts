/**
 * Endpoints públicos da página de gestão de subscrição.
 * Não exigem sessão — quem chega aqui vem do rodapé de um email.
 * Nunca devolvem dados de terceiros: só o estado do email indicado.
 */
export interface EstadoPublico {
    ok: boolean;
    email: string | null;
    estado: "activa" | "cancelada" | "pausada" | "mensal";
    retomaEm: string | null;
    mensagem?: string;
}
export declare const estadoSubscricaoFn: import("../_shim/start.ts").NlServerFn<{
    token?: string | null;
    email?: string | null;
}, EstadoPublico>;
export declare const aplicarAccaoSubscricaoFn: import("../_shim/start.ts").NlServerFn<{
    token?: string | null;
    email?: string | null;
    accao: "cancelar" | "pausar" | "mensal" | "reverter";
    motivo?: string | null;
}, import("./subscricao.server.ts").ResultadoAccao>;
/** Painel interno: últimos eventos e contagens por motivo. */
export declare const resumoSubscricoesFn: import("../_shim/start.ts").NlServerFn<void, {
    eventos: {
        email: string;
        id: any;
        accao: any;
        motivo: any;
        retoma_em: any;
        origem: any;
        criado_em: any;
    }[];
    contagens: Record<string, number>;
    motivos: Record<string, number>;
}>;
/** Teste controlado do fluxo (pausa e reposição) com um email indicado. */
export declare const testarSubscricaoFn: import("../_shim/start.ts").NlServerFn<{
    email: string;
}, {
    ok: boolean;
    passos: import("./subscricao.server.ts").PassoTeste[];
}>;
/** URL a configurar na E-goi para receber os cancelamentos feitos lá. */
export declare const urlWebhookEgoiFn: import("../_shim/start.ts").NlServerFn<void, {
    url: string;
}>;
