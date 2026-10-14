import process from "node:process";
import { createFileRoute } from "../_shim/router.ts";

// Cron semanal (chamado por pg_cron via net.http_post) OU manual via server fn:
// - percorre fontes_curadoria activas de tipo 'directorio_ferramentas'
// - scrape → dedupe URL (contra ferramentas_sugeridas + ferramentas_excluidas)
// - IA relevância (marketing/business?) descarta programação
// - IA polimento (descricao 120c + cor) + emoji heurístico
// - insere em ferramentas_sugeridas (estado='pendente'), respeitando tecto global
// - regista custos IA em ia_uso e escreve audit_log

const MAX_INSERCOES_DEFAULT = 10;

async function handler(request: Request): Promise<Response> {
  const anonEsperada = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
  const apikey = request.headers.get("apikey") ?? request.headers.get("Apikey");
  if (!anonEsperada || !apikey || apikey !== anonEsperada) {
    return new Response(JSON.stringify({ ok: false, mensagem: "Não autorizado" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Corpo opcional: { forcar_fontes?: string[] } — quando presente, filtra as fontes.
  let forcarFontes: string[] | null = null;
  try {
    const raw = await request.text();
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.forcar_fontes)) forcarFontes = parsed.forcar_fontes as string[];
    }
  } catch { /* ignora corpo mal formado */ }

  const { supabaseAdmin } = await import("../_shim/admin.ts");
  const { scrapeDirectorio, extrairDominio, normalizarNome } = await import(
    "../edge-shared/scrapers-ferramentas.ts"
  );
  const { normalizarUrl, dedupPorUrl } = await import(
    "../edge-shared/ia-limpeza.ts"
  );
  const { classificarRelevancia, polirFerramenta } = await import("../lib/ia-ferramentas.server.ts");
  const { sugerirEmoji } = await import("../features/newsletter/emoji.ts");
  const { custoUsd } = await import("../edge-shared/custos-ia.ts");

  // 1) Config
  let MAX = MAX_INSERCOES_DEFAULT;
  let activo = true;
  try {
    const { data: cfg } = await supabaseAdmin
      .from("curadoria_ferramentas_config" as never)
      .select("max_por_corrida, activo")
      .eq("id", 1)
      .maybeSingle();
    if (cfg) {
      MAX = (cfg as { max_por_corrida?: number }).max_por_corrida ?? MAX;
      activo = (cfg as { activo?: boolean }).activo ?? true;
    }
  } catch { /* defaults */ }

  if (!activo && !forcarFontes) {
    return new Response(JSON.stringify({ ok: true, inseridas: 0, mensagem: "Curadoria desactivada" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // 2) Fontes activas (ou explicitamente forçadas)
  let q = supabaseAdmin
    .from("nl_fontes_curadoria")
    .select("id, nome, url_feed, url_listagem, activa")
    .eq("tipo", "directorio_ferramentas");
  if (forcarFontes && forcarFontes.length > 0) q = q.in("id", forcarFontes);
  else q = q.eq("activa", true);
  const { data: fontes, error: errFontes } = await q;
  if (errFontes) {
    return new Response(JSON.stringify({ ok: false, mensagem: errFontes.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
  const fontesValidas = (fontes ?? []).filter((f) => !!f.url_listagem || !!f.url_feed);

  // 3) Scrape em paralelo
  type Cand = { nome: string; descricao_original: string; url: string; fonte_id: string; fonte_nome: string };
  const candidatos: Cand[] = [];
  const razoesScrape: Record<string, string> = {};
  const scrapedPorFonte: Record<string, number> = {};
  await Promise.all(
    fontesValidas.map(async (f) => {
      const url = (f as { url_listagem?: string }).url_listagem || f.url_feed;
      const res = await scrapeDirectorio(f.nome, url, 20);
      scrapedPorFonte[f.id] = res.items.length;
      if (res.items.length === 0 && res.razao) razoesScrape[f.id] = res.razao;
      for (const it of res.items) candidatos.push({ ...it, fonte_id: f.id, fonte_nome: f.nome });
    }),
  );

  // 4) Dedupe: já em ferramentas_sugeridas + excluídas + entre-directórios
  const jaVistos = new Set<string>();
  if (candidatos.length > 0) {
    const urls = Array.from(new Set(candidatos.map((c) => c.url)));
    const { data: existentes } = await supabaseAdmin
      .from("nl_ferramentas_sugeridas").select("url").in("url", urls);
    for (const r of existentes ?? []) if (r.url) jaVistos.add(normalizarUrl(r.url));
  }
  // Excluídas por domínio OU por nome normalizado (ban aplicado no editor)
  const { data: excluidas } = await supabaseAdmin
    .from("ferramentas_excluidas" as never).select("dominio, nome_norm");
  const dominiosBanidos = new Set<string>();
  const nomesBanidos = new Set<string>();
  for (const r of (excluidas ?? []) as Array<{ dominio: string | null; nome_norm: string | null }>) {
    if (r.dominio) dominiosBanidos.add(r.dominio);
    if (r.nome_norm) nomesBanidos.add(r.nome_norm);
  }
  const filtrados = candidatos.filter((c) => {
    const dom = extrairDominio(c.url);
    if (dom && dominiosBanidos.has(dom)) return false;
    const nn = normalizarNome(c.nome);
    if (nn && nomesBanidos.has(nn)) return false;
    return true;
  });
  const unicos = dedupPorUrl(filtrados, (c) => c.url, jaVistos);

  // 5) IA: relevância → polimento → insert, até ao tecto
  let inseridas = 0;
  let descartadas = 0;
  const fontesQueGeraram = new Set<string>();
  let custoAcumulado = 0;

  const registarUso = async (origem: string, u: { modelo: string; cacheHit: number; cacheMiss: number; saida: number }) => {
    const cost = custoUsd(u.modelo, u.cacheHit, u.cacheMiss, u.saida);
    custoAcumulado += cost;
    try {
      await supabaseAdmin.from("nl_ia_uso").insert({
        modelo: u.modelo,
        tokens_entrada_cache_hit: u.cacheHit,
        tokens_entrada_cache_miss: u.cacheMiss,
        tokens_saida: u.saida,
        custo_usd: cost,
        origem,
        edicao_id: null,
      });
    } catch { /* não bloqueia */ }
  };

  for (const item of unicos) {
    if (inseridas >= MAX) break;

    // 5a) Relevância
    let rel;
    try {
      rel = await classificarRelevancia(item.nome, item.descricao_original);
    } catch { continue; }
    await registarUso("curadoria_ferramentas_relevancia", rel.uso);
    if (!rel.ok) { descartadas += 1; continue; }

    // 5b) Polimento
    let pol;
    try {
      pol = await polirFerramenta(item.nome, item.descricao_original);
    } catch { continue; }
    await registarUso("curadoria_ferramentas_polimento", pol.uso);

    const emoji = sugerirEmoji(item.nome, pol.descricao || item.descricao_original);

    const { error: insErr } = await supabaseAdmin.from("nl_ferramentas_sugeridas").insert({
      nome: item.nome.slice(0, 120),
      url: item.url,
      descricao: pol.descricao,
      descricao_original: item.descricao_original,
      emoji,
      cor: pol.cor,
      categoria: "marketing",
      estado: "pendente",
      remetente: item.fonte_nome,
      assunto_origem: null,
      fonte_email_id: null,
      fonte_directorio_id: item.fonte_id,
    } as never);
    if (insErr) continue;
    inseridas += 1;
    fontesQueGeraram.add(item.fonte_id);
  }

  // 6) Actualizar ultima_recolha + tracking de zeros consecutivos.
  //    Se uma fonte devolveu 0 candidatos em 3 corridas seguidas, desactivamos
  //    automaticamente (só quando NÃO for uma corrida forçada — nesses casos o
  //    utilizador está a diagnosticar e queremos preservar o estado).
  const desactivadas: string[] = [];
  const agora = new Date().toISOString();
  for (const f of fontesValidas) {
    const scraped = scrapedPorFonte[f.id] ?? 0;
    if (scraped > 0) {
      await supabaseAdmin
        .from("nl_fontes_curadoria")
        .update({ ultima_recolha: agora, zeros_consecutivos: 0 })
        .eq("id", f.id);
      continue;
    }
    // Zero candidatos → incrementar contador
    const { data: actual } = await supabaseAdmin
      .from("nl_fontes_curadoria")
      .select("zeros_consecutivos")
      .eq("id", f.id)
      .maybeSingle();
    const novoContador = ((actual as { zeros_consecutivos?: number } | null)?.zeros_consecutivos ?? 0) + 1;
    const desactivar = !forcarFontes && novoContador >= 3;
    await supabaseAdmin
      .from("nl_fontes_curadoria")
      .update({
        ultima_recolha: agora,
        zeros_consecutivos: novoContador,
        ...(desactivar ? { activa: false } : {}),
      } as never)
      .eq("id", f.id);
    if (desactivar) desactivadas.push(f.nome);
  }

  await supabaseAdmin.from("nl_audit_log").insert({
    quem: "sistema",
    accao: `Curadoria ferramentas: ${inseridas} novas de ${fontesQueGeraram.size} directórios`,
    detalhe: {
      fontes: fontesValidas.length,
      candidatos: candidatos.length,
      unicos: unicos.length,
      descartadas_por_ia: descartadas,
      inseridas,
      tecto: MAX,
      custo_usd: Number(custoAcumulado.toFixed(6)),
      forcado: !!forcarFontes,
      desactivadas_por_zeros: desactivadas,
    },
  } as never);

  return new Response(JSON.stringify({
    ok: true,
    inseridas,
    descartadas_por_ia: descartadas,
    candidatos: candidatos.length,
    fontes: fontesValidas.length,
    custo_usd: Number(custoAcumulado.toFixed(6)),
    scrapedPorFonte,
    razoesScrape,
  }), { headers: { "Content-Type": "application/json" } });
}

export const Route = createFileRoute("/api/public/hooks/curadoria-ferramentas")({
  server: {
    handlers: {
      POST: async ({ request }) => handler(request),
    },
  },
});
