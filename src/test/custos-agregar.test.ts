import { describe, expect, it } from "vitest";
import { filtrar, inicioPeriodo, serie, totais } from "@/features/custos/agregar";
import type { RegistoCusto } from "@/services/custos";

const r = (d: string, f: RegistoCusto["fornecedor"], c: number | null, o: RegistoCusto["custo_origem"] = "calculado"): RegistoCusto =>
  ({ id: d + f, criado_em: d, fornecedor: f, modelo: "m", acao: "a", estado: "concluido", unidades: {}, custo_eur: c, custo_origem: o });
const agora = new Date("2026-10-06T10:00:00Z");

describe("custos", () => {
  it("week starts Monday in Lisbon", () => { expect(inicioPeriodo("semana", agora)).toBe("2026-10-05"); expect(inicioPeriodo("mes", agora)).toBe("2026-10-01"); });
  it("uses Lisbon day boundaries", () => {
    const x = filtrar([r("2026-09-30T23:30:00Z", "kie", 1)], { periodo: "mes", fornecedor: "todos", pesquisa: "" }, agora);
    expect(x).toHaveLength(1); // 00:30 on 01/10 in Lisbon
  });
  it("unknown costs never enter totals", () => {
    const t = totais([r("2026-10-01T10:00:00Z", "kie", null, "desconhecido"), r("2026-10-01T10:00:00Z", "deepseek", 0.5)]);
    expect(t.total).toBe(0.5); expect(t.desconhecidos).toBe(1);
  });
  it("empty days are zero, not missing", () => {
    const s = serie([r("2026-10-02T10:00:00Z", "fal", 0.2)], "mes", agora);
    expect(s.pontos.map((p) => p.periodo)).toEqual(["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05", "2026-10-06"]);
    expect(s.pontos[0].total).toBe(0);
  });
});
