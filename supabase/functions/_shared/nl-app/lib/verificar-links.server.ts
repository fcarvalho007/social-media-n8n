// Utilitários de verificação de links (só servidor).
// Vivem fora do ficheiro de server functions para o transform não os perder.

export type EstadoLink = "ok" | "redireccionado" | "suspeito" | "quebrado";

export interface ContextoLink {
  tipo: "noticia" | "ferramenta" | "cronica" | "promocao" | "recomendacao" | "podcast" | "brief";
  id: string;
  titulo: string;
  /** Onde o link é usado. Ausente no formato Clássico (tudo segue no email). */
  canal?: "email" | "web";
}


export interface ItemLink {
  url: string;
  estado: EstadoLink;
  status: number;
  redirect_para?: string;
  contexto: ContextoLink;
}

export interface ResumoLinks {
  ok: number;
  redireccionado: number;
  suspeito: number;
  quebrado: number;
  total: number;
}

export interface ResultadoVerificarLinks {
  items: ItemLink[];
  resumo: ResumoLinks;
  verificado_em: string;
  cache: boolean;
}

const TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 5;
const CONCORRENCIA = 5;
export const CACHE_MS = 30 * 60 * 1000;

// Cabeçalhos que imitam um Chrome recente. Muitos servidores (Google Support,
// Cloudflare, sites de media) devolvem 403/404 a User-Agents óbvios de bot.
const HEADERS_BROWSER: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "pt-PT,pt;q=0.9,en-US;q=0.7,en;q=0.6",
  "Accept-Encoding": "gzip, deflate, br",
  "Upgrade-Insecure-Requests": "1",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
};

function normalizarUrl(raw: string): string | null {
  if (!raw || typeof raw !== "string") return null;
  const t = raw.trim();
  if (!t) return null;
  try {
    const u = new URL(t);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** Classificação final de um status "conhecido" (após HEAD+GET). */
function classificarFinal(status: number): EstadoLink {
  if (status >= 200 && status < 300) return "ok";
  // Anti-bot ou rate-limit: suspeito, não morto.
  if (status === 401 || status === 403 || status === 429 || status === 451) return "suspeito";
  // 5xx e timeouts: suspeito (pode ser transitório).
  if (status >= 500 && status <= 599) return "suspeito";
  // Timeouts / 408.
  if (status === 408) return "suspeito";
  // 404/410 e 4xx restantes: quebrado.
  return "quebrado";
}

async function tentarPedido(
  url: string,
  method: "HEAD" | "GET",
): Promise<Response> {
  return await fetch(url, {
    method,
    redirect: "manual",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: HEADERS_BROWSER,
  });
}

/**
 * Verifica um URL isolado. Estratégia robusta:
 * 1) HEAD com headers de browser.
 * 2) Se HEAD falhar (erro de rede, 4xx/5xx, 405/501), tenta GET.
 * 3) Segue até MAX_REDIRECTS.
 * 4) Só o segundo pedido (GET) decide.
 */
export async function verificarUm(
  inicial: string,
): Promise<Omit<ItemLink, "contexto">> {
  const norm = normalizarUrl(inicial);
  if (!norm) return { url: inicial, estado: "quebrado", status: 0 };

  let actual = norm;
  const visitados = new Set<string>([actual]);
  let redireccionado = false;

  for (let salto = 0; salto <= MAX_REDIRECTS; salto++) {
    let statusHead = 0;
    let resp: Response | null = null;

    // 1ª tentativa: HEAD (rápido).
    try {
      resp = await tentarPedido(actual, "HEAD");
      statusHead = resp.status;
      try { resp.body?.cancel(); } catch { /* ignore */ }
    } catch {
      resp = null;
    }

    const headInconclusivo =
      !resp ||
      statusHead === 0 ||
      statusHead === 400 ||
      statusHead === 403 ||
      statusHead === 404 ||
      statusHead === 405 ||
      statusHead === 410 ||
      statusHead === 429 ||
      statusHead === 501 ||
      (statusHead >= 500 && statusHead <= 599);

    // Se o HEAD não deu resposta confiável, repete com GET.
    let statusFinal = statusHead;
    let respFinal: Response | null = resp;
    if (headInconclusivo) {
      try {
        respFinal = await tentarPedido(actual, "GET");
        statusFinal = respFinal.status;
        try { respFinal.body?.cancel(); } catch { /* ignore */ }
      } catch {
        // Retry único com pequeno backoff antes de dar como quebrado.
        try {
          await new Promise((r) => setTimeout(r, 400));
          respFinal = await tentarPedido(actual, "GET");
          statusFinal = respFinal.status;
          try { respFinal.body?.cancel(); } catch { /* ignore */ }
        } catch {
          return { url: inicial, estado: "quebrado", status: 0 };
        }
      }
    }

    // Redirects.
    if (statusFinal >= 300 && statusFinal < 400 && respFinal) {
      const loc = respFinal.headers.get("location");
      if (!loc) return { url: inicial, estado: "quebrado", status: statusFinal };
      if (salto === MAX_REDIRECTS) {
        return { url: inicial, estado: "quebrado", status: statusFinal, redirect_para: actual };
      }
      let seguinte: string;
      try { seguinte = new URL(loc, actual).toString(); }
      catch { return { url: inicial, estado: "quebrado", status: statusFinal }; }
      if (visitados.has(seguinte)) {
        return { url: inicial, estado: "quebrado", status: statusFinal, redirect_para: seguinte };
      }
      visitados.add(seguinte);
      actual = seguinte;
      redireccionado = true;
      continue;
    }

    const classe = classificarFinal(statusFinal);
    const item: Omit<ItemLink, "contexto"> = {
      url: inicial,
      estado: classe === "ok" && redireccionado ? "redireccionado" : classe,
      status: statusFinal,
    };
    if (redireccionado) item.redirect_para = actual;
    return item;
  }
  return { url: inicial, estado: "quebrado", status: 0 };
}

export async function correrEmFila<T>(entradas: T[], worker: (t: T) => Promise<void>): Promise<void> {
  let cursor = 0;
  const trabalhadores = Array.from({ length: Math.min(CONCORRENCIA, entradas.length) }, async () => {
    while (true) {
      const idx = cursor++;
      if (idx >= entradas.length) return;
      await worker(entradas[idx]);
    }
  });
  await Promise.all(trabalhadores);
}


export function computarResumo(items: ItemLink[]): ResumoLinks {
  const r: ResumoLinks = { ok: 0, redireccionado: 0, suspeito: 0, quebrado: 0, total: items.length };
  for (const it of items) r[it.estado]++;
  return r;
}

/* ─── Recolha dos URLs actuais da edição ─── */

export interface EntradaLink { url: string; contexto: ContextoLink }

/**
 * URLs em jogo numa edição. No Clássico: notícias aprovadas + as duas
 * ferramentas da semana. No Revista acrescentam-se crónica, recomendação e
 * podcast, e cada entrada indica se segue no email ou só na edição web.
 * A chave de comparação é `tipo:id`, para detectar troca de URL numa notícia.
 */
export async function recolherEntradas(
  supabase: import("npm:@supabase/supabase-js@2.57.4").SupabaseClient,
  edicao_id: string,
): Promise<EntradaLink[]> {
  const { data: edicao } = await supabase
    .from("nl_edicoes")
    .select("template_version, episodio_podcast_id")
    .eq("id", edicao_id)
    .maybeSingle();
  const formatoRevista = (edicao as { template_version?: string } | null)?.template_version === "revista";

  const [{ data: noticias, error: eN }, { data: ferramentas, error: eF }] = await Promise.all([
    supabase.from("nl_noticias").select("id, titulo, url").eq("edicao_id", edicao_id).eq("estado", "aprovada"),
    supabase.from("nl_ferramentas_semana").select("id, nome, url, posicao").eq("edicao_id", edicao_id)
      .order("posicao", { ascending: true }).limit(2),
  ]);
  if (eN) throw eN;
  if (eF) throw eF;

  const out: EntradaLink[] = [];

  // No Revista, só as notícias escolhidas para Destaques/Radar seguem no email.
  const noEmail = new Set<string>();
  if (formatoRevista) {
    const { data: itens } = await supabase
      .from("nl_revista_itens").select("noticia_id").eq("edicao_id", edicao_id);
    for (const it of (itens ?? []) as Array<{ noticia_id: string }>) noEmail.add(it.noticia_id);
  }

  for (const n of (noticias ?? []) as Array<{ id: string; titulo: string | null; url: string | null }>) {
    out.push({
      url: n.url ?? "",
      contexto: {
        tipo: "noticia", id: n.id, titulo: n.titulo ?? "Notícia sem título",
        ...(formatoRevista ? { canal: noEmail.has(n.id) ? ("email" as const) : ("web" as const) } : {}),
      },
    });
  }

  if (formatoRevista) {
    const { data: cfg } = await supabase
      .from("nl_revista_edicao")
      .select("cronica_url, cronica_titulo, promocao_activa, promocao_url, promocao_link_texto, recomendacao_url, recomendacao_titulo, bloco_ferramentas")
      .eq("edicao_id", edicao_id)
      .maybeSingle();
    const c = cfg as {
      cronica_url?: string; cronica_titulo?: string;
      promocao_activa?: boolean; promocao_url?: string; promocao_link_texto?: string;
      recomendacao_url?: string; recomendacao_titulo?: string; bloco_ferramentas?: boolean;
    } | null;

    if (c?.cronica_url?.trim()) {
      out.push({
        url: c.cronica_url,
        contexto: { tipo: "cronica", id: edicao_id, titulo: c.cronica_titulo?.trim() || "Crónica completa", canal: "email" },
      });
    }
    if (c?.promocao_activa !== false && c?.promocao_url?.trim()) {
      out.push({
        url: c.promocao_url,
        contexto: { tipo: "promocao", id: edicao_id, titulo: c.promocao_link_texto?.trim() || "Promoção de abertura", canal: "email" },
      });
    }
    if (c?.recomendacao_url?.trim()) {
      out.push({
        url: c.recomendacao_url,
        contexto: { tipo: "recomendacao", id: edicao_id, titulo: c.recomendacao_titulo?.trim() || "Esta semana recomendo", canal: "email" },
      });
    }

    const epId = (edicao as { episodio_podcast_id?: string | null } | null)?.episodio_podcast_id;
    if (epId) {
      const { data: ep } = await supabase
        .from("nl_episodios_podcast").select("id, titulo, url").eq("id", epId).maybeSingle();
      const e = ep as { id: string; titulo: string | null; url: string | null } | null;
      if (e?.url?.trim()) {
        out.push({
          url: e.url,
          contexto: { tipo: "podcast", id: e.id, titulo: e.titulo ?? "Episódio do podcast", canal: "email" },
        });
      }
    }

    // Páginas de Brief já publicadas: um Brief interno quebrado é um problema
    // nosso, por isso entra sempre na verificação.
    const { ligacoesBriefsDaEdicao } = await import("../../newsletter-engine/revista/brief/publicacao.server.ts");
    const ligacoes = await ligacoesBriefsDaEdicao(edicao_id, supabase).catch(() => ({}));
    for (const l of Object.values(ligacoes)) {
      out.push({
        url: l.url,
        contexto: { tipo: "brief", id: l.briefId, titulo: l.tituloApresentado, canal: "email" },
      });
    }

    if (c?.bloco_ferramentas !== false) {
      for (const f of (ferramentas ?? []) as Array<{ id: string; nome: string | null; url: string | null }>) {
        out.push({
          url: f.url ?? "",
          contexto: { tipo: "ferramenta", id: f.id, titulo: f.nome ?? "Ferramenta da semana", canal: "email" },
        });
      }
    }
    return out;
  }

  for (const f of (ferramentas ?? []) as Array<{ id: string; nome: string | null; url: string | null }>) {
    out.push({ url: f.url ?? "", contexto: { tipo: "ferramenta", id: f.id, titulo: f.nome ?? "Ferramenta da semana" } });
  }
  return out;
}


export function chaveEntrada(c: ContextoLink): string {
  return `${c.tipo}:${c.id}`;
}

/** URL comparável: normalizado quando possível, senão o texto em bruto. */
export function urlComparavel(url: string): string {
  return normalizarUrlPublico(url) ?? (url ?? "").trim();
}

export function normalizarUrlPublico(raw: string): string | null {
  return normalizarUrl(raw);
}

/**
 * A cache continua válida quando cobre exactamente as mesmas entradas
 * (`tipo:id`) com exactamente os mesmos URLs. Qualquer edição de URL,
 * notícia nova ou notícia removida invalida-a.
 */
export function cacheCobreEntradas(cache: ItemLink[], entradas: EntradaLink[]): boolean {
  const doCache = new Map<string, string>();
  for (const it of cache) {
    if (!it?.contexto) return false;
    doCache.set(chaveEntrada(it.contexto), urlComparavel(it.url));
  }
  const actuais = new Map<string, string>();
  for (const e of entradas) actuais.set(chaveEntrada(e.contexto), urlComparavel(e.url));
  if (doCache.size !== actuais.size) return false;
  for (const [k, v] of actuais) {
    if (doCache.get(k) !== v) return false;
  }
  return true;
}

/* ─── Links confirmados manualmente ─── */

export async function lerLinksIgnorados(
  supabase: import("npm:@supabase/supabase-js@2.57.4").SupabaseClient,
  edicao_id: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("nl_edicoes")
    .select("links_ignorados, numero")
    .eq("id", edicao_id)
    .maybeSingle();
  if (error) throw error;
  const raw = (data as { links_ignorados: unknown } | null)?.links_ignorados;
  return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : [];
}
