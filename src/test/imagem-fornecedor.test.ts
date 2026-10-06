import { describe, expect, it } from "vitest";
import { modelosImagem, resolverFornecedorImagem } from "../../supabase/functions/_shared/motor/imagemModelo.server";

const env = (o: Record<string, string>) => (k: string) => o[k];

describe("fornecedor de imagens IA", () => {
  it("fal é principal com FAL_KEY e Kie fica como alternativa", () => {
    expect(resolverFornecedorImagem(env({ FAL_KEY: "x", KIE_API_KEY: "y" }))).toMatchObject({ principal: "fal", fallback: "kie" });
  });
  it("sem FAL_KEY usa Kie", () => {
    expect(resolverFornecedorImagem(env({ KIE_API_KEY: "y" })).principal).toBe("kie");
  });
  it("limite diário conta os modelos fal", () => {
    expect(modelosImagem(env({})).some((m) => m.startsWith("fal:"))).toBe(true);
  });
});
