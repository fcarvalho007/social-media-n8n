export type EstadoEgoi = "enviada" | "a_enviar" | "rascunho" | "desconhecido";
export type ResultadoEstado = {
    ok: true;
    estado: EstadoEgoi;
    bruto: string;
} | {
    ok: false;
    status: number;
    mensagem: string;
    retriavel?: boolean;
};
export declare function mapearEstado(bruto: string): EstadoEgoi;
/** Picks the item with the exact hash and channel; anything else is "not found", never "sent". */
export declare function interpretarResposta(body: unknown, hash: string): ResultadoEstado;
export declare function consultarEstadoCampanha(apiKey: string, hash: string, fazerFetch?: typeof fetch): Promise<ResultadoEstado>;
