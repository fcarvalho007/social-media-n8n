import { describe, expect, it } from "vitest";
import { categoriasOrdenadas, resumirEdicao } from "@/features/curadoria/ResumoSemana";

describe("resumo da curadoria", () => {
  it("ordena categorias da maior para a menor", () => {
    expect(categoriasOrdenadas({ por_categoria: { Redes: 2, IA: 5, Marketing: 3 } })).toEqual([["IA", 5], ["Marketing", 3], ["Redes", 2]]);
  });
  it("conta as adicionadas hoje pelo dia de Lisboa e por categoria", () => {
    const agora = new Date("2026-07-15T10:00:00Z");
    const r = resumirEdicao(320, [
      { categoria: "ia", created_at: "2026-07-14T23:30:00Z" }, // 00:30 em Lisboa (verão) → hoje
      { categoria: "ia", created_at: "2026-07-14T22:30:00Z" }, // 23:30 em Lisboa → ontem
      { categoria: "meta", created_at: "2026-07-15T09:00:00Z" },
    ], agora);
    expect(r).toEqual({ numero: 320, total: 3, hoje: 2, porCategoria: [["ia", 2], ["meta", 1]] });
  });
});
