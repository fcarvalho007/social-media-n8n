// Port Deno de `src/features/newsletter/checklist.ts` (resolverDestinos).
// Mantém as duas cópias sincronizadas: a lógica é usada no editor (browser) e
// no gerador de HTML do email para determinar qual notícia entra no email.

export const MAX_TOTAL_EMAIL = 12;
export const MAX_POR_CATEGORIA = 2;

export type OverrideDestino = "auto" | "email" | "site";
export type RazaoDestino =
  | "pin_email"
  | "pin_site"
  | "destaque"
  | "auto_top"
  | "auto_extra_categoria"
  | "auto_corte_global"
  | "categoria_oculta";

export interface EntradaResolve {
  id: string;
  ordem: number;
  categoria: string;
  destaque: boolean;
  override: OverrideDestino;
}
export interface ResultadoDestino {
  destino: "email" | "site";
  razao: RazaoDestino;
}
export interface OpcoesResolver {
  categoriasOcultas: Set<string>;
  maxTotal?: number;
  maxPorCategoria?: number;
}

export function resolverDestinos(
  itens: EntradaResolve[],
  opts: OpcoesResolver,
): Map<string, ResultadoDestino> {
  const maxTotal = opts.maxTotal ?? MAX_TOTAL_EMAIL;
  const maxCat = opts.maxPorCategoria ?? MAX_POR_CATEGORIA;
  const out = new Map<string, ResultadoDestino>();
  const ordenado = [...itens].sort((a, b) => a.ordem - b.ordem);

  const contCat = new Map<string, number>();
  let contTotal = 0;

  for (const it of ordenado) {
    if (opts.categoriasOcultas.has(it.categoria)) {
      out.set(it.id, { destino: "site", razao: "categoria_oculta" });
      continue;
    }
    if (it.override === "site") {
      out.set(it.id, { destino: "site", razao: "pin_site" });
      continue;
    }
    if (it.override === "email") {
      out.set(it.id, { destino: "email", razao: "pin_email" });
      contCat.set(it.categoria, (contCat.get(it.categoria) ?? 0) + 1);
      contTotal += 1;
    }
  }

  for (const it of ordenado) {
    if (out.has(it.id)) continue;
    if (!it.destaque) continue;
    out.set(it.id, { destino: "email", razao: "destaque" });
    contCat.set(it.categoria, (contCat.get(it.categoria) ?? 0) + 1);
    contTotal += 1;
  }

  for (const it of ordenado) {
    if (out.has(it.id)) continue;
    const cCat = contCat.get(it.categoria) ?? 0;
    if (cCat >= maxCat) {
      out.set(it.id, { destino: "site", razao: "auto_extra_categoria" });
      continue;
    }
    if (contTotal >= maxTotal) {
      out.set(it.id, { destino: "site", razao: "auto_corte_global" });
      continue;
    }
    out.set(it.id, { destino: "email", razao: "auto_top" });
    contCat.set(it.categoria, cCat + 1);
    contTotal += 1;
  }

  return out;
}
