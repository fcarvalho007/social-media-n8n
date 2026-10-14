// Scraper HTML para sites sem RSS. Extrai ligações prováveis de artigos
// a partir de uma página de listagem (home, blog, /news, etc.), usando
// heurísticas simples: <article>, <h2/h3> com link interno, JSON-LD
// ItemList/Article. Filtra ruído (tags, categorias, autores, paginação).

export type ArtigoHtml = {
  titulo: string;
  url: string;
  descricao: string;
  publicado: number; // ms epoch; Date.now() se desconhecido
};

const UA = "DigitalSprintBot/1.0 (+html-scraper)";

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

// URLs a rejeitar (listagens, taxonomias, âncoras, feeds, RSS, etc.)
const RE_EXCLUIR = /\/(tag|tags|category|categories|categoria|categorias|author|autor|autores|page|pagina|feed|rss|about|sobre|contact|contacto|privacy|privacidade|terms|termos|login|signup|search|pesquisa|subscribe|newsletter)(\/|$)/i;

function pareceArtigo(u: URL, base: URL): boolean {
  if (u.hostname !== base.hostname) return false;
  const p = u.pathname.replace(/\/+$/, "");
  if (!p || p === "/") return false;
  if (RE_EXCLUIR.test(p)) return false;
  if (/\.(xml|rss|atom|jpg|jpeg|png|gif|webp|svg|pdf|zip)$/i.test(p)) return false;
  // Slug com hífen OU pelo menos 2 segmentos
  const segs = p.split("/").filter(Boolean);
  const ultimo = segs[segs.length - 1] ?? "";
  if (ultimo.includes("-") && ultimo.length >= 8) return true;
  if (segs.length >= 2 && ultimo.length >= 6) return true;
  return false;
}

function normalizarUrl(href: string, baseUrl: string): string | null {
  try {
    const u = new URL(href, baseUrl);
    u.hash = "";
    // Remover parâmetros de tracking comuns
    const rm: string[] = [];
    u.searchParams.forEach((_, k) => { if (/^utm_|^fbclid|^gclid|^mc_/i.test(k)) rm.push(k); });
    for (const k of rm) u.searchParams.delete(k);
    return u.toString();
  } catch { return null; }
}

function tsDataPublicacao(bloco: string): number {
  // <time datetime="..."> ou meta article:published_time
  const t = bloco.match(/<time[^>]*datetime=["']([^"']+)["']/i);
  if (t) { const ms = Date.parse(t[1]); if (Number.isFinite(ms)) return ms; }
  const m = bloco.match(/property=["']article:published_time["'][^>]*content=["']([^"']+)["']/i);
  if (m) { const ms = Date.parse(m[1]); if (Number.isFinite(ms)) return ms; }
  return Date.now();
}

function extrairDeArticles(html: string, baseUrl: string): ArtigoHtml[] {
  const base = new URL(baseUrl);
  const out: ArtigoHtml[] = [];
  const re = /<article\b[\s\S]*?<\/article>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const bloco = m[0];
    // Primeiro link "interno" plausível
    const links = Array.from(bloco.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi));
    let escolhida: { url: string; texto: string } | null = null;
    for (const l of links) {
      const abs = normalizarUrl(l[1], baseUrl);
      if (!abs) continue;
      let u: URL; try { u = new URL(abs); } catch { continue; }
      if (!pareceArtigo(u, base)) continue;
      const texto = stripTags(l[2]);
      if (!escolhida || texto.length > escolhida.texto.length) escolhida = { url: abs, texto };
    }
    if (!escolhida) continue;
    // Título: preferir <h1/h2/h3> dentro do bloco, senão texto da <a>
    let titulo = "";
    const h = bloco.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i);
    if (h) titulo = stripTags(h[1]);
    if (!titulo || titulo.length < 8) titulo = escolhida.texto;
    if (!titulo || titulo.length < 8) continue;
    // Descrição: primeiro parágrafo do bloco
    const p = bloco.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    const descricao = p ? stripTags(p[1]).slice(0, 400) : "";
    out.push({
      titulo: titulo.slice(0, 240),
      url: escolhida.url,
      descricao,
      publicado: tsDataPublicacao(bloco),
    });
  }
  return out;
}

function extrairDeHeadings(html: string, baseUrl: string): ArtigoHtml[] {
  const base = new URL(baseUrl);
  const out: ArtigoHtml[] = [];
  const re = /<h[1-3][^>]*>\s*<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>\s*<\/h[1-3]>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const abs = normalizarUrl(m[1], baseUrl);
    if (!abs) continue;
    let u: URL; try { u = new URL(abs); } catch { continue; }
    if (!pareceArtigo(u, base)) continue;
    const titulo = stripTags(m[2]);
    if (!titulo || titulo.length < 8) continue;
    out.push({ titulo: titulo.slice(0, 240), url: abs, descricao: "", publicado: Date.now() });
  }
  return out;
}

function extrairDeJsonLd(html: string, baseUrl: string): ArtigoHtml[] {
  const base = new URL(baseUrl);
  const out: ArtigoHtml[] = [];
  const blocos = Array.from(html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi));
  for (const b of blocos) {
    let json: unknown;
    try { json = JSON.parse(b[1].trim()); } catch { continue; }
    const nodes = Array.isArray(json) ? json : [json];
    for (const node of nodes) {
      if (!node || typeof node !== "object") continue;
      const n = node as Record<string, unknown>;
      const tipo = String(n["@type"] ?? "").toLowerCase();
      if (tipo === "itemlist" && Array.isArray(n.itemListElement)) {
        for (const it of n.itemListElement as unknown[]) {
          if (!it || typeof it !== "object") continue;
          const el = it as Record<string, unknown>;
          const item = (el.item as Record<string, unknown>) ?? el;
          const url = typeof item.url === "string" ? item.url : "";
          const nome = typeof item.name === "string" ? item.name : (typeof item.headline === "string" ? item.headline : "");
          const abs = url ? normalizarUrl(url, baseUrl) : null;
          if (!abs || !nome) continue;
          try { if (!pareceArtigo(new URL(abs), base)) continue; } catch { continue; }
          out.push({ titulo: nome.slice(0, 240), url: abs, descricao: "", publicado: Date.now() });
        }
      } else if (tipo.includes("article") || tipo.includes("blogposting") || tipo.includes("newsarticle")) {
        const url = typeof n.url === "string" ? n.url : (typeof n.mainEntityOfPage === "string" ? n.mainEntityOfPage : "");
        const titulo = typeof n.headline === "string" ? n.headline : (typeof n.name === "string" ? n.name : "");
        const abs = url ? normalizarUrl(url, baseUrl) : null;
        if (!abs || !titulo) continue;
        try { if (!pareceArtigo(new URL(abs), base)) continue; } catch { continue; }
        const publ = typeof n.datePublished === "string" ? Date.parse(n.datePublished) : NaN;
        out.push({
          titulo: titulo.slice(0, 240),
          url: abs,
          descricao: typeof n.description === "string" ? n.description.slice(0, 400) : "",
          publicado: Number.isFinite(publ) ? publ : Date.now(),
        });
      }
    }
  }
  return out;
}

function dedupePorUrl(items: ArtigoHtml[]): ArtigoHtml[] {
  const vistos = new Set<string>();
  const out: ArtigoHtml[] = [];
  for (const it of items) {
    if (vistos.has(it.url)) continue;
    vistos.add(it.url);
    out.push(it);
  }
  return out;
}

/**
 * Extrai artigos de uma página de listagem HTML.
 * Combina 3 heurísticas: <article>, <h1-3><a>, JSON-LD.
 * Devolve até `maxItens` artigos deduplicados, ordenados por data (recentes primeiro).
 */
export async function extrairArtigosHtml(
  listUrl: string,
  opts: { maxItens?: number; timeoutMs?: number } = {},
): Promise<{ ok: boolean; artigos: ArtigoHtml[]; erro?: string }> {
  const { maxItens = 40, timeoutMs = 12_000 } = opts;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(listUrl, {
      signal: ctl.signal,
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
      },
    });
    if (!res.ok) return { ok: false, artigos: [], erro: `HTTP ${res.status}` };
    const html = await res.text();
    const combinado = dedupePorUrl([
      ...extrairDeArticles(html, listUrl),
      ...extrairDeJsonLd(html, listUrl),
      ...extrairDeHeadings(html, listUrl),
    ]);
    combinado.sort((a, b) => b.publicado - a.publicado);
    return { ok: true, artigos: combinado.slice(0, maxItens) };
  } catch (e) {
    const msg = (e as Error).message || "erro";
    return { ok: false, artigos: [], erro: msg.includes("aborted") ? "Timeout" : msg };
  } finally {
    clearTimeout(timer);
  }
}
