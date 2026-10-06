// Single place that chooses the vision provider for reading support images (charts/tables).
// Primary = cheapest confirmed; fallback only when the primary refuses BEFORE charging.
export type FornecedorVisao = "fal" | "kie";
export interface ModeloVisao { fornecedor: FornecedorVisao; modelo: string; registo: string }

export const VISAO_FAL: ModeloVisao = { fornecedor: "fal", modelo: "google/gemini-2.5-flash-lite", registo: "fal:gemini-2.5-flash-lite:interpretar" };
export const VISAO_KIE: ModeloVisao = { fornecedor: "kie", modelo: "gemini-3-flash", registo: "gemini-3-flash:interpretar" };

/** Every log label any vision provider writes; the daily limit sums them all. */
export const registosVisao = () => [VISAO_FAL.registo, VISAO_KIE.registo];

export function resolverModeloVisao(env: (k: string) => string | undefined = (k) => Deno.env.get(k)): { principal: ModeloVisao; fallback: ModeloVisao | null } {
  const p = (env("AI_VISION_PROVIDER") ?? "fal").toLowerCase() === "kie" ? VISAO_KIE : VISAO_FAL;
  const principal = { ...p, modelo: (p.fornecedor === "fal" ? env("AI_VISION_FAL_MODEL") : undefined) || p.modelo };
  return { principal, fallback: principal.fornecedor === "fal" ? VISAO_KIE : VISAO_FAL };
}

/** Definite refusal before any charge (auth, credits, unknown model): safe to try the fallback once. */
export const recusaAntesDeCobrar = (codigo: number) => codigo === 401 || codigo === 403 || codigo === 404 || codigo === 422;
