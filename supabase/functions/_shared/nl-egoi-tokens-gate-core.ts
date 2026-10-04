// Pure per-list readiness (no runtime/npm imports, so it is unit-testable in the app test suite).
import { resolverCampoLista, type ListaComCampo } from "./nl-publico-config.ts";
import { verificarProntidao, type ArmazemProgresso, type ClienteEgoi } from "./nl-egoi-tokens.ts";

export type ListaGate = ListaComCampo & { egoi_lista_id: string; nome: string };

/** Pure core: per-list resolution + readiness with injected E-goi client and store. */
export async function problemasPorLista(deps: { egoi: ClienteEgoi; armazem: ArmazemProgresso }, listas: ListaGate[], fp: string): Promise<string[]> {
  const problemas: string[] = [];
  for (const l of listas) {
    const r = resolverCampoLista(l);
    if (!r) {
      problemas.push(l.campo_token_id != null
        ? `Lista «${l.nome}»: o campo do token configurado é inválido.`
        : `Lista «${l.nome}»: falta escolher o campo do token (Ligações → Envio da newsletter).`);
      continue;
    }
    problemas.push(...await verificarProntidao(deps, { listas: [l], campo: r.campo, fp }));
  }
  return problemas;
}

