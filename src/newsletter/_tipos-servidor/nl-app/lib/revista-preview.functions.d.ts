import type { PaginaEdicaoPublica } from "../../newsletter-engine/revista/publicacao.server.ts";
export declare const previsualizarEdicaoWebFn: import("../_shim/start.ts").NlServerFn<{
    edicaoId?: string;
    numero?: number;
} | undefined, PaginaEdicaoPublica | null>;
