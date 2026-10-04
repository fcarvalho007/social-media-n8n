import process from "node:process";
import { createFileRoute } from "../_shim/router.ts";

// Cron diário (chamado por pg_cron via net.http_post):
// - percorre fontes_curadoria activas
// - lê o feed, filtra itens das últimas 24h
// - dedupe por url na tabela noticias
// - envia cada item novo ao extractor IA (o mesmo do "colar notícias")
// - insere pendentes com origem 'curadoria_ia', respeitando o tecto de 15/dia
// - actualiza ultima_recolha nas fontes lidas
// - regista audit_log

const MAX_INSERCOES_DEFAULT = 15;
const JANELA_HORAS_DEFAULT = 24;

type ItemFeed = { titulo: string; url: string; descricao: string; publicado: number };

function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function stripTags(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function pickTag(bloco: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m = bloco.match(re);
  return m ? m[1] : null;
}

function pickLink(bloco: string): string | null {
  // Atom: <link href="..."/> (preferir rel="alternate" ou sem rel)
  const atom = bloco.match(/<link[^>]*?href=["']([^"']+)["'][^>]*\/?>/i);
  if (atom) {
    const rel = atom[0].match(/rel=["']([^"']+)["']/i);
    if (!rel || rel[1].toLowerCase() === "alternate") return atom[1];
  }
  // RSS: <link>URL</link>
  const rss = pickTag(bloco, "link");
  if (rss) return rss.trim();
  return null;
}

function parseFeed(xml: string): ItemFeed[] {
  const items: ItemFeed[] = [];
  const regexItem = /<(item|entry)\b[\s\S]*?<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = regexItem.exec(xml)) !== null) {
    const bloco = m[0];
    const titulo = stripTags(pickTag(bloco, "title") ?? "");
    const url = (pickLink(bloco) ?? "").trim();
    const desc = stripTags(
      pickTag(bloco, "description") ?? pickTag(bloco, "summary") ?? pickTag(bloco, "content") ?? "",
    );
    const dataRaw = pickTag(bloco, "pubDate") ?? pickTag(bloco, "published") ?? pickTag(bloco, "updated") ?? "";
    const ts = dataRaw ? Date.parse(dataRaw.trim()) : NaN;
    if (!url || !titulo) continue;
    items.push({ titulo, url, descricao: desc, publicado: Number.isFinite(ts) ? ts : Date.now() });
  }
  return items;
}

async function lerFeed(url: string): Promise<ItemFeed[]> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 15_000);
  try {
    const res = await fetch(url, {
      signal: ctl.signal,
      headers: { "User-Agent": "DigitalSprintBot/1.0 (+curadoria)" },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseFeed(xml);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function handler(request: Request): Promise<Response> {
  // Auth: apikey (Supabase anon) header — mesmo padrão dos outros hooks
  const anonEsperada = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
  const apikey = request.headers.get("apikey") ?? request.headers.get("Apikey");
  if (!anonEsperada || !apikey || apikey !== anonEsperada) {
    return new Response(JSON.stringify({ ok: false, mensagem: "Não autorizado" }), {
      status: 401, headers: { "Content-Type": "application/json" },
    });
  }

  const { supabaseAdmin } = await import("../_shim/admin.ts");
  const { mapCategoria } = await import("../lib/ia-extractor.server.ts");

  // Corpo opcional: { forcar_fontes?: string[] } — quando presente, filtra e ignora o "activa".
  let forcarFontes: string[] | null = null;
  try {
    const raw = await request.text();
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.forcar_fontes) && parsed.forcar_fontes.length > 0) {
        forcarFontes = parsed.forcar_fontes as string[];
      }
    }
  } catch { /* corpo mal formado, ignora */ }

  // 0) Ler configuração (tectos + janela). Fallback aos defaults em caso de erro.
  const { lerTectos, vagasDiarias } = await import(
    "../edge-shared/tectos-curadoria.ts"
  );
  const tectos = await lerTectos(supabaseAdmin);
  const JANELA_HORAS = tectos.janelaHoras ?? JANELA_HORAS_DEFAULT;
  const vagasDia = await vagasDiarias(supabaseAdmin, tectos, "rss");
  const MAX_INSERCOES = Math.min(tectos.maxPorCorrida ?? MAX_INSERCOES_DEFAULT, vagasDia);

  // 1) Fontes activas (ou forçadas). Newsletters ignoradas — chegam por email.
  let queryFontes = supabaseAdmin
    .from("nl_fontes_curadoria").select("id, nome, url_feed, tipo, url_listagem, grupo");
  if (forcarFontes) queryFontes = queryFontes.in("id", forcarFontes);
  else queryFontes = queryFontes.eq("activa", true);

  const { data: fontes, error: errFontes } = await queryFontes;
  if (errFontes) {
    return new Response(JSON.stringify({ ok: false, mensagem: errFontes.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
  const fontesValidas = (fontes ?? [])
    .filter((f) => (((f as { tipo?: string }).tipo ?? "rss") !== "newsletter"))
    .filter((f) => !!f.url_feed || !!(f as { url_listagem?: string }).url_listagem);

  // 2) Ler feeds/HTML em paralelo
  const limite = Date.now() - JANELA_HORAS * 3600 * 1000;
  type Candidato = ItemFeed & { fonte_id: string; fonte_nome: string; fonte_grupo: string };
  const candidatos: Candidato[] = [];
  const fontesLidas: string[] = [];

  const { extrairArtigosHtml } = await import("../lib/html-scraper.ts");
  await Promise.all(
    fontesValidas.map(async (f) => {
      const tipo = ((f as { tipo?: string }).tipo ?? "rss") as "rss" | "html";
      let itens: ItemFeed[] = [];
      if (tipo === "html") {
        const url = (f as { url_listagem?: string }).url_listagem || f.url_feed;
        const r = await extrairArtigosHtml(url, { maxItens: 30 });
        if (r.ok) itens = r.artigos.map((a) => ({ titulo: a.titulo, url: a.url, descricao: a.descricao, publicado: a.publicado }));
      } else {
        itens = await lerFeed(f.url_feed);
      }
      fontesLidas.push(f.id);
      for (const it of itens) {
        if (it.publicado < limite) continue;
        candidatos.push({
          ...it,
          fonte_id: f.id,
          fonte_nome: f.nome,
          fonte_grupo: ((f as { grupo?: string | null }).grupo || f.nome || f.id),
        });

      }
    }),
  );

  // 3) Dedupe: por URL já existente, por URLs repetidos entre feeds e por
  //    títulos praticamente iguais dentro da mesma corrida.
  const { normalizarUrl, dedupPorUrl } = await import("../edge-shared/ia-limpeza.ts");
  const { procurarDuplicadosUrl } = await import("../edge-shared/dedup-url.ts");
  const { seleccionarDiverso, chaveTitulo, semelhancaTitulos } = await import(
    "../edge-shared/seleccao-diversa.ts"
  );
  const urlsCandidatos = Array.from(new Set(candidatos.map((c) => c.url)));
  const jaVistos = new Set<string>();
  const gemeas = await procurarDuplicadosUrl(supabaseAdmin, urlsCandidatos);
  for (const k of gemeas.keys()) jaVistos.add(k);
  const ignoradosPorUrl = candidatos.filter((c) => c.url && jaVistos.has(normalizarUrl(c.url))).length;

  // Ruído (rodapés, páginas institucionais) sai antes de gastar IA.
  const { motivoTituloLixo, descreverMotivoLixo } = await import(
    "../edge-shared/ruido-titulo.ts"
  );
  const ignoradasPorRuido: string[] = [];
  const semRuido = candidatos.filter((c) => {
    const m = motivoTituloLixo(c.titulo, c.descricao, c.url);
    if (!m) return true;
    ignoradasPorRuido.push(`«${c.titulo.slice(0, 70)}» → ${descreverMotivoLixo(m)}`);
    return false;
  });

  const semUrlRepetido = dedupPorUrl(semRuido, (c) => c.url, jaVistos);

  // Títulos praticamente iguais dentro da mesma corrida (fontes diferentes).
  const titulosVistos: string[] = [];
  let ignoradosTituloRepetido = 0;
  const unicos = semUrlRepetido.filter((c) => {
    const k = chaveTitulo(c.titulo);
    if (!k) return false;
    if (titulosVistos.some((t) => t === k || semelhancaTitulos(t, k) >= 0.8)) {
      ignoradosTituloRepetido += 1;
      return false;
    }
    titulosVistos.push(k);
    return true;
  });

  // Modo manual (por omissão): a recolha guarda os candidatos em fila e não
  // gasta IA. O processamento acontece só quando alguém carrega no botão.
  const { modoManualActivo, enfileirar } = await import("../lib/fila-curadoria.server.ts");
  if (await modoManualActivo(supabaseAdmin as never)) {
    const enfileirados = await enfileirar(
      supabaseAdmin as never,
      unicos.map((c) => ({
        origem: "rss" as const,
        fonte_id: c.fonte_id,
        fonte_nome: c.fonte_nome,
        fonte_grupo: c.fonte_grupo,
        titulo: c.titulo,
        url: c.url,
        url_norm: c.url ? normalizarUrl(c.url) : null,
        descricao: c.descricao,
        publicado_em: new Date(c.publicado).toISOString(),
      })),
    );

    if (fontesLidas.length > 0) {
      await supabaseAdmin
        .from("nl_fontes_curadoria")
        .update({ ultima_recolha: new Date().toISOString() })
        .in("id", fontesLidas);
    }

    await supabaseAdmin.from("nl_audit_log").insert({
      quem: "sistema",
      accao: `Recolha automática: ${enfileirados} itens na fila de entrada (sem IA)`,
      detalhe: {
        modo: "manual",
        fontes_activas: fontesValidas.length,
        fontes_lidas: fontesLidas.length,
        candidatos: candidatos.length,
        unicos: unicos.length,
        enfileirados,
        ignorados_url_duplicado: ignoradosPorUrl,
        ignorados_titulo_repetido: ignoradosTituloRepetido,
        ignorados_ruido: ignoradasPorRuido.length,
      },
    });

    return new Response(JSON.stringify({
      ok: true,
      modo: "manual",
      inseridas: 0,
      enfileirados,
      fontes_activas: fontesValidas.length,
      candidatos: candidatos.length,
    }), { headers: { "Content-Type": "application/json" } });
  }


  // Selecção equilibrada: o tecto é repartido pelas publicações (grupo) e
  // categorias, para que vários remetentes da mesma marca não contem como
  // fontes distintas.
  const { seleccionados: novos, porFonte } = seleccionarDiverso(
    unicos,
    {
      fonte: (c) => c.fonte_grupo || c.fonte_nome || c.fonte_id,
      prioridade: (c) => c.publicado,
    },
    { max: MAX_INSERCOES, maxPorFonte: tectos.maxPorFonte, maxPorCategoria: tectos.maxPorCategoria },
  );




  // 4) Extractor IA + inserir
  const { custoUsd } = await import("../edge-shared/custos-ia.ts");
  const { confirmarRepeticaoIA } = await import("../edge-shared/deteccao-repeticao.ts");
  const { chamarDeepSeek } = await import("../lib/deepseek.server.ts");
  const chamarChatDedup = async (system: string, user: string) => {
    try {
      const r = await chamarDeepSeek(system, user, { temperatura: 0 });
      if (!r.conteudo) return null;
      return { conteudo: r.conteudo, usage: r.usage, modelo: r.modelo };
    } catch { return null; }
  };

  // Fase 2 (confirmação por DeepSeek) — controlada por configuração.
  let fase2Activa = true;
  try {
    const { data: cfg } = await supabaseAdmin
      .from("nl_configuracoes").select("valor").eq("chave", "deteccao_repeticao_ia_activa").maybeSingle();
    if (cfg && cfg.valor === "false") fase2Activa = false;
  } catch { /* default: activo */ }

  let inseridas = 0;
  const fontesQueGeraram = new Set<string>();
  const ignoradasPorRepeticao: string[] = [];


  const { extrairNoticiaComCorpo } = await import("../lib/extrair-noticia.server.ts");
  const registarUso = async (u: {
    modelo: string;
    usage: { cacheHit: number; cacheMiss: number; saida: number };
    origem: string;
  }) => {
    try {
      await supabaseAdmin.from("nl_ia_uso").insert({
        modelo: u.modelo,
        tokens_entrada_cache_hit: u.usage.cacheHit,
        tokens_entrada_cache_miss: u.usage.cacheMiss,
        tokens_saida: u.usage.saida,
        custo_usd: custoUsd(u.modelo, u.usage.cacheHit, u.usage.cacheMiss, u.usage.saida),
        origem: u.origem,
        edicao_id: null,
      });
    } catch (e) {
      console.error("Falha a registar ia_uso (RSS):", (e as Error).message);
    }
  };

  for (const item of novos) {
    // Lê o artigo original antes da IA: sem material próprio, a descrição
    // limita-se a reescrever o título.
    let extraccao: Awaited<ReturnType<typeof extrairNoticiaComCorpo>> | null = null;
    try {
      extraccao = await extrairNoticiaComCorpo(
        {
          titulo: item.titulo,
          descricao: item.descricao,
          url: item.url,
          origemUso: "curadoria_rss",
        },
        registarUso,
      );
    } catch { continue; }

    const ia = extraccao?.ia;
    if (!ia) continue;

    const titulo = extraccao!.titulo;
    const descricao = extraccao!.descricao;
    const corpoArtigo = extraccao!.corpo;
    const categoria = mapCategoria(ia.categoria);
    const urlBruto = (typeof ia.url === "string" && /^https?:\/\//i.test(ia.url)) ? ia.url : item.url;
    const { resolverFonteArtigo } = await import("../edge-shared/resolver-url.ts");
    const fonte = await resolverFonteArtigo({ titulo, descricao, url: urlBruto });
    const url = fonte.url || urlBruto;


    // Páginas institucionais e títulos sem conteúdo nunca entram em pendentes.
    const motivoLixo = motivoTituloLixo(titulo, descricao, url);
    if (motivoLixo) {
      ignoradasPorRuido.push(`«${titulo.slice(0, 70)}» → ${descreverMotivoLixo(motivoLixo)}`);
      continue;
    }


    // Detecção de repetições: Fase 1 pg_trgm (grátis) + Fase 2 DeepSeek (só nos suspeitos).
    let repeticaoDe: string | null = null;
    let repeticaoScore: number | null = null;
    const hit = await confirmarRepeticaoIA(
      supabaseAdmin,
      { titulo, descricao, categoria },
      chamarChatDedup,
      {
        fase2Activa,
        origem: "confirmar_repeticao",

        onFase1IgnoradaPorConfig: async (candidatos) => {
          try {
            await supabaseAdmin.from("nl_audit_log").insert({
              quem: "sistema · cron RSS",
              accao: "repeticao_fase1_ignorada_por_config",
              detalhe: {
                titulo,
                categoria,
                fonte_id: item.fonte_id,
                url,
                candidatos: candidatos.slice(0, 3).map((c) => ({
                  id: c.id, titulo: c.titulo, score: c.score, edicao_numero: c.edicao_numero,
                })),
              },
            });
          } catch { /* nunca bloqueia */ }
        },
      },
    );
    if (hit) {
      // Repetição confirmada → nem chega a entrar em pendentes.
      if (hit.nivel === "confirmada") {
        ignoradasPorRepeticao.push(`«${titulo.slice(0, 70)}» ≈ «${hit.candidato_titulo.slice(0, 70)}»`);
        continue;
      }
      repeticaoDe = hit.candidato_id;
      repeticaoScore = hit.score_trgm;
    }


    const { error: insErr } = await supabaseAdmin.from("nl_noticias").insert({
      titulo: titulo.slice(0, 240),
      descricao,
      url,
      categoria,
      origem: "curadoria_ia",
      estado: "pendente",
      destino: "news",
      destaque: false,
      ordem: 0,
      edicao_id: null,
      fonte_id: item.fonte_id,
      repeticao_de: repeticaoDe,
      repeticao_score: repeticaoScore,
      repeticao_verificada_em: new Date().toISOString(),
      fonte_estado: fonte.estado,
      fonte_url_original: fonte.urlOriginal,
      corpo_artigo: corpoArtigo || null,
    } as never);

    if (insErr) continue;
    inseridas += 1;
    fontesQueGeraram.add(item.fonte_id);
  }



  // 5) Actualizar ultima_recolha
  if (fontesLidas.length > 0) {
    await supabaseAdmin
      .from("nl_fontes_curadoria")
      .update({ ultima_recolha: new Date().toISOString() })
      .in("id", fontesLidas);
  }

  // 6) Audit — distinguir «não correu» de «correu e não inseriu».
  let motivoZero: string | null = null;
  if (inseridas === 0) {
    if (vagasDia <= 0) motivoZero = "Quota diária esgotada";
    else if (candidatos.length === 0) motivoZero = "Sem itens novos na janela das fontes";
    else if (novos.length === 0) {
      motivoZero = ignoradosPorUrl > 0 || ignoradosTituloRepetido > 0
        ? "Todos os candidatos já existiam ou estavam repetidos"
        : "Todos os candidatos foram descartados por ruído";
    } else motivoZero = "Candidatos descartados como repetições ou ruído na extracção";
  }

  await supabaseAdmin.from("nl_audit_log").insert({
    quem: "sistema",
    accao: `Curadoria automática: ${inseridas} notícias sugeridas de ${fontesQueGeraram.size} fontes`,
    detalhe: {
      fontes_activas: fontesValidas.length,
      fontes_lidas: fontesLidas.length,
      candidatos: candidatos.length,
      novos_apos_dedupe: novos.length,
      ignorados_url_duplicado: ignoradosPorUrl,
      ignorados_titulo_repetido: ignoradosTituloRepetido,
      ignorados_repeticao: ignoradasPorRepeticao.length,
      ignorados_repeticao_detalhe: ignoradasPorRepeticao.slice(0, 20),
      ignorados_ruido: ignoradasPorRuido.length,
      ignorados_ruido_detalhe: ignoradasPorRuido.slice(0, 20),
      distribuicao_por_fonte: porFonte,
      inseridas,
      motivo_zero: motivoZero,
      tecto: MAX_INSERCOES,
      tecto_corrida: tectos.maxPorCorrida,
      tecto_dia: tectos.maxPorDia,
      tecto_dia_email: tectos.maxPorDiaEmail,
      vagas_dia: vagasDia,
      max_por_fonte: tectos.maxPorFonte,
      max_por_categoria: tectos.maxPorCategoria,

    },
  });

  return new Response(JSON.stringify({
    ok: true,
    inseridas,
    motivo_zero: motivoZero,
    fontes_activas: fontesValidas.length,
    candidatos: candidatos.length,
    ignorados_url_duplicado: ignoradosPorUrl,
    ignorados_titulo_repetido: ignoradosTituloRepetido,
    ignorados_repeticao: ignoradasPorRepeticao.length,
    ignorados_ruido: ignoradasPorRuido.length,
    distribuicao_por_fonte: porFonte,
  }), { headers: { "Content-Type": "application/json" } });
}

export const Route = createFileRoute("/api/public/hooks/curadoria-rss")({
  server: {
    handlers: {
      POST: async ({ request }) => handler(request),
    },
  },
});
