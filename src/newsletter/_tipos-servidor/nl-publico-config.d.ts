export declare const PLACEHOLDER_BASE = "https://endereco-publico-por-configurar.invalid";
/** Base of the public site (edições, briefs, subscrição), without trailing slash. Empty when not configured. */
export declare function basePublica(): string;
/** Same as basePublica() but throws when it is not configured (use on send/publish paths). */
export declare function basePublicaObrigatoria(): string;
/** Base for links inside rendered content: real base, or an explicit .invalid placeholder for previews. */
export declare function baseParaLinks(): string;
/** Edge functions base (public endpoints of this project). */
export declare function baseFuncoes(): string;
/** E-goi extra field id that stores each contact's signed token (NL_EGOI_CAMPO_TOKEN_ID); null when invalid. */
export declare function campoTokenEgoi(): number | null;
/**
 * E-goi merge code of the token field, derived from the field id. Official format (E-goi helpdesk,
 * "Using merge codes"): `!extra_field_X`, X = extra field number. NL_EGOI_TAG_TOKEN is only an optional
 * cross-check: if set and different from the derived code, the tag is treated as missing (send blocked).
 */
export declare function tagTokenEgoi(): string;
/** Footer link to the subscription page, authenticated only by the signed token merge tag. */
export declare function linkSubscricao(accao?: "cancelar"): string;
/** RFC 8058 one-click endpoint (List-Unsubscribe), token only. */
export declare function linkUmClique(): string;
export declare function avatarUrl(): string;
/** Blocks sending when public links would be broken or unauthenticated. */
export declare function verificarLigacoesPublicas(): string[];
