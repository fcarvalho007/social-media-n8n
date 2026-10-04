/**
 * Content engine — source adapters (link / PDF) and authorised image assets.
 * Pure and dependency-free: imported by the browser, tests and the Deno server.
 */

// ---------------- link ----------------

/**
 * Link reading is limited to fixed public origins already used by this project (newsletter curation sources).
 * The edge runtime offers no way to pin the connection to a validated IP (DNS rebinding), so arbitrary hosts are
 * never fetched: other links are kept as a reference and the text is pasted by the user.
 */
export const HOSTS_LINK = [
  "tek.sapo.pt",
  "techcrunch.com",
  "www.theverge.com",
  "thenextweb.com",
  "martech.org",
  "searchengineland.com",
  "www.searchenginejournal.com",
  "www.socialmediatoday.com",
] as const;

export const LIMITES_LINK = { timeoutMs: 10_000, maxBytes: 2 * 1024 * 1024, maxRedirects: 5, maxUrl: 2000 } as const;

export type MotivoUrl = "formato" | "protocolo" | "credenciais" | "porta" | "ip" | "fora_da_lista";

export interface UrlValidada { ok: true; url: URL }
export interface UrlRecusada { ok: false; motivo: MotivoUrl; mensagem: string }

const MSG_URL: Record<MotivoUrl, string> = {
  formato: "O endereço não é válido.",
  protocolo: "Só são aceites endereços https://.",
  credenciais: "O endereço não pode incluir utilizador ou palavra-passe.",
  porta: "O endereço não pode indicar uma porta.",
  ip: "Endereços IP não são aceites; usa o endereço do site.",
  fora_da_lista: "Este site não está entre as origens que o Hub pode ler automaticamente.",
};

/** Hostnames that are IP literals in any notation (dotted, decimal, hex, octal, IPv6). */
export function pareceIp(host: string): boolean {
  const h = host.replace(/^\[|\]$/g, "");
  if (h.includes(":")) return true;
  if (/^(0x[0-9a-f]+|\d+)(\.(0x[0-9a-f]+|\d+)){0,3}$/i.test(h)) return true;
  return false;
}

export function validarUrlLink(bruto: string, hosts: readonly string[] = HOSTS_LINK): UrlValidada | UrlRecusada {
  const nao = (motivo: MotivoUrl): UrlRecusada => ({ ok: false, motivo, mensagem: MSG_URL[motivo] });
  const s = (bruto ?? "").trim();
  if (!s || s.length > LIMITES_LINK.maxUrl) return nao("formato");
  let u: URL;
  try { u = new URL(s); } catch { return nao("formato"); }
  if (u.protocol !== "https:") return nao("protocolo");
  if (u.username || u.password) return nao("credenciais");
  if (u.port && u.port !== "443") return nao("porta");
  const host = u.hostname.toLowerCase().replace(/\.$/, "");
  if (pareceIp(host)) return nao("ip");
  if (!hosts.includes(host)) return nao("fora_da_lista");
  u.hash = "";
  return { ok: true, url: u };
}

function ipv4(n: number[]): boolean {
  const [a, b, c] = n;
  return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 192 && b === 0 && (c === 0 || c === 2)) || (a === 198 && b === 51 && c === 100) || (a === 203 && b === 0 && c === 113) || (a === 198 && (b === 18 || b === 19)) || a >= 224;
}

/** Private, loopback, link-local, CGNAT, metadata, multicast/reserved and IPv4-mapped IPv6 addresses. */
export function ipBloqueado(ip: string): boolean {
  const s = ip.trim().toLowerCase().replace(/^\[|\]$/g, "");
  const v4 = s.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const n = v4.slice(1).map(Number);
    if (n.some((x) => x > 255)) return true;
    return ipv4(n);
  }
  if (!s.includes(":")) return true; // unknown notation: refuse
  const mapeado = s.match(/::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (mapeado) return ipBloqueado(mapeado[1]);
  if (s === "::" || s === "::1") return true;
  if (/^f[cd]/.test(s)) return true; // unique local
  if (/^fe[89ab]/.test(s)) return true; // link-local
  if (/^ff/.test(s)) return true; // multicast
  if (/^64:ff9b:/.test(s)) return true; // NAT64 can reach IPv4 internals
  if (/^2001:db8:/.test(s)) return true;
  return false;
}

export function tituloHtml(html: string): string | null {
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']{1,300})["']/i)?.[1];
  const t = og ?? html.match(/<title[^>]*>([\s\S]{1,400}?)<\/title>/i)?.[1];
  if (!t) return null;
  const limpo = t.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
  return limpo ? limpo.slice(0, 300) : null;
}

export interface LinkLido {
  ok: true; titulo: string | null; texto: string; url_final: string; bytes: number; truncado: boolean; redirecionamentos: number;
}
export interface LinkFalhado { ok: false; motivo: string; mensagem: string }

// ---------------- persisted source metadata ----------------

export type EstadoPagina = "texto" | "sem_texto_com_imagem" | "vazia" | "erro" | "excluida";

export interface PaginaPdf { n: number; estado: EstadoPagina; caracteres: number; paragrafos: [number, number] | null }

export interface MetaLink {
  tipo: "link"; modo: "extraido" | "referencia"; url: string; url_final: string | null; titulo_pagina: string | null;
  bytes: number | null; truncado: boolean; editado: boolean; lido_em: string | null;
}
export interface MetaPdf {
  tipo: "pdf"; ficheiro: string; hash: string; bytes: number; total_paginas: number; paginas: PaginaPdf[];
  completo: boolean; paginas_em_falta: number[]; parcial_confirmado: boolean; editado: boolean;
}
export type MetaFonte = MetaLink | MetaPdf;

export const LIMITES_PDF = { maxBytes: 15 * 1024 * 1024, maxPaginas: 60 } as const;

function falha(m: string): never { throw new Error(m); }
const txt = (v: unknown, max: number, onde: string): string => (typeof v === "string" && v.length <= max ? v : falha(`${onde} inválido.`));
const optTxt = (v: unknown, max: number, onde: string): string | null => (v == null ? null : txt(v, max, onde));
const int = (v: unknown, min: number, max: number, onde: string): number =>
  (typeof v === "number" && Number.isInteger(v) && v >= min && v <= max ? v : falha(`${onde} inválido.`));
const bool = (v: unknown, onde: string): boolean => (typeof v === "boolean" ? v : falha(`${onde} inválido.`));

/** Server-side validation of what the browser declares about a link/PDF source (bounded, no free-form keys). */
export function validarMetaFonte(v: unknown, tipo: "link" | "pdf", paragrafosTotal: number): MetaFonte {
  if (!v || typeof v !== "object" || Array.isArray(v)) falha("Metadados da fonte inválidos.");
  const o = v as Record<string, unknown>;
  if (o.tipo !== tipo) falha("Metadados da fonte não correspondem ao tipo.");
  if (tipo === "link") {
    const modo = o.modo === "extraido" ? "extraido" : o.modo === "referencia" ? "referencia" : falha("Modo do link inválido.");
    const url = txt(o.url, 2000, "Endereço");
    if (!/^https?:\/\//i.test(url)) falha("Endereço inválido.");
    return {
      tipo: "link", modo, url, url_final: optTxt(o.url_final, 2000, "Endereço final"), titulo_pagina: optTxt(o.titulo_pagina, 300, "Título da página"),
      bytes: o.bytes == null ? null : int(o.bytes, 0, LIMITES_LINK.maxBytes, "Tamanho"), truncado: bool(o.truncado, "Truncado"),
      editado: bool(o.editado, "Editado"), lido_em: optTxt(o.lido_em, 40, "Data de leitura"),
    };
  }
  const total = int(o.total_paginas, 1, LIMITES_PDF.maxPaginas, "Número de páginas");
  if (!Array.isArray(o.paginas) || o.paginas.length !== total) falha("Páginas do PDF inválidas.");
  const estados: EstadoPagina[] = ["texto", "sem_texto_com_imagem", "vazia", "erro", "excluida"];
  let esperado = 1;
  const paginas: PaginaPdf[] = o.paginas.map((p, i) => {
    const q = (p ?? {}) as Record<string, unknown>;
    const estado = estados.includes(q.estado as EstadoPagina) ? (q.estado as EstadoPagina) : falha(`Página ${i + 1}: estado inválido.`);
    let par: [number, number] | null = null;
    if (estado === "texto") {
      const r = q.paragrafos;
      if (!Array.isArray(r) || r.length !== 2) falha(`Página ${i + 1}: parágrafos inválidos.`);
      const a = int(r[0], 1, 100000, "Parágrafo"); const b = int(r[1], a, 100000, "Parágrafo");
      if (a !== esperado) falha(`Página ${i + 1}: parágrafos fora de ordem.`);
      esperado = b + 1;
      par = [a, b];
    }
    return { n: int(q.n, 1, total, "Página"), estado, caracteres: int(q.caracteres, 0, 1_000_000, "Caracteres"), paragrafos: par };
  });
  const emFalta = paginas.filter((p) => p.estado !== "texto").map((p) => p.n);
  const completo = emFalta.length === 0;
  const editado = bool(o.editado, "Editado");
  if (!editado && esperado - 1 !== paragrafosTotal) falha("A correspondência de parágrafos não confere com o texto.");
  const parcial = bool(o.parcial_confirmado, "Confirmação de fonte parcial");
  if (!completo && !parcial) falha(`Faltam as páginas ${emFalta.join(", ")}. Confirma que queres usar uma fonte parcial.`);
  if (!paginas.some((p) => p.estado === "texto")) falha("O PDF não tem texto utilizável.");
  return {
    tipo: "pdf", ficheiro: txt(o.ficheiro, 200, "Nome do ficheiro"), hash: /^[0-9a-f]{64}$/.test(String(o.hash)) ? String(o.hash) : falha("Impressão digital inválida."),
    bytes: int(o.bytes, 1, LIMITES_PDF.maxBytes, "Tamanho"), total_paginas: total, paginas, completo, paginas_em_falta: emFalta, parcial_confirmado: parcial, editado,
  };
}

/** Attribution line shown in the proposal (URL or file name + pages). */
export function atribuicao(meta: MetaFonte | null, titulo: string | null): { titulo: string | null; url: string | null } {
  if (!meta) return { titulo, url: null };
  if (meta.tipo === "link") return { titulo: titulo ?? meta.titulo_pagina, url: meta.url_final ?? meta.url };
  const usadas = meta.paginas.filter((p) => p.estado === "texto").map((p) => p.n);
  const pags = meta.completo ? `${meta.total_paginas} pág.` : `pág. ${intervalos(usadas)} de ${meta.total_paginas}`;
  return { titulo: `${titulo ?? meta.ficheiro} (PDF, ${pags})`, url: null };
}

export function intervalos(ns: number[]): string {
  const out: string[] = [];
  for (let i = 0; i < ns.length; i++) {
    let j = i;
    while (j + 1 < ns.length && ns[j + 1] === ns[j] + 1) j++;
    out.push(i === j ? `${ns[i]}` : `${ns[i]}–${ns[j]}`);
    i = j;
  }
  return out.join(", ");
}

// ---------------- images ----------------

export const BUCKET_ASSETS = "motor-assets";
/** Buckets of this project's own storage where the media library keeps images. */
export const BUCKETS_BIBLIOTECA = ["publications", "pdfs", "ai-generated-images", "post-covers"] as const;
export const LIMITES_IMAGEM = { maxBytes: 6 * 1024 * 1024, maxLado: 8000, maxPixeis: 40_000_000 } as const;

export interface ImagemInspecionada { mime: "image/png" | "image/jpeg"; largura: number; altura: number }

/** Reads type and size from the file header only (PNG IHDR / JPEG SOF); anything else (SVG, GIF, WebP…) is refused. */
export function inspecionarImagem(b: Uint8Array): ImagemInspecionada {
  if (b.length > LIMITES_IMAGEM.maxBytes) falha("A imagem ultrapassa 6 MB.");
  let r: ImagemInspecionada | null = null;
  if (b.length > 24 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[12] === 0x49 && b[13] === 0x48 && b[14] === 0x44 && b[15] === 0x52) {
    const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
    r = { mime: "image/png", largura: dv.getUint32(16), altura: dv.getUint32(20) };
  } else if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7) || m === 0xff) { i += m === 0xff ? 1 : 2; continue; }
      const len = (b[i + 2] << 8) | b[i + 3];
      if (len < 2) break;
      if ((m >= 0xc0 && m <= 0xc3) || (m >= 0xc5 && m <= 0xc7) || (m >= 0xc9 && m <= 0xcb) || (m >= 0xcd && m <= 0xcf)) {
        r = { mime: "image/jpeg", altura: (b[i + 5] << 8) | b[i + 6], largura: (b[i + 7] << 8) | b[i + 8] };
        break;
      }
      i += 2 + len;
    }
  }
  if (!r) falha("Só são aceites imagens PNG ou JPEG.");
  if (r.largura < 1 || r.altura < 1 || r.largura > LIMITES_IMAGEM.maxLado || r.altura > LIMITES_IMAGEM.maxLado) falha("Dimensões da imagem fora do limite (máx. 8000 px por lado).");
  if (r.largura * r.altura > LIMITES_IMAGEM.maxPixeis) falha("A imagem tem píxeis a mais (máx. 40 MP).");
  return r;
}

/**
 * Accepts only a public URL of this project's own storage in the media-library buckets and returns bucket/path,
 * so the server downloads through the storage API instead of fetching an arbitrary URL.
 */
export function localBiblioteca(fileUrl: string, base: string): { bucket: string; path: string } | null {
  let u: URL, b: URL;
  try { u = new URL(fileUrl); b = new URL(base); } catch { return null; }
  if (u.origin !== b.origin || u.search || u.username) return null;
  const m = u.pathname.match(/^\/storage\/v1\/object\/public\/([a-z0-9-]+)\/(.+)$/);
  if (!m || !(BUCKETS_BIBLIOTECA as readonly string[]).includes(m[1])) return null;
  let path: string;
  try { path = decodeURIComponent(m[2]); } catch { return null; }
  if (path.includes("..") || path.startsWith("/") || path.length > 500) return null;
  return { bucket: m[1], path };
}

export const caminhoAsset = (projectId: string, hash: string, mime: ImagemInspecionada["mime"]) =>
  `${projectId}/${hash}.${mime === "image/png" ? "png" : "jpg"}`;

/** Asset ids referenced by image layers of the given documents (deduplicated, bounded). */
export function assetsReferidos(docs: Array<{ paginas: Array<{ camadas: Array<{ tipo: string; asset_id?: string }> }> } | null | undefined>): string[] {
  const s = new Set<string>();
  for (const d of docs) for (const p of d?.paginas ?? []) for (const c of p.camadas) if (c.tipo === "imagem" && c.asset_id) s.add(c.asset_id);
  if (s.size > 20) falha("O documento refere imagens a mais (máx. 20).");
  return [...s];
}
