// Unsplash network calls (server only). One request per user click, never retried.
import { descargaUnsplashValida, mapearFotosUnsplash, urlDescargaUnsplash, urlUnsplashValido, type FotoUnsplashMotor } from "./unsplash.ts";
import { LIMITES_IMAGEM } from "./fontes.ts";

export type ResUnsplash = { ok: true; fotos: FotoUnsplashMotor[]; mais: boolean } | { ok: false; erro: string; estado: number };
const chave = () => Deno.env.get("UNSPLASH_ACCESS_KEY") ?? "";

export async function pesquisarUnsplash(termo: string, pagina: number): Promise<ResUnsplash> {
  if (!chave()) return { ok: false, erro: "A ligação à Unsplash não está configurada.", estado: 503 };
  const q = termo.trim().slice(0, 100);
  if (q.length < 2) return { ok: true, fotos: [], mais: false };
  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", q);
  url.searchParams.set("per_page", "15");
  url.searchParams.set("page", String(Math.min(50, Math.max(1, Math.floor(pagina) || 1))));
  url.searchParams.set("orientation", "portrait");
  url.searchParams.set("content_filter", "high");
  let res: Response;
  try { res = await fetch(url, { headers: { Authorization: `Client-ID ${chave()}`, "Accept-Version": "v1" } }); } catch { return { ok: false, erro: "A Unsplash não respondeu.", estado: 502 }; }
  if (res.status === 401 || res.status === 403) return { ok: false, erro: res.status === 403 ? "Limite de pesquisas da Unsplash atingido." : "A chave da Unsplash foi recusada.", estado: 503 };
  if (!res.ok) return { ok: false, erro: "A pesquisa na Unsplash falhou.", estado: 502 };
  const j = await res.json().catch(() => null) as { total_pages?: number } | null;
  return { ok: true, fotos: mapearFotosUnsplash(j), mais: (j?.total_pages ?? 0) > pagina };
}

/** Registers the download (Unsplash API guideline) and fetches the image bytes. */
export async function descarregarUnsplash(url: string, descarga: string): Promise<Uint8Array> {
  if (!urlUnsplashValido(url) || !descargaUnsplashValida(descarga)) throw new Error("Endereço de imagem inválido.");
  await fetch(descarga, { headers: { Authorization: `Client-ID ${chave()}`, "Accept-Version": "v1" } }).catch(() => null);
  const res = await fetch(urlDescargaUnsplash(url), { redirect: "error" }).catch(() => null);
  if (!res || !res.ok) throw new Error("Não foi possível descarregar a foto da Unsplash.");
  const b = new Uint8Array(await res.arrayBuffer());
  if (b.length > LIMITES_IMAGEM.maxBytes) throw new Error("A foto é demasiado grande.");
  return b;
}
