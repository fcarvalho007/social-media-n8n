// Identidade de um Brief. Módulo puro e client-safe.
//
// A mesma fonte a reentrar — noutra edição, com outro utm, com www ou sem
// barra final — tem de devolver a mesma impressão digital, para nunca criar
// um segundo Brief nem um segundo endereço.

import { normalizarUrl } from "../../../nl-app/edge-shared/ia-limpeza.ts";

/** Forma canónica do URL da fonte (reutiliza a normalização já usada na curadoria). */
export function urlFonteCanonico(url: string | null | undefined): string | null {
  const v = (url ?? "").trim();
  if (!v) return null;
  try {
    return normalizarUrl(v);
  } catch {
    return v.toLowerCase().replace(/\/+$/, "") || null;
  }
}

/** Título reduzido ao essencial, para quando não há URL utilizável. */
export function tituloCanonico(titulo: string): string {
  return (titulo ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");
}

/**
 * Impressão digital determinística. Prefere sempre o URL: é o sinal mais
 * fiável. Sem URL, cai no título canónico.
 */
export function calcularFingerprint(args: { url?: string | null; titulo: string }): string {
  const u = urlFonteCanonico(args.url);
  if (u) return `url:${u}`;
  return `titulo:${tituloCanonico(args.titulo)}`;
}
