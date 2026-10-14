// Server functions públicas da edição web Revista.
//
// Sem autenticação por desenho: são páginas públicas. Em contrapartida, só
// devolvem conteúdo de edições já publicadas (ver `publicacao.server.ts`).

import { createServerFn } from "../_shim/start.ts";

import type {
  PaginaEdicaoPublica,
  ResumoEdicaoPublica,
  GrupoAtualidades,
  VizinhaPublica,
} from "../../newsletter-engine/revista/publicacao.server.ts";

export type { PaginaEdicaoPublica, ResumoEdicaoPublica, GrupoAtualidades, VizinhaPublica };

/** Base absoluta das edições públicas (`configuracoes.edicoes_base_url`). */
export const baseUrlEdicoesFn = createServerFn({ method: "GET" }).handler(async () => {
  const { baseUrlEdicoes } = await import("../../newsletter-engine/revista/destinos.server.ts");
  return baseUrlEdicoes();
});

/** Arquivo: todas as edições Revista publicadas, mais recente primeiro. */
export const listarEdicoesPublicasFn = createServerFn({ method: "GET" }).handler(async () => {
  const { listarEdicoesPublicas } = await import("../../newsletter-engine/revista/publicacao.server.ts");
  return listarEdicoesPublicas();
});

/** Edição pública por número. `null` quando não existe ou não está publicada. */
export const obterEdicaoPublicaFn = createServerFn({ method: "GET" })
  .inputValidator((d: { numero: number }) => ({ numero: Number(d?.numero) }))
  .handler(async ({ data }) => {
    if (!Number.isInteger(data.numero) || data.numero <= 0) return null;
    const { obterPaginaEdicaoPublica } = await import("../../newsletter-engine/revista/publicacao.server.ts");
    return obterPaginaEdicaoPublica(data.numero);
  });
