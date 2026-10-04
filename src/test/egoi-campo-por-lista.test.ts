import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MARCADOR_TOKEN, aplicarTokenLista, idCampoValido, linkSubscricao, linkUmClique, resolverCampoLista,
} from "../../supabase/functions/_shared/nl-publico-config";
import { problemasPorLista } from "../../supabase/functions/_shared/nl-egoi-tokens-gate-core";
import type { ArmazemProgresso, ClienteEgoi, Progresso } from "../../supabase/functions/_shared/nl-egoi-tokens";

// Fixture: two lists whose token fields received DIFFERENT ids from E-goi (41 and 42).
const A = { egoi_lista_id: "1", nome: "Formandos", campo_token_id: 41 };
const B = { egoi_lista_id: "2", nome: "Newsletter", campo_token_id: 42 };

function progresso(lista: string, campo: number): Progresso {
  return { egoi_lista_id: lista, campo_id: campo, estado: "concluida", campo_validado: true, campo_meta: null, segredo_fp: "fp",
    offset_proximo: 10, processados: 10, actualizados: 10, ja_correctos: 0, ignorados: 0, total_egoi: 10, verificado_leitura: true, ultimo_erro: null, concluido_em: "x" };
}

/** Store with sync rows only for the given (list, field) pairs; records every lookup. */
function deps(pares: Array<[string, number]>) {
  const lidos: string[] = [];
  const armazem = {
    ler: async (l: string, c: number) => { lidos.push(`${l}:${c}`); return pares.some(([x, y]) => x === l && y === c) ? progresso(l, c) : null; },
    contarFalhas: async () => 0,
  } as unknown as ArmazemProgresso;
  const egoi = { listar: async () => ({ total: 10, itens: [] }) } as unknown as ClienteEgoi;
  return { d: { egoi, armazem }, lidos };
}

afterEach(() => { vi.unstubAllEnvs(); });

describe("campo do token por lista", () => {
  it("cada lista verifica com o seu próprio campo (41 e 42)", async () => {
    const { d, lidos } = deps([["1", 41], ["2", 42]]);
    expect(await problemasPorLista(d, [A, B], "fp")).toEqual([]);
    expect(lidos).toEqual(["1:41", "2:42"]);
  });

  it("nunca usa o campo de uma lista na outra", async () => {
    // Sync exists only with swapped fields -> both blocked.
    const { d } = deps([["1", 42], ["2", 41]]);
    const p = await problemasPorLista(d, [A, B], "fp");
    expect(p).toHaveLength(2);
  });

  it("uma lista sem campo fica bloqueada com mensagem clara; a outra não é afetada", async () => {
    const { d } = deps([["1", 41]]);
    const p = await problemasPorLista(d, [A, { ...B, campo_token_id: null }], "fp");
    expect(p).toEqual(["Lista «Newsletter»: falta escolher o campo do token (Ligações → Envio da newsletter)."]);
  });

  it("um campo configurado inválido bloqueia sem recorrer à configuração antiga", async () => {
    vi.stubEnv("NL_EGOI_CAMPO_TOKEN_ID", "7");
    const { d } = deps([["1", 7]]);
    const p = await problemasPorLista(d, [{ ...A, campo_token_id: 0 }], "fp");
    expect(p[0]).toContain("inválido");
  });

  it("configuração antiga só serve listas sem campo próprio e ainda tem de passar a verificação", async () => {
    vi.stubEnv("NL_EGOI_CAMPO_TOKEN_ID", "7");
    expect(resolverCampoLista({ campo_token_id: null })).toEqual({ campo: 7, origem: "legado" });
    expect(resolverCampoLista({ campo_token_id: 41 })).toEqual({ campo: 41, origem: "lista" });
    const { d } = deps([]); // field 7 not synced in this list -> blocked by live readiness
    expect(await problemasPorLista(d, [{ ...A, campo_token_id: null }], "fp")).toHaveLength(1);
    vi.stubEnv("NL_EGOI_TAG_TOKEN", "!extra_field_9"); // inconsistent legacy tag -> legacy ignored
    expect(resolverCampoLista({ campo_token_id: null })).toBeNull();
  });

  it("identificador estrito", () => {
    for (const v of [41, 1]) expect(idCampoValido(v)).toBe(true);
    for (const v of [0, -1, 4.5, "41", null, undefined, NaN]) expect(idCampoValido(v)).toBe(false);
  });

  it("o email leva um marcador neutro, substituído pelo código de cada lista", () => {
    vi.stubEnv("NL_PUBLIC_BASE_URL", "https://exemplo.pt");
    const html = `<a href="${linkSubscricao("cancelar")}">Cancelar</a> ${linkUmClique()}`;
    expect(html).toContain(MARCADOR_TOKEN);
    expect(html).not.toMatch(/extra_field/);
    const a = aplicarTokenLista(html, 41), b = aplicarTokenLista(html, 42);
    expect(a).toContain("t=!extra_field_41&a=cancelar");
    expect(a).not.toContain("extra_field_42");
    expect(b).toContain("t=!extra_field_42");
    expect(a).not.toContain(MARCADOR_TOKEN);
    expect(aplicarTokenLista(html, null)).toContain("{TOKEN_POR_CONFIGURAR}");
  });
});
