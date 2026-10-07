// Server-side image model resolver. The composer never knows which model runs; switching models is a
// configuration change (AI_IMAGE_FAST_MODEL / AI_IMAGE_QUALITY_MODEL / AI_IMAGE_FALLBACK_MODEL).
export type QualidadeImagem = "fast" | "quality";

/** Cheapest eligible Kie text-to-image model (default for redesign and quick generations). */
export const MODELO_IMAGEM_PADRAO = "seedream/5-flash-text-to-image";

type Ler = (k: string) => string | undefined;
const lerEnv: Ler = (k) => { try { return (globalThis as unknown as { Deno?: { env: { get(k: string): string | undefined } } }).Deno?.env.get(k) ?? undefined; } catch { return undefined; } };
const limpo = (v: string | undefined) => (v && /^[a-z0-9][a-z0-9._/-]{2,80}$/i.test(v.trim()) ? v.trim() : undefined);

export function resolverModeloImagem(q: QualidadeImagem = "fast", ler: Ler = lerEnv): { modelo: string; fallback?: string } {
  const fast = limpo(ler("AI_IMAGE_FAST_MODEL")) ?? MODELO_IMAGEM_PADRAO;
  const modelo = q === "quality" ? limpo(ler("AI_IMAGE_QUALITY_MODEL")) ?? fast : fast;
  const fb = limpo(ler("AI_IMAGE_FALLBACK_MODEL"));
  return { modelo, ...(fb && fb !== modelo ? { fallback: fb } : {}) };
}

/** fal.ai text-to-image (primary when FAL_KEY exists): native 4:5, cheapest eligible model. Registo prefix "fal:". */
export const MODELO_IMAGEM_FAL = "fal-ai/flux/schnell";
export const FAL_IMAGEM_EUR = 0.004;
export const KIE_IMAGEM_USD = 0.0162;

export interface OpcaoModeloImagem {
  id: "fal-fast" | "kie-seedream-fast" | "kie-quality";
  nome: string;
  fornecedor: "fal.ai" | "Kie.ai";
  modelo: string;
  proporcoes: string[];
  tamanhos: string[];
  custo: number;
  moeda: "EUR" | "USD";
  custo_origem: "estimado";
}
export function resolverFornecedorImagem(ler: Ler = lerEnv): { principal: "fal" | "kie"; fallback?: "kie"; falModelo: string } {
  const falModelo = limpo(ler("AI_IMAGE_FAL_MODEL")) ?? MODELO_IMAGEM_FAL;
  const temFal = !!ler("FAL_KEY"), temKie = !!ler("KIE_API_KEY");
  if (ler("AI_IMAGE_PROVIDER") === "kie" || !temFal) return { principal: "kie", falModelo };
  return { principal: "fal", ...(temKie ? { fallback: "kie" as const } : {}), falModelo };
}

/** All image models that count towards the per-project daily limit. */
export function modelosImagem(ler: Ler = lerEnv): string[] {
  const a = resolverModeloImagem("fast", ler), b = resolverModeloImagem("quality", ler);
  return [...new Set([MODELO_IMAGEM_PADRAO, `fal:${resolverFornecedorImagem(ler).falModelo}`, `fal:${MODELO_IMAGEM_FAL}`, a.modelo, b.modelo, a.fallback, b.fallback].filter((x): x is string => !!x))];
}

/** Only returns options backed by a configured provider and a known displayed price. */
export function catalogoModelosImagem(ler: Ler = lerEnv): OpcaoModeloImagem[] {
  const out: OpcaoModeloImagem[] = [];
  if (ler("FAL_KEY")) {
    const modelo = resolverFornecedorImagem(ler).falModelo;
    out.push({ id: "fal-fast", nome: modelo === MODELO_IMAGEM_FAL ? "FLUX Schnell" : modelo, fornecedor: "fal.ai", modelo, proporcoes: ["1:1", "4:5", "9:16", "16:9"], tamanhos: ["1080"], custo: FAL_IMAGEM_EUR, moeda: "EUR", custo_origem: "estimado" });
  }
  if (ler("KIE_API_KEY")) {
    const fast = resolverModeloImagem("fast", ler).modelo;
    out.push({ id: "kie-seedream-fast", nome: fast === MODELO_IMAGEM_PADRAO ? "Seedream 5 Flash" : fast, fornecedor: "Kie.ai", modelo: fast, proporcoes: ["1:1", "3:4", "4:3", "9:16", "16:9"], tamanhos: ["1K", "1.5K", "2K"], custo: KIE_IMAGEM_USD, moeda: "USD", custo_origem: "estimado" });
    const quality = resolverModeloImagem("quality", ler).modelo;
    if (quality !== fast) out.push({ id: "kie-quality", nome: quality, fornecedor: "Kie.ai", modelo: quality, proporcoes: ["1:1", "3:4", "4:3", "9:16", "16:9"], tamanhos: ["1K", "1.5K", "2K"], custo: KIE_IMAGEM_USD, moeda: "USD", custo_origem: "estimado" });
  }
  return out;
}

export function obterOpcaoModeloImagem(id: string, ler: Ler = lerEnv): OpcaoModeloImagem | undefined {
  return catalogoModelosImagem(ler).find((o) => o.id === id);
}
