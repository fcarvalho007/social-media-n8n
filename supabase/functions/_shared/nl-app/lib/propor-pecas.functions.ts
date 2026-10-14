// Proposta das peças móveis da crónica (lede, frase de destaque, momento).
// Proposal-first: não grava nada; o editor revê e aplica.

import { createServerFn } from "../_shim/start.ts";
import { requireSupabaseAuth } from "../_shim/auth.ts";
import { PROMPT_PECAS } from "./propor-pecas-prompt.ts";
import { paragrafosDoHtml } from "../../newsletter-engine/revista/apresentacao-heuristica.ts";
import { paragrafosCronica } from "../../newsletter-engine/revista/sequencia-cronica.ts";
import { validarPropostaPecas, type PropostaPecas } from "../../newsletter-engine/revista/pecas-proposta.ts";

export type { PropostaPecas };

export const proporPecasCronicaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown): { edicaoId: string; excerto: string } => {
    const o = (input ?? {}) as Record<string, unknown>;
    const edicaoId = typeof o.edicaoId === "string" ? o.edicaoId.trim() : "";
    const excerto = typeof o.excerto === "string" ? o.excerto.slice(0, 20000) : "";
    if (!edicaoId) throw new Error("Edição em falta.");
    return { edicaoId, excerto };
  })
  .handler(async ({ data, context }): Promise<PropostaPecas> => {
    const { data: cronica, error } = await context.supabase
      .from("nl_cronicas")
      .select("conteudo_html, conteudo")
      .eq("edicao_id", data.edicaoId)
      .maybeSingle();
    if (error) throw new Error("Não foi possível ler a crónica desta edição.");

    const bruto = (cronica?.conteudo_html ?? "").trim() || (cronica?.conteudo ?? "").trim();
    const corpo = paragrafosDoHtml(bruto).join("\n\n");
    if (corpo.length < 200) throw new Error("A crónica ainda é curta de mais para montar as peças.");

    const visiveis = paragrafosCronica(data.excerto);
    if (visiveis.length === 0) throw new Error("Não há parágrafos visíveis para posicionar as peças.");
    const numerados = visiveis.map((p, i) => `P${i + 1}: ${p}`).join("\n\n");

    const { chamarDeepSeek, parseJsonTolerante, MODELO_DEEPSEEK_PADRAO } = await import("./deepseek.server.ts");
    const r = await chamarDeepSeek(
      PROMPT_PECAS,
      `Parágrafos visíveis (${visiveis.length}):\n\n${numerados}\n\n---\nTexto integral:\n\n${corpo.slice(0, 12000)}`,
      { modelo: MODELO_DEEPSEEK_PADRAO, responseJson: true, temperatura: 0.7 },
    );

    try {
      const { supabaseAdmin } = await import("../_shim/admin.ts");
      const { custoUsd } = await import("../edge-shared/custos-ia.ts");
      await supabaseAdmin.from("nl_ia_uso").insert({
        modelo: r.modelo,
        tokens_entrada_cache_hit: r.usage.cacheHit,
        tokens_entrada_cache_miss: r.usage.cacheMiss,
        tokens_saida: r.usage.saida,
        custo_usd: custoUsd(r.modelo, r.usage.cacheHit, r.usage.cacheMiss, r.usage.saida),
        origem: "pecas_cronica",
        edicao_id: data.edicaoId,
      });
    } catch (e) {
      console.error("[pecas-cronica] falha a registar ia_uso:", (e as Error).message);
    }

    const p = parseJsonTolerante<Record<string, unknown>>(r.conteudo) ?? {};
    return validarPropostaPecas(p, corpo, visiveis.length);
  });
