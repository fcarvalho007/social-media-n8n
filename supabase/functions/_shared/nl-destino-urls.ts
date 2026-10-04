// Pure URL helpers that move origin-owned addresses onto the DESTINATION public host.
// No runtime imports so it can be unit-tested from Vitest and used in Deno.

/** Origin asset ids of the newsletter author avatar (known own resources, png + jpg). */
export const AVATAR_ASSET_IDS = [
  "64e62b56-bcaf-4d4a-b6d3-d80d1568af05",
  "cadec3e2-5dd7-4a75-b8dc-14c0202c4200",
] as const;

const AVATAR_RE = new RegExp(
  `(?:https?:\\/\\/[^\\s"'<>()/]+)?\\/__l5e\\/assets-v1\\/(?:${AVATAR_ASSET_IDS.join("|")})\\/frederico-avatar\\.(?:png|jpe?g)(?:\\?[^\\s"'<>()#]*)?`,
  "g",
);

/** Replaces known origin avatar URLs with `${base}/nl/frederico-avatar.png`. Returns the new string and count. */
export function reescreverAvatar(s: string, base: string): { valor: string; n: number } {
  if (!s.includes("/__l5e/assets-v1/")) return { valor: s, n: 0 };
  let n = 0;
  const alvo = `${base.replace(/\/+$/, "")}/nl/frederico-avatar.png`;
  const valor = s.replace(AVATAR_RE, () => { n++; return alvo; });
  return { valor, n };
}

/**
 * Moves a public edition/brief URL (any historical host) onto the destination base.
 * Only `/edicoes/...` and `/brief/...` paths are remapped; anything else is returned unchanged.
 */
export function paraBaseDestino(url: string, base: string): string {
  try {
    const u = new URL(url);
    if (!/^\/(edicoes|brief)\//.test(u.pathname)) return url;
    return `${base.replace(/\/+$/, "")}${u.pathname}${u.search}${u.hash}`;
  } catch {
    return url;
  }
}
