// Server-side image model resolver. The composer never knows which model runs; switching models is a
// configuration change (AI_IMAGE_FAST_MODEL / AI_IMAGE_QUALITY_MODEL / AI_IMAGE_FALLBACK_MODEL).
export type QualidadeImagem = "fast" | "quality";

/** Cheapest eligible Kie text-to-image model (default for redesign and quick generations). */
export const MODELO_IMAGEM_PADRAO = "seedream/5-flash-text-to-image";

type Ler = (k: string) => string | undefined;
const lerEnv: Ler = (k) => { try { return Deno.env.get(k) ?? undefined; } catch { return undefined; } };
const limpo = (v: string | undefined) => (v && /^[a-z0-9][a-z0-9._/-]{2,80}$/i.test(v.trim()) ? v.trim() : undefined);

export function resolverModeloImagem(q: QualidadeImagem = "fast", ler: Ler = lerEnv): { modelo: string; fallback?: string } {
  const fast = limpo(ler("AI_IMAGE_FAST_MODEL")) ?? MODELO_IMAGEM_PADRAO;
  const modelo = q === "quality" ? limpo(ler("AI_IMAGE_QUALITY_MODEL")) ?? fast : fast;
  const fb = limpo(ler("AI_IMAGE_FALLBACK_MODEL"));
  return { modelo, ...(fb && fb !== modelo ? { fallback: fb } : {}) };
}

/** All image models that count towards the per-project daily limit. */
export function modelosImagem(ler: Ler = lerEnv): string[] {
  const a = resolverModeloImagem("fast", ler), b = resolverModeloImagem("quality", ler);
  return [...new Set([MODELO_IMAGEM_PADRAO, a.modelo, b.modelo, a.fallback, b.fallback].filter((x): x is string => !!x))];
}
