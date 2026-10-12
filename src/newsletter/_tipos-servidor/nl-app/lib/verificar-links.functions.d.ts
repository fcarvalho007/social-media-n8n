import { type ItemLink, type ContextoLink, type EstadoLink, type ResumoLinks, type ResultadoVerificarLinks } from "./verificar-links.server.ts";
export type { ItemLink, ContextoLink, EstadoLink, ResumoLinks, ResultadoVerificarLinks };
export declare const verificarLinksEdicao: import("../_shim/start.ts").NlServerFn<{
    edicao_id: string;
    forcar?: boolean;
}, ResultadoVerificarLinks>;
export interface ResultadoUmLink {
    url: string;
    estado: EstadoLink;
    status: number;
    redirect_para?: string;
}
export declare const verificarUmLink: import("../_shim/start.ts").NlServerFn<{
    url: string;
}, ResultadoUmLink>;
export declare const ignorarLink: import("../_shim/start.ts").NlServerFn<{
    edicao_id: string;
    url: string;
}, {
    ok: true;
    links_ignorados: string[];
}>;
export declare const reactivarLink: import("../_shim/start.ts").NlServerFn<{
    edicao_id: string;
    url: string;
}, {
    ok: true;
    links_ignorados: string[];
}>;
