import { describe, expect, it } from "vitest";
import { comporComImagens, MAX_IMAGENS_APOIO, paragrafoImagem } from "@/features/motor/imagensApoio";

describe("imagens de apoio", () => {
  it("acrescenta um parágrafo § por imagem descrita, pela ordem", () => {
    const t = comporComImagens("Texto base.", [
      { assetId: "a", nome: "vendas", descricao: "T1 120, T2 140" },
      { assetId: "b", nome: "vazia", descricao: "  " },
      { assetId: "c", nome: "custos", descricao: "2024: 30%" },
    ]);
    expect(t.split("\n\n")).toEqual(["Texto base.", "Imagem 1 (vendas): T1 120, T2 140", "Imagem 3 (custos): 2024: 30%"]);
  });
  it("sem descrições não altera o texto", () => {
    expect(comporComImagens("Igual.", [{ assetId: "a", nome: "x", descricao: "" }])).toBe("Igual.");
  });
  it("respeita o limite de imagens e de caracteres", () => {
    const muitas = Array.from({ length: 9 }, (_, i) => ({ assetId: String(i), nome: `i${i}`, descricao: "d" }));
    expect(comporComImagens("T", muitas).split("\n\n").length).toBe(1 + MAX_IMAGENS_APOIO);
    expect(paragrafoImagem({ assetId: "a", nome: "n", descricao: "x".repeat(5000) }, 1)!.length).toBeLessThan(1600);
  });

});
