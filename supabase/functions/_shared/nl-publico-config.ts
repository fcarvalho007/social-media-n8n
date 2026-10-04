// Public addresses of the DESTINATION app. No fallbacks to the origin application:
// when NL_PUBLIC_BASE_URL is missing, sending is blocked and links render as an explicit placeholder.
import process from "node:process";

export const PLACEHOLDER_BASE = "https://endereco-publico-por-configurar.invalid";

/** Base of the public site (edições, briefs, subscrição), without trailing slash. Empty when not configured. */
export function basePublica(): string {
  return (process.env.NL_PUBLIC_BASE_URL ?? "").trim().replace(/\/+$/, "");
}

/** Same as basePublica() but throws when it is not configured (use on send/publish paths). */
export function basePublicaObrigatoria(): string {
  const b = basePublica();
  if (!/^https:\/\//.test(b)) throw new Error("Endereço público da newsletter por configurar (NL_PUBLIC_BASE_URL).");
  return b;
}

/** Base for links inside rendered content: real base, or an explicit .invalid placeholder for previews. */
export function baseParaLinks(): string {
  return basePublica() || PLACEHOLDER_BASE;
}

/** Edge functions base (public endpoints of this project). */
export function baseFuncoes(): string {
  return `${(process.env.SUPABASE_URL ?? "").replace(/\/+$/, "")}/functions/v1`;
}

/**
 * E-goi merge tag that holds each contact's signed subscription token (e.g. "{!extra_3}").
 * Subscription links never carry the e-mail alone; without this tag configured, sending is blocked.
 */
export function tagTokenEgoi(): string {
  return (process.env.NL_EGOI_TAG_TOKEN ?? "").trim();
}

/** Footer link to the subscription page, authenticated only by the signed token merge tag. */
export function linkSubscricao(accao?: "cancelar"): string {
  const t = tagTokenEgoi() || "{TOKEN_POR_CONFIGURAR}";
  return `${baseParaLinks()}/subscricao?t=${t}${accao ? `&a=${accao}` : ""}`;
}

/** RFC 8058 one-click endpoint (List-Unsubscribe), token only. */
export function linkUmClique(): string {
  const t = tagTokenEgoi() || "{TOKEN_POR_CONFIGURAR}";
  return `${baseFuncoes()}/nl-publico/unsubscribe?t=${t}`;
}

export function avatarUrl(): string {
  return `${baseParaLinks()}/nl/frederico-avatar.png`;
}

/** Blocks sending when public links would be broken or unauthenticated. */
export function verificarLigacoesPublicas(): string[] {
  const p: string[] = [];
  if (!/^https:\/\//.test(basePublica())) p.push("Falta configurar o endereço público da newsletter (NL_PUBLIC_BASE_URL).");
  if (!/^\{![a-z0-9_]+\}$/i.test(tagTokenEgoi())) p.push("Falta configurar o campo da E-goi com o token de subscrição (NL_EGOI_TAG_TOKEN).");
  if (!process.env.SUBSCRICAO_SEGREDO) p.push("Falta o segredo de assinatura das subscrições (SUBSCRICAO_SEGREDO).");
  return p;
}
