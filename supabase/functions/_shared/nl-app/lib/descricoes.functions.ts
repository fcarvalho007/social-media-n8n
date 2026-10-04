import { createServerFn } from "../_shim/start.ts";
import { requireSupabaseAuth } from "../_shim/auth.ts";
import { avaliarDescricao } from "./similaridade-texto.ts";

/**
 * Correcção de descrições que ficaram a repetir o título.
 * Lê o artigo original (guardando-o para reutilização) e pede à IA uma
 * descrição que acrescente informação. Nunca inventa: se o artigo não estiver
 * acessível, trabalha com o material existente.
 */
export const corrigirDescricoes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown): { ids: string[] } => {
    const o = (input ?? {}) as Record<string, unknown>;
    const ids = Array.isArray(o.ids) ? o.ids.filter((v): v is string => typeof v === "string") : [];
    if (ids.length === 0) throw new Error("Sem notícias indicadas");
    if (ids.length > 25) throw new Error("Máximo de 25 notícias por correcção");
    return { ids };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("../_shim/admin.ts");
    const { reescreverDescricao } = await import("./ia-extractor.server.ts");
    const { lerArtigo } = await import("./ler-artigo.server.ts");
    const { custoUsd } = await import("../edge-shared/custos-ia.ts");

    const { data: linhas, error } = await supabaseAdmin
      .from("nl_noticias")
      .select("id, titulo, descricao, url, corpo_artigo, edicao_id")
      .in("id", data.ids);
    if (error) throw new Error(error.message);

    type Linha = {
      id: string; titulo: string; descricao: string | null; url: string | null;
      corpo_artigo: string | null; edicao_id: string | null;
    };

    let corrigidas = 0;
    let inalteradas = 0;
    const falhas: string[] = [];

    for (const n of (linhas ?? []) as Linha[]) {
      const descricao = (n.descricao ?? "").trim();
      if (!descricao || !avaliarDescricao(n.titulo, descricao).repete) { inalteradas += 1; continue; }
      try {
        let corpo = (n.corpo_artigo ?? "").trim();
        if (!corpo && n.url) {
          const lido = await lerArtigo(n.url);
          corpo = lido.corpo;
          if (corpo) {
            await supabaseAdmin.from("nl_noticias").update({ corpo_artigo: corpo } as never).eq("id", n.id);
          }
        }
        const r = await reescreverDescricao({ titulo: n.titulo, descricao, corpoArtigo: corpo });
        try {
          await supabaseAdmin.from("nl_ia_uso").insert({
            modelo: r.modelo,
            tokens_entrada_cache_hit: r.usage.cacheHit,
            tokens_entrada_cache_miss: r.usage.cacheMiss,
            tokens_saida: r.usage.saida,
            custo_usd: custoUsd(r.modelo, r.usage.cacheHit, r.usage.cacheMiss, r.usage.saida),
            origem: "descricao_reescrita",
            edicao_id: n.edicao_id,
          } as never);
        } catch { /* o custo nunca bloqueia a correcção */ }

        if (r.descricao && !avaliarDescricao(n.titulo, r.descricao).repete) {
          const { error: upErr } = await supabaseAdmin
            .from("nl_noticias").update({ descricao: r.descricao } as never).eq("id", n.id);
          if (upErr) throw new Error(upErr.message);
          corrigidas += 1;
        } else {
          inalteradas += 1;
        }
      } catch (e) {
        falhas.push(`${n.titulo.slice(0, 60)} — ${(e as Error).message}`);
      }
    }

    if (corrigidas > 0) {
      try {
        await supabaseAdmin.from("nl_audit_log").insert({
          quem: context.userId,
          accao: `Descrições corrigidas — ${corrigidas} de ${data.ids.length}`,
          detalhe: { corrigidas, inalteradas, falhas: falhas.length },
        } as never);
      } catch { /* auditoria nunca bloqueia */ }
    }

    return { corrigidas, inalteradas, falhas };
  });
