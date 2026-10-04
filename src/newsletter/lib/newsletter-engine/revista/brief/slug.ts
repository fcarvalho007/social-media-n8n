// Endereço público do Brief. Módulo puro e client-safe.
//
// Regras: deriva do título editorial, é estável depois de publicado e nunca
// ganha sufixos artificiais só porque a mesma fonte voltou a entrar (isso é
// tratado pela deduplicação, em `fingerprint.ts`).

const VAZIAS = new Set([
  "a", "as", "o", "os", "um", "uma", "uns", "umas",
  "de", "do", "da", "dos", "das", "em", "no", "na", "nos", "nas",
  "por", "para", "com", "sem", "que", "e", "ou", "ao", "aos", "à", "às",
  "the", "of", "to", "for", "and", "in", "on",
]);

const MAX_PALAVRAS = 9;

/** Deriva o endereço a partir do título editorial. */
export function derivarSlug(titulo: string): string {
  const base = (titulo ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/[\s-]+/)
    .filter(Boolean);

  const uteis = base.filter((p) => !VAZIAS.has(p));
  const escolhidas = (uteis.length >= 3 ? uteis : base).slice(0, MAX_PALAVRAS);
  return escolhidas.join("-") || "brief";
}

/**
 * Garante unicidade contra os endereços já existentes. O sufixo numérico só
 * existe para títulos genuinamente diferentes com o mesmo texto — nunca para
 * a mesma fonte a reentrar.
 */
export function slugUnico(titulo: string, existentes: Iterable<string>): string {
  const usados = new Set(existentes);
  const base = derivarSlug(titulo);
  if (!usados.has(base)) return base;
  for (let i = 2; i < 200; i += 1) {
    const tentativa = `${base}-${i}`;
    if (!usados.has(tentativa)) return tentativa;
  }
  return `${base}-${Date.now()}`;
}

/** Caminho interno do Brief. Nunca inclui domínio. */
export function caminhoBrief(slug: string): string {
  return `/brief/${slug}`;
}
