// Pré-visualização interna da versão web Revista.
// Autenticada por desenho: mostra edições ainda não publicadas, pelo que
// nunca pode ser exposta em rotas públicas. A regra pública de publicação
// mantém-se intacta em `publicacao.server.ts`.

import { createServerFn } from "../_shim/start.ts";
import { requireSupabaseAuth } from "../_shim/auth.ts";
import type { PaginaEdicaoPublica } from "../../newsletter-engine/revista/publicacao.server.ts";

export const previsualizarEdicaoWebFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { edicaoId?: string; numero?: number } | undefined) => ({
    edicaoId: d?.edicaoId?.trim() || "",
    numero: Number.isInteger(Number(d?.numero)) && Number(d?.numero) > 0 ? Number(d?.numero) : 0,
  }))
  .handler(async ({ data, context }): Promise<PaginaEdicaoPublica | null> => {
    const sb = context.supabase;

    let edicaoId = data.edicaoId;
    if (!edicaoId && data.numero) {
      // Pré-visualizar por número da edição (usado pelo modal de envio).
      const { data: linha } = await sb
        .from("nl_edicoes")
        .select("id")
        .eq("template_version", "revista")
        .eq("numero", data.numero)
        .maybeSingle();
      edicaoId = (linha as { id: string } | null)?.id ?? "";
      if (!edicaoId) return null;
    }
    if (!edicaoId) {
      const { data: linha } = await sb
        .from("nl_edicoes")
        .select("id")
        .eq("template_version", "revista")
        .order("numero", { ascending: false })
        .limit(1)
        .maybeSingle();
      edicaoId = (linha as { id: string } | null)?.id ?? "";
    }
    if (!edicaoId) return null;

    const { composeRevistaEdition } = await import("../../newsletter-engine/revista/compose.server.ts");
    const { agruparAtualidades } = await import("../../newsletter-engine/revista/publicacao.server.ts");
    const { mapaBriefsDaEdicao } = await import("../../newsletter-engine/revista/brief/publico.server.ts");
    const estrutura = await composeRevistaEdition(edicaoId, { ignorarSnapshot: true });

    return {
      estrutura,
      grupos: agruparAtualidades(estrutura.atualidades ?? []),
      anterior: null,
      seguinte: null,
      enviada: false,
      briefs: await mapaBriefsDaEdicao(estrutura.edicao.numero, { preview: true }),
    };
  });
