// Server functions públicas do Digital Sprint Brief.
//
// Sem autenticação por desenho — são páginas públicas. Em contrapartida só
// devolvem Briefs aprovados de edições com página web publicada, e respeitam
// o interruptor `briefs_activos`. Não existe qualquer atalho por parâmetro de
// endereço: a pré-visualização interna vive em rotas autenticadas.

import { createServerFn } from "../_shim/start.ts";
import { requireSupabaseAuth } from "../_shim/auth.ts";

import type { BriefPublico } from "../../newsletter-engine/revista/brief/publico.server.ts";

export type { BriefPublico };

export interface RespostaBriefPublico {
  brief: BriefPublico | null;
  activos: boolean;
}

export const obterBriefPublicoFn = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => ({ slug: String(d?.slug ?? "") }))
  .handler(async ({ data }): Promise<RespostaBriefPublico> => {
    const { briefsActivos } = await import("../../newsletter-engine/revista/brief/modelo.server.ts");
    const activos = await briefsActivos();
    if (!activos) return { brief: null, activos };
    const { obterBriefPublico } = await import("../../newsletter-engine/revista/brief/publico.server.ts");
    return { brief: await obterBriefPublico(data.slug), activos };
  });

/**
 * Pré-visualização interna de um Brief, com o mesmo desenho da página pública.
 * Autenticada por desenho: mostra peças ainda não publicadas.
 */
export const previsualizarBriefFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { slug: string }) => ({ slug: String(d?.slug ?? "") }))
  .handler(async ({ data }): Promise<BriefPublico | null> => {
    const { obterBriefPublico } = await import("../../newsletter-engine/revista/brief/publico.server.ts");
    return obterBriefPublico(data.slug, { preview: true });
  });
