import { describe, expect, it } from "vitest";
import { elementosTocados, normalizarArea } from "@/features/editor-grafico/selecaoArea";
import { aplicarPromptProfissional } from "../../supabase/functions/_shared/motor/promptImagemProfissional";
import { catalogoModelosImagem } from "../../supabase/functions/_shared/motor/imagemModelo.server";

describe("seleção por área no compositor", () => {
  it("normaliza um arrasto iniciado fora e seleciona interseções parciais", () => {
    expect(normalizarArea({ x: 80, y: 90, w: -70, h: -80 })).toEqual({ x: 10, y: 10, w: 70, h: 80 });
    expect(elementosTocados({ x: 10, y: 10, w: 70, h: 80 }, [
      { id: "titulo", x: 5, y: 20, w: 20, h: 20 },
      { id: "fora", x: 100, y: 100, w: 20, h: 20 },
    ])).toEqual(["titulo"]);
  });
});

describe("geração de imagem configurada", () => {
  it("só anuncia fornecedores realmente configurados e preços marcados como estimados", () => {
    const valores: Record<string, string> = { FAL_KEY: "presente", KIE_API_KEY: "presente" };
    const opcoes = catalogoModelosImagem((k) => valores[k]);
    expect(opcoes.map((o) => o.fornecedor)).toContain("fal.ai");
    expect(opcoes.map((o) => o.fornecedor)).toContain("Kie.ai");
    expect(opcoes.every((o) => o.custo_origem === "estimado" && o.custo > 0)).toBe(true);
  });

  it("estrutura o prompt profissional sem inventar uma nova intenção", () => {
    const p = aplicarPromptProfissional("Retrato de uma ceramista no atelier", "4:5");
    expect(p).toContain("SUBJECT — Retrato de uma ceramista no atelier");
    expect(p).toContain("COMPOSITION");
    expect(p).toContain("4:5 aspect ratio");
    expect(p).toContain("STRICT PRESERVATION");
  });
});