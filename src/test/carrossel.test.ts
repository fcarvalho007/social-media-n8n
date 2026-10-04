import { describe, expect, it } from "vitest";
import { legendaComLink, validarCarrossel } from "../../supabase/functions/_shared/conteudos/carrossel";

const fonte = { paragrafos: ["a", "b", "c", "d"], url: "https://exemplo.pt/cronica" };
const proposta = () => ({
  slides: Array.from({ length: 6 }, (_, i) => ({ titulo: `Título ${i + 1}`, texto: `Texto ${i + 1}`, fontes: i === 0 || i === 5 ? [] : [1 + (i % 4)] })),
  legenda: "Legenda editorial.",
});

describe("carrossel da crónica", () => {
  it("aceita uma proposta com referências reais", () => {
    expect(validarCarrossel(proposta(), fonte).slides).toHaveLength(6);
  });
  it("recusa referências inventadas e slides sem evidência", () => {
    const p = proposta(); p.slides[2].fontes = [99];
    expect(() => validarCarrossel(p, fonte)).toThrow("não existe");
    p.slides[2].fontes = [];
    expect(() => validarCarrossel(p, fonte)).toThrow("referência");
  });
  it("não trunca textos longos nem aceita estrutura errada", () => {
    const p = proposta(); p.slides[0].texto = "x".repeat(361);
    expect(() => validarCarrossel(p, fonte)).toThrow("360");
    expect(() => validarCarrossel({ slides: [], legenda: "" }, fonte)).toThrow();
    expect(() => validarCarrossel({ ...proposta(), extra: 1 }, fonte)).toThrow();
  });
  it("acrescenta o URL da crónica e respeita 2200 caracteres", () => {
    expect(legendaComLink(proposta(), fonte)).toContain(fonte.url);
    expect(() => legendaComLink({ ...proposta(), legenda: "x".repeat(2190) }, fonte)).toThrow("2200");
  });
});
