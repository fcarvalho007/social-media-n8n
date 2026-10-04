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

/** E-goi extra field id that stores each contact's signed token (NL_EGOI_CAMPO_TOKEN_ID); null when invalid. */
export function campoTokenEgoi(): number | null {
  const n = Number((process.env.NL_EGOI_CAMPO_TOKEN_ID ?? "").trim());
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * E-goi merge code of the token field, derived from the field id. Official format (E-goi helpdesk,
 * "Using merge codes"): `!extra_field_X`, X = extra field number. NL_EGOI_TAG_TOKEN is only an optional
 * cross-check: if set and different from the derived code, the tag is treated as missing (send blocked).
 */
export function tagTokenEgoi(): string {
  const campo = campoTokenEgoi();
  if (!campo) return "";
  const derivada = `!extra_field_${campo}`;
  const explicita = (process.env.NL_EGOI_TAG_TOKEN ?? "").trim();
  return !explicita || explicita === derivada ? derivada : "";
}

/**
 * Rendered content never carries a field id: it carries this neutral marker, replaced per destination
 * list (aplicarTokenLista) right before the campaign goes to E-goi. Each list has its own field id.
 */
export const MARCADOR_TOKEN = "{{NL_TOKEN_EGOI}}";
export const TOKEN_POR_CONFIGURAR = "{TOKEN_POR_CONFIGURAR}";

export type ListaComCampo = { nome?: string; campo_token_id?: number | null };
export type CampoResolvido = { campo: number; origem: "lista" | "legado" };

/** Strict id check: positive integer only (no strings, decimals or zero). */
export function idCampoValido(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v > 0 && v < 1_000_000;
}

/**
 * Field id for ONE list: its own configured id wins; otherwise the legacy global NL_EGOI_CAMPO_TOKEN_ID
 * (only when valid and consistent with NL_EGOI_TAG_TOKEN). Null = not configured -> that list is blocked.
 * Whether the legacy id really exists as a text field in that list is checked live by the send gate.
 */
export function resolverCampoLista(l: ListaComCampo): CampoResolvido | null {
  if (l.campo_token_id !== null && l.campo_token_id !== undefined) {
    return idCampoValido(l.campo_token_id) ? { campo: l.campo_token_id, origem: "lista" } : null;
  }
  const legado = campoTokenEgoi();
  return legado && tagTokenEgoi() ? { campo: legado, origem: "legado" } : null;
}

/** Replaces the neutral marker with the list's merge code; without a field only an explicit placeholder. */
export function aplicarTokenLista(texto: string, campo: number | null): string {
  return texto.split(MARCADOR_TOKEN).join(campo ? `!extra_field_${campo}` : TOKEN_POR_CONFIGURAR);
}

/** Footer link to the subscription page, authenticated only by the signed token merge tag (per list). */
export function linkSubscricao(accao?: "cancelar"): string {
  return `${baseParaLinks()}/subscricao?t=${MARCADOR_TOKEN}${accao ? `&a=${accao}` : ""}`;
}

/** RFC 8058 one-click endpoint (List-Unsubscribe), token only (marker replaced per list). */
export function linkUmClique(): string {
  return `${baseFuncoes()}/nl-publico/unsubscribe?t=${MARCADOR_TOKEN}`;
}

export function avatarUrl(): string {
  return `${baseParaLinks()}/nl/frederico-avatar.png`;
}

/** Blocks sending when public links would be broken or unauthenticated. */
export function verificarLigacoesPublicas(): string[] {
  const p: string[] = [];
  if (!/^https:\/\//.test(basePublica())) p.push("Falta configurar o endereço público da newsletter (NL_PUBLIC_BASE_URL).");
  // The token field is resolved and checked per list by the send gate (nl-egoi-tokens-gate).
  if (!process.env.SUBSCRICAO_SEGREDO) p.push("Falta o segredo de assinatura das subscrições (SUBSCRICAO_SEGREDO).");
  return p;
}
