// Sugestão editorial: destaques + destino por notícia, para a edição actual.
// IA única autorizada: DeepSeek.

import { createServerFn } from "../_shim/start.ts";
import { requireSupabaseAuth } from "../_shim/auth.ts";
import { chamarDeepSeek, parseJsonTolerante, MODELO_DEEPSEEK_PADRAO } from "./deepseek.server.ts";
import { custoUsd } from "../edge-shared/custos-ia.ts";

export interface SugestaoOrganizacao {
  id: string;
  titulo: string;
  categoria: string | null;
  destaque_proposto: boolean;
  destino_proposto: "news" | "site";
  justificacao: string;
  // Estado actual (para saber se a sugestão altera algo)
  destaque_actual: boolean;
  destino_actual: "news" | "site";
}

export interface SugerirOrganizacaoResultado {
  ok: boolean;
  motivo?: string;
  aviso?: string;
  sugestoes: SugestaoOrganizacao[];
}

const PROMPT_SISTEMA = `És um editor sénior de uma newsletter portuguesa de marketing e tecnologia (Digital Sprint). Escolhes o que abre a edição e o que fica só no site.

A audiência é portuguesa, sénior, interessada em marketing digital, IA aplicada, comportamento do consumidor e plataformas (Meta, Instagram, TikTok, LinkedIn, YouTube, X).

Regras rígidas de output:
- Escolhes EXACTAMENTE 3 destaques (destaque: true, destino: "news").
- Do resto, apontas ~7-8 para "news" (corpo da newsletter) e o remanescente para "site" (só na página, não no email).
- Total ideal em "news" (destaques + corpo): ~10-11 notícias.
- Nunca inventes IDs — usa apenas os que recebes.
- Justificação em português europeu (pt-PT), máximo 15 palavras, directa, sem hype.
- Devolves APENAS JSON válido, sem markdown, sem prefixos.

Formato: {"sugestoes":[{"id":"uuid","destaque":true|false,"destino":"news"|"site","justificacao":"..."}]}`;

interface Input {
  edicaoId: string;
}

export const sugerirOrganizacaoEdicao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: Input) => {
    if (!data?.edicaoId || typeof data.edicaoId !== "string") {
      throw new Error("edicaoId obrigatório");
    }
    return { edicaoId: data.edicaoId };
  })
  .handler(async ({ data, context }): Promise<SugerirOrganizacaoResultado> => {
    const { supabase } = context;

    const { data: edicao, error: eE } = await supabase
      .from("nl_edicoes")
      .select("id, numero, estado")
      .eq("id", data.edicaoId)
      .maybeSingle();
    if (eE) throw eE;
    if (!edicao) throw new Error("Edição não encontrada.");
    if (edicao.estado !== "rascunho") {
      throw new Error("Só é possível sugerir organização em edições em rascunho.");
    }

    const { data: noticias, error: nE } = await supabase
      .from("nl_noticias")
      .select("id, titulo, descricao, categoria, destaque, destino")
      .eq("edicao_id", data.edicaoId)
      .eq("estado", "aprovada");
    if (nE) throw nE;

    const aprovadas = noticias ?? [];
    if (aprovadas.length < 4) {
      return {
        ok: false,
        motivo: "Precisas de pelo menos 4 notícias aprovadas para pedir sugestão à IA.",
        sugestoes: [],
      };
    }

    // Prioridades editoriais (tabela nova; pode ainda não existir nos tipos gerados).
    const { data: prioridades } = await (supabase as unknown as {
      from: (t: string) => {
        select: (c: string) => {
          order: (col: string, o: { ascending: boolean }) => Promise<{
            data: Array<{ palavra_chave: string; peso: number }> | null;
          }>;
        };
      };
    }).from("nl_prioridades_editoriais").select("palavra_chave, peso").order("peso", { ascending: false });

    const listaPrioridades = (prioridades ?? [])
      .map((p) => `- "${p.palavra_chave}" (peso ${p.peso > 0 ? "+" : ""}${p.peso})`)
      .join("\n") || "(sem prioridades definidas)";

    const listaNoticias = aprovadas
      .map((n) => {
        const desc = (n.descricao ?? "").replace(/\s+/g, " ").trim().slice(0, 200);
        return `[${n.id}] categoria=${n.categoria ?? "?"} — ${n.titulo} — ${desc}`;
      })
      .join("\n");

    const conteudo = `PRIORIDADES EDITORIAIS (usa como pista, não como imposição):
${listaPrioridades}

NOTÍCIAS APROVADAS (${aprovadas.length}):
${listaNoticias}

Devolve o JSON conforme o formato indicado.`;

    const r = await chamarDeepSeek(PROMPT_SISTEMA, conteudo, {
      modelo: MODELO_DEEPSEEK_PADRAO,
      responseJson: true,
    });

    // Regista custo em ia_uso
    try {
      const { supabaseAdmin } = await import("../_shim/admin.ts");
      await supabaseAdmin.from("nl_ia_uso").insert({
        modelo: r.modelo,
        tokens_entrada_cache_hit: r.usage.cacheHit,
        tokens_entrada_cache_miss: r.usage.cacheMiss,
        tokens_saida: r.usage.saida,
        custo_usd: custoUsd(r.modelo, r.usage.cacheHit, r.usage.cacheMiss, r.usage.saida),
        origem: "sugestao_organizacao",
        edicao_id: edicao.id,
      });
    } catch (e) {
      console.error("[sugerir-organizacao] falha a registar ia_uso:", (e as Error).message);
    }

    const parsed = parseJsonTolerante<unknown>(r.conteudo);
    let arr: unknown[] = [];
    if (Array.isArray(parsed)) arr = parsed;
    else if (parsed && typeof parsed === "object") {
      const p = parsed as Record<string, unknown>;
      if (Array.isArray(p.sugestoes)) arr = p.sugestoes;
    }
    if (arr.length === 0) throw new Error("A IA não devolveu sugestões utilizáveis. Tenta novamente.");

    const porId = new Map<string, (typeof aprovadas)[number]>(aprovadas.map((n) => [n.id, n]));
    const sugestoes: SugestaoOrganizacao[] = [];
    let destaquesContados = 0;
    for (const it of arr) {
      if (!it || typeof it !== "object") continue;
      const o = it as Record<string, unknown>;
      const id = typeof o.id === "string" ? o.id : "";
      const base = porId.get(id);
      if (!base) continue; // descarta IDs inventados
      const destaque = Boolean(o.destaque);
      const destinoRaw = String(o.destino ?? "").toLowerCase();
      const destino: "news" | "site" = destaque ? "news" : (destinoRaw === "site" ? "site" : "news");
      const justBruta = typeof o.justificacao === "string" ? o.justificacao : "";
      const { sanitizarSaidaIA } = await import("./sanitizar-ia.ts");
      const just = sanitizarSaidaIA(justBruta).slice(0, 160);

      if (destaque) destaquesContados += 1;
      sugestoes.push({
        id,
        titulo: base.titulo,
        categoria: base.categoria,
        destaque_proposto: destaque,
        destino_proposto: destino,
        justificacao: just || "(sem justificação)",
        destaque_actual: Boolean(base.destaque),
        destino_actual: (base.destino as "news" | "site") ?? "news",
      });
    }

    if (sugestoes.length === 0) throw new Error("Nenhuma sugestão da IA correspondeu às notícias aprovadas.");

    // Ordena: destaques primeiro, depois news, depois site
    sugestoes.sort((a, b) => {
      const rank = (s: SugestaoOrganizacao) => (s.destaque_proposto ? 0 : s.destino_proposto === "news" ? 1 : 2);
      return rank(a) - rank(b);
    });

    const aviso =
      destaquesContados !== 3
        ? `A IA propôs ${destaquesContados} destaque(s) em vez de 3 — revê manualmente antes de aplicar.`
        : undefined;

    return { ok: true, sugestoes, aviso };
  });
