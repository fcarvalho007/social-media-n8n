// Pexels for the carousel engine. Pure helpers (tested); network lives in pexels.server.ts.
export interface FotoPexelsMotor { id: number; miniatura: string; url: string; largura: number; altura: number; alt: string; autor: string; pagina: string }

interface Bruta { id?: number; alt?: string; photographer?: string; url?: string; width?: number; height?: number; src?: { original?: string; medium?: string; portrait?: string } }

const HOST = /^https:\/\/images\.pexels\.com\/photos\/\d+\//;
export const urlPexelsValido = (u: unknown): u is string => typeof u === "string" && u.length < 600 && HOST.test(u);

/** Keeps only the fields the UI needs; drops anything without a valid Pexels image URL. */
export function mapearFotos(json: unknown): FotoPexelsMotor[] {
  const fotos = (json as { photos?: Bruta[] } | null)?.photos ?? [];
  return fotos.flatMap((f) => {
    const url = f.src?.original?.split("?")[0] ?? "";
    const miniatura = f.src?.portrait ?? f.src?.medium ?? "";
    if (!f.id || !urlPexelsValido(url) || !urlPexelsValido(miniatura)) return [];
    return [{ id: f.id, miniatura, url, largura: f.width ?? 0, altura: f.height ?? 0, alt: (f.alt ?? "").trim().slice(0, 300), autor: (f.photographer ?? "").trim().slice(0, 120) || "Pexels", pagina: (f.url ?? "").slice(0, 400) }];
  });
}

/** Download URL sized for a 1080x1350 page (longest useful side 1600 px), without forced crop. */
export const urlDescarga = (url: string) => `${url.split("?")[0]}?auto=compress&cs=tinysrgb&w=1600`;
export const creditoPexels = (autor: string) => `Foto: ${autor || "Pexels"} / Pexels`;
export const idDoUrl = (url: string) => Number(/\/photos\/(\d+)\//.exec(url)?.[1] ?? 0);
