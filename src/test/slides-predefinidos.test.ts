import { describe, expect, it } from "vitest";
import { precisaArtigoCompleto, SLIDES_ALTERNATIVA, SLIDES_PREDEFINIDOS } from "@/features/motor/slidesPredefinidos";

describe("número de slides por defeito", () => {
  it("começa em 10 e a alternativa é 8", () => {
    expect(SLIDES_PREDEFINIDOS).toBe(10);
    expect(SLIDES_ALTERNATIVA).toBe(8);
  });
});

describe("notícia da curadoria só com resumo", () => {
  it("pede o artigo completo quando só há resumo e existe link", () => {
    expect(precisaArtigoCompleto({ nivel: "resumo", texto: "x".repeat(248), url: "https://exemplo.pt/a" })).toBe(true);
  });
  it("não pede quando o artigo já está guardado", () => {
    expect(precisaArtigoCompleto({ nivel: "artigo", texto: "x".repeat(5000), url: "https://exemplo.pt/a" })).toBe(false);
  });
  it("não pede sem link", () => {
    expect(precisaArtigoCompleto({ nivel: "resumo", texto: "curto", url: null })).toBe(false);
  });
});
