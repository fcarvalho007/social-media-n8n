import { describe, expect, it } from "vitest";
import { categoriasOrdenadas } from "@/features/curadoria/ResumoSemana";

describe("resumo semanal da curadoria", () => {
  it("ordena categorias da maior para a menor", () => {
    expect(categoriasOrdenadas({ por_categoria: { Redes: 2, IA: 5, Marketing: 3 } })).toEqual([["IA", 5], ["Marketing", 3], ["Redes", 2]]);
  });
});
