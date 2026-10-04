// Single source of the app's public address for EVERY runtime link (newsletter and social alike).
// Reads the same validated configuration as the newsletter (NL_PUBLIC_BASE_URL); no hardcoded host.
// When missing, callers must block or report the problem instead of inventing a host.
export function baseApp(): string | null {
  const b = (Deno.env.get("NL_PUBLIC_BASE_URL") ?? "").trim().replace(/\/+$/, "");
  return /^https:\/\/[^\s/]+/.test(b) ? b : null;
}

export function linkApp(caminho: string): string | null {
  const b = baseApp();
  return b ? `${b}${caminho.startsWith("/") ? caminho : `/${caminho}`}` : null;
}

export const ERRO_BASE_APP = "Endereço público da app por configurar (NL_PUBLIC_BASE_URL).";
