// Recolha da fonte de um Brief. Server-only.
//
// Obtém o material necessário para gerar e verificar: endereço final,
// título, publicação, data e texto do artigo. O texto do artigo é
// transitório — vive apenas durante a geração e nunca é gravado.

import { extrairCorpoArtigo } from "@/lib/ler-artigo.server";

const AGENTE = "DigitalSprintBot/1.0 (+brief)";
const TEMPO_LIMITE_MS = 12000;

export interface MaterialFonte {
  ok: boolean;
  url: string | null;
  urlFinal: string | null;
  titulo: string | null;
  publisher: string | null;
  data: string | null;
  /** Texto do artigo. Transitório: nunca é persistido. */
  corpo: string;
  /** HTML bruto. Transitório: serve só para procurar a fonte primária. */
  html?: string;
  motivo?: string;
}

export function urlValido(url: string | null | undefined): boolean {
  const v = (url ?? "").trim();
  if (!/^https?:\/\//i.test(v)) return false;
  try {
    const u = new URL(v);
    return Boolean(u.hostname) && u.hostname.includes(".");
  } catch {
    return false;
  }
}

/** Nome legível da publicação a partir do domínio. */
export function publisherDeUrl(url: string | null | undefined): string | null {
  if (!urlValido(url)) return null;
  const host = new URL((url ?? "").trim()).hostname.replace(/^www\./, "");
  const base = host.split(".")[0] ?? host;
  return base.charAt(0).toUpperCase() + base.slice(1);
}

function meta(html: string, nomes: string[]): string | null {
  for (const nome of nomes) {
    const re = new RegExp(
      `<meta[^>]+(?:property|name|itemprop)=["']${nome}["'][^>]*content=["']([^"']+)["']`,
      "i",
    );
    const alternativa = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name|itemprop)=["']${nome}["']`,
      "i",
    );
    const m = html.match(re) ?? html.match(alternativa);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

function tituloDeHtml(html: string): string | null {
  const og = meta(html, ["og:title", "twitter:title"]);
  if (og) return og;
  const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return t?.[1] ? t[1].replace(/\s+/g, " ").trim() : null;
}

function dataDeHtml(html: string): string | null {
  const bruto = meta(html, [
    "article:published_time",
    "og:article:published_time",
    "datePublished",
    "date",
  ]);
  if (!bruto) return null;
  const d = new Date(bruto);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Endereços internos que o artigo aponta — base para procurar a fonte primária. */
export function ligacoesExternas(html: string, origem: string): string[] {
  const out = new Set<string>();
  let dominioOrigem = "";
  try {
    dominioOrigem = new URL(origem).hostname.replace(/^www\./, "");
  } catch {
    /* sem origem utilizável */
  }
  for (const m of html.matchAll(/<a\b[^>]+href=["'](https?:\/\/[^"']+)["']/gi)) {
    const href = m[1] ?? "";
    try {
      const h = new URL(href).hostname.replace(/^www\./, "");
      if (h && h !== dominioOrigem && !/(twitter|x|facebook|linkedin|instagram|youtube)\./i.test(h)) {
        out.add(href.split("#")[0] ?? href);
      }
    } catch {
      /* ignora endereços inválidos */
    }
    if (out.size >= 40) break;
  }
  return [...out];
}

async function obterHtml(url: string): Promise<{ html: string; urlFinal: string } | { erro: string }> {
  const controlador = new AbortController();
  const relogio = setTimeout(() => controlador.abort(), TEMPO_LIMITE_MS);
  try {
    const resp = await fetch(url, {
      redirect: "follow",
      signal: controlador.signal,
      headers: {
        "User-Agent": AGENTE,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "pt-PT,pt;q=0.9,en;q=0.8",
      },
    });
    if (!resp.ok) return { erro: `A fonte respondeu ${resp.status}` };
    const tipo = resp.headers.get("content-type") ?? "";
    if (tipo && !/text\/html|application\/xhtml/i.test(tipo)) return { erro: "A fonte não é uma página" };
    return { html: await resp.text(), urlFinal: resp.url || url };
  } catch (e) {
    const err = e as Error;
    return { erro: err.name === "AbortError" ? "A fonte demorou demasiado" : err.message };
  } finally {
    clearTimeout(relogio);
  }
}

/**
 * Recolhe o material da fonte. Nunca lança: quando a página não é
 * recuperável de forma fiável devolve `ok: false` com o motivo, para o
 * motor marcar «fonte indisponível» em vez de inventar.
 */
export async function recolherFonte(url: string | null | undefined): Promise<MaterialFonte> {
  const alvo = (url ?? "").trim();
  const vazio: MaterialFonte = {
    ok: false,
    url: alvo || null,
    urlFinal: null,
    titulo: null,
    publisher: null,
    data: null,
    corpo: "",
  };

  if (!urlValido(alvo)) return { ...vazio, motivo: "Endereço da fonte inválido ou em falta." };

  const r = await obterHtml(alvo);
  if ("erro" in r) return { ...vazio, motivo: r.erro };

  const corpo = extrairCorpoArtigo(r.html);
  const publisher = meta(r.html, ["og:site_name"]) ?? publisherDeUrl(r.urlFinal);

  return {
    ok: corpo.length >= 200,
    url: alvo,
    urlFinal: r.urlFinal,
    titulo: tituloDeHtml(r.html),
    publisher,
    data: dataDeHtml(r.html),
    corpo,
    html: r.html,
    motivo: corpo.length >= 200 ? undefined : "A página não tem texto utilizável.",
  };
}

/** Confirma que um endereço candidato existe mesmo e devolve o que se sabe dele. */
export async function validarCandidato(url: string): Promise<MaterialFonte | null> {
  if (!urlValido(url)) return null;
  const m = await recolherFonte(url);
  return m.urlFinal ? m : null;
}
