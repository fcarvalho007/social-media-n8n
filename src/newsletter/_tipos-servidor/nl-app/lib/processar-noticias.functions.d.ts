import { type ResultadoConfirmacao, type ResultadoExtraccao } from "./processar-noticias.server.ts";
export declare const extrairNoticias: import("../_shim/start.ts").NlServerFn<unknown, ResultadoExtraccao>;
export declare const confirmarNoticias: import("../_shim/start.ts").NlServerFn<unknown, ResultadoConfirmacao>;
export declare const guardarModeloIA: import("../_shim/start.ts").NlServerFn<unknown, {
    provider: string;
    modelo: string;
    configurada: boolean;
}>;
export declare const testarModeloIA: import("../_shim/start.ts").NlServerFn<void, {
    provider: string;
    modelo: string;
}>;
