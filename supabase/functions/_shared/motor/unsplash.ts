// Unsplash for the carousel engine. Pure helpers (tested); network lives in unsplash.server.ts.
export interface FotoUnsplashMotor { id: string; miniatura: string; url: string; largura: number; altura: number; alt: string; autor: string; pagina: string; descarga: string }

interface Bruta { id?: string; alt_description?: string; description?: string; width?: number; height?: number; urls?: { raw?: string; small?: string }; links?: { html?: string; download_location?: string }; user?: { name?: string } }

const IMG = /^https:\/\/images\.unsplash\.com\/[A-Za-z0-9._~\-/]+/;
const API = /^https:\/\/api\.unsplash\.com\/photos\/[A-Za-z0-9_-]+\/download/;
export const urlUnsplashValido = (u: unknown): u is string => typeof u === "string" && u.length < 800 && IMG.test(u);
export const descargaUnsplashValida = (u: unknown): u is string => typeof u === "string" && u.length < 800 && API.test(u);

export function mapearFotosUnsplash(json: unknown): FotoUnsplashMotor[] {
  const fotos = (json as { results?: Bruta[] } | null)?.results ?? [];
  return fotos.flatMap((f) => {
    const url = f.urls?.raw?.split("?")[0] ?? "";
    const miniatura = f.urls?.small ?? "";
    const descarga = f.links?.download_location ?? "";
    if (!f.id || !urlUnsplashValido(url) || !urlUnsplashValido(miniatura) || !descargaUnsplashValida(descarga)) return [];
    return [{ id: f.id, miniatura, url, descarga, largura: f.width ?? 0, altura: f.height ?? 0, alt: (f.alt_description ?? f.description ?? "").trim().slice(0, 300), autor: (f.user?.name ?? "").trim().slice(0, 120) || "Unsplash", pagina: (f.links?.html ?? "").slice(0, 400) }];
  });
}

/** Sized for a 1080x1350 page (longest useful side 1600 px). */
export const urlDescargaUnsplash = (url: string) => `${url.split("?")[0]}?fm=jpg&q=85&w=1600&fit=max`;
export const creditoUnsplash = (autor: string) => `Foto: ${autor || "Unsplash"} / Unsplash`;

/** Interleaves two result lists (a1, b1, a2, b2, ...). */
export function intercalar<A, B>(a: A[], b: B[]): (A | B)[] {
  const out: (A | B)[] = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) { if (i < a.length) out.push(a[i]); if (i < b.length) out.push(b[i]); }
  return out;
}
