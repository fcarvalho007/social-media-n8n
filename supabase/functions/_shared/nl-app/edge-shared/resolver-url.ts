// Resolução de links de rastreio (beehiiv, Substack, Mailchimp, …) para o URL
// final do editor. Best-effort: se a rede falhar, devolve o URL original.

const DOMINIOS_RASTREIO = [
  "link.mail.beehiiv.com", "beehiiv.com", "list-manage.com", "sendgrid.net",
  "hubspotlinks.com", "hs-sending.net", "convertkit-mail.com", "convertkit-mail2.com",
  "mailerlite.com", "pstmrk.it", "substack.com", "bit.ly", "t.co", "lnkd.in",
  "tinyurl.com", "rebrand.ly", "sparkpostmail.com", "mailchi.mp", "cmail19.com",
];

const CAMINHOS_RASTREIO = /^\/(ss\/c|ls\/click|redirect|track|c\/|e\/|CL0\/)/i;

export function ehLinkRastreio(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    if (DOMINIOS_RASTREIO.some((d) => host === d || host.endsWith(`.${d}`))) return true;
    return CAMINHOS_RASTREIO.test(u.pathname);
  } catch {
    return false;
  }
}

/** Segue redireccionamentos e devolve o URL final, sem parâmetros de tracking. */
export async function resolverUrlFinal(url: string, timeoutMs = 6000): Promise<string> {
  if (!ehLinkRastreio(url)) return url;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let resp = await fetch(url, { method: "HEAD", redirect: "follow", signal: controller.signal });
    if (!resp.ok || ehLinkRastreio(resp.url)) {
      resp = await fetch(url, { method: "GET", redirect: "follow", signal: controller.signal });
    }
    const final = resp.url;
    if (!final || ehLinkRastreio(final)) return url;
    return limparParametros(final);
  } catch {
    return url;
  } finally {
    clearTimeout(t);
  }
}

function limparParametros(url: string): string {
  try {
    const u = new URL(url);
    for (const k of Array.from(u.searchParams.keys())) {
      if (/^(utm_|ref|source|mc_|_bhlid|fbclid|gclid)/i.test(k)) u.searchParams.delete(k);
    }
    u.hash = "";
    return u.toString().replace(/\?$/, "");
  } catch {
    return url;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Resolução de FONTE: garante que a notícia fica com um link para o artigo
// real. Se o link de rastreio expirar e cair na homepage do editor, procura
// automaticamente uma fonte alternativa; se não encontrar, devolve
// `por_confirmar` para o cartão ficar marcado no cockpit.
// ─────────────────────────────────────────────────────────────────────────────

export type FonteEstado = "ok" | "resolvida" | "por_confirmar";

export type ResultadoFonte = {
  url: string;
  estado: FonteEstado;
  urlOriginal: string | null;
};

/** Falso quando o URL é homepage/secção genérica em vez de um artigo. */
export function apontaParaArtigo(url: string): boolean {
  try {
    const u = new URL(url);
    const segs = u.pathname.split("/").filter(Boolean);
    if (segs.length === 0) return false;
    if (segs.length === 1 && /^(news|noticias|blog|artigos|articles|home|index(\.\w+)?)$/i.test(segs[0])) return false;
    if (/\/(404|not-?found|error|erro)(\/|$)/i.test(u.pathname)) return false;
    return true;
  } catch {
    return false;
  }
}

const DOMINIOS_LIXO = /(facebook|twitter|x\.com|instagram|linkedin|pinterest|reddit|youtube|tiktok|google\.|bing\.|duckduckgo)/i;

function limparUrlDDG(href: string): string | null {
  try {
    const u = href.startsWith("//") ? `https:${href}` : href;
    const parsed = new URL(u, "https://duckduckgo.com");
    if (parsed.pathname.startsWith("/l/")) {
      const alvo = parsed.searchParams.get("uddg");
      return alvo ? decodeURIComponent(alvo) : null;
    }
    if (!/^https?:$/.test(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/** Pesquisa simples (DuckDuckGo HTML) e devolve candidatos com título. */
async function pesquisarCandidatos(query: string, timeoutMs = 7000): Promise<Array<{ url: string; titulo: string }>> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
      },
      signal: ctrl.signal,
    });
    if (!res.ok) return [];
    const html = await res.text();
    const rx = /<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
    const out: Array<{ url: string; titulo: string }> = [];
    let m: RegExpExecArray | null;
    while ((m = rx.exec(html)) !== null && out.length < 6) {
      const url = limparUrlDDG(m[1]);
      if (!url) continue;
      let host = "";
      try { host = new URL(url).hostname; } catch { continue; }
      if (DOMINIOS_LIXO.test(host)) continue;
      if (!apontaParaArtigo(url)) continue;
      const titulo = m[2].replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
      out.push({ url, titulo });
    }
    return out;
  } catch {
    return [];
  } finally {
    clearTimeout(t);
  }
}


/** Confirma que o candidato existe (200/206) e continua a ser um artigo. */
async function candidatoVivo(url: string, timeoutMs = 5000): Promise<string | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        "Range": "bytes=0-2048",
      },
      redirect: "follow",
      signal: ctrl.signal,
    });
    if (!res.ok && res.status !== 206) return null;
    const final = res.url || url;
    return apontaParaArtigo(final) ? final : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** Domínios de rastreio cujo editor real é conhecido (pesquisa `site:`). */
const EDITORES: Array<{ teste: RegExp; dominio: string; nome: string }> = [
  { teste: /insiderintelligence\.com$/i, dominio: "emarketer.com", nome: "eMarketer" },
  { teste: /^(click\.)?insight\./i, dominio: "emarketer.com", nome: "eMarketer" },
  { teste: /emarketer\.com$/i, dominio: "emarketer.com", nome: "eMarketer" },
];

function editorDe(url: string): { dominio: string; nome: string } | null {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    for (const e of EDITORES) if (e.teste.test(host)) return { dominio: e.dominio, nome: e.nome };
    return null;
  } catch { return null; }
}

const STOP = new Set(["a","o","os","as","um","uma","de","do","da","dos","das","e","em","no","na","para","por","com","que","the","of","in","on","for","to","and","is","are","with","its","it","as","at","by"]);

function tokens(s: string): Set<string> {
  return new Set(
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ").split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w)),
  );
}

/** Semelhança grosseira 0-1 entre dois títulos (funciona entre línguas via entidades). */
function semelhanca(a: string, b: string): number {
  const ta = tokens(a), tb = tokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const v of ta) if (tb.has(v)) inter++;
  return inter / Math.min(ta.size, tb.size);
}

/**
 * Devolve o melhor URL possível para a notícia.
 * - `ok`: o link já aponta para o artigo.
 * - `resolvida`: o link de rastreio foi seguido ou substituído por outra fonte.
 * - `por_confirmar`: não foi possível chegar ao artigo — precisa de revisão manual.
 */
export async function resolverFonteArtigo(
  entrada: { titulo: string; descricao?: string | null; url: string },
): Promise<ResultadoFonte> {
  const original = (entrada.url ?? "").trim();
  if (!original) return { url: original, estado: "por_confirmar", urlOriginal: null };

  let actual = original;
  if (ehLinkRastreio(actual)) {
    actual = await resolverUrlFinal(actual);
  }

  if (apontaParaArtigo(actual) && !ehLinkRastreio(actual)) {
    return { url: actual, estado: actual === original ? "ok" : "resolvida", urlOriginal: actual === original ? null : original };
  }

  // Chegou a uma homepage/página genérica: procurar o artigo noutra fonte.
  const titulo = (entrada.titulo ?? "").replace(/\s+/g, " ").trim();
  if (titulo.length >= 8) {
    const editor = editorDe(original) ?? editorDe(actual);
    const frase = titulo.split(/\s+/).slice(0, 8).join(" ");
    const contexto = (entrada.descricao ?? "").split(/\s+/).slice(0, 6).join(" ");
    const queries = [
      ...(editor ? [`site:${editor.dominio} "${frase}"`, `site:${editor.dominio} ${titulo}`, `"${frase}" ${editor.nome}`] : []),
      `"${frase}"`,
      `${titulo} ${contexto}`.trim(),
    ];

    for (const q of queries) {
      const candidatos = await pesquisarCandidatos(q);
      for (const c of candidatos) {
        let host = "";
        try { host = new URL(c.url).hostname.toLowerCase().replace(/^www\./, ""); } catch { continue; }
        const doEditor = !!editor && (host === editor.dominio || host.endsWith(`.${editor.dominio}`));
        if (!doEditor && semelhanca(c.titulo, titulo) < 0.34) continue;
        const vivo = await candidatoVivo(c.url);
        if (vivo) return { url: vivo, estado: "resolvida", urlOriginal: original };
      }
    }
  }

  return { url: actual || original, estado: "por_confirmar", urlOriginal: original };
}

