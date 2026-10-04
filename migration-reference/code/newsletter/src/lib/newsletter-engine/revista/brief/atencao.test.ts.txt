import { describe, expect, it } from "vitest";

import { avaliarAtencao, rotuloEstadoCurto } from "./atencao";

const base = { estado: "gerado" as const, erro: null, verificacao: {} as never };

describe("avaliarAtencao", () => {
  it("não chama a atenção quando está tudo bem", () => {
    expect(avaliarAtencao(base).precisa).toBe(false);
  });

  it("assinala geração falhada", () => {
    expect(avaliarAtencao({ ...base, estado: "erro" }).motivos).toContain("geracao_falhou");
  });

  it("assinala fonte, factualidade e proximidade", () => {
    const r = avaliarAtencao({
      ...base,
      verificacao: {
        fonte_estado: "indisponivel",
        factual: "falhou",
        proximidade_detalhe: { decisao: "bloqueado" },
      } as never,
    });
    expect(r.motivos).toEqual(["fonte_invalida", "factualidade", "proximidade"]);
  });
});

describe("rotuloEstadoCurto", () => {
  it("o Radar fica Pronto sem exigir aprovação humana", () => {
    expect(rotuloEstadoCurto("radar", "gerado", false)).toBe("Pronto");
  });

  it("o Destaque fica Por rever até haver aprovação", () => {
    expect(rotuloEstadoCurto("destaque", "gerado", false)).toBe("Por rever");
    expect(rotuloEstadoCurto("destaque", "aprovado", true)).toBe("Pronto");
  });

  it("o erro passa à frente de tudo", () => {
    expect(rotuloEstadoCurto("destaque", "erro", true)).toBe("Erro");
  });
});
