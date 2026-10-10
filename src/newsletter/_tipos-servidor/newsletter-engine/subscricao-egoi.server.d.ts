export interface ResultadoEgoi {
    ok: boolean;
    via?: string;
    erro?: string;
    detalhe?: unknown;
}
/** Procura o contacto pelo email dentro de uma lista. Devolve o id da E-goi. */
export declare function procurarContacto(apiKey: string, listaId: string, email: string): Promise<{
    ok: true;
    contactoId: string;
} | {
    ok: false;
    erro: string;
}>;
/** Cancela a subscrição do contacto numa lista (sai mesmo da E-goi). */
export declare function cancelarNaEgoi(apiKey: string, listaId: string, email: string): Promise<ResultadoEgoi>;
/** Volta a activar o contacto numa lista (fim de pausa ou reversão imediata). */
export declare function reactivarNaEgoi(apiKey: string, listaId: string, email: string): Promise<ResultadoEgoi>;
