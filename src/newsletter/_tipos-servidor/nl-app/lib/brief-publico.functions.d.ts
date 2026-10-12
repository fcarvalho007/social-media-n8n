import type { BriefPublico } from "../../newsletter-engine/revista/brief/publico.server.ts";
export type { BriefPublico };
export interface RespostaBriefPublico {
    brief: BriefPublico | null;
    activos: boolean;
}
export declare const obterBriefPublicoFn: import("../_shim/start.ts").NlServerFn<{
    slug: string;
}, RespostaBriefPublico>;
/**
 * Pré-visualização interna de um Brief, com o mesmo desenho da página pública.
 * Autenticada por desenho: mostra peças ainda não publicadas.
 */
export declare const previsualizarBriefFn: import("../_shim/start.ts").NlServerFn<{
    slug: string;
}, BriefPublico | null>;
