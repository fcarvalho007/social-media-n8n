import { describe, expect, it } from "vitest";
import { construirPromptVisual, construirQueryVisual, inferirFonte } from "../../supabase/functions/_shared/motor/promptVisual";

const base = { titulo: "Tráfego caiu 30%", texto: "A equipa reviu os dados.", intencao: "profissional a interpretar alterações de tráfego, ambiente analítico", papel: "cover" as const, estilo: "editorial", variante: "A" as const, paleta: "navy-editorial" };

describe("prompt visual determinístico", () => {
  it("texto à esquerda pede sujeito à direita; texto em baixo pede sujeito em cima; hero no terço superior", () => {
    expect(construirPromptVisual({ ...base, modo: "full_bleed", regiao: "left" })).toMatch(/subject on the right.*negative space on the left/);
    expect(construirPromptVisual({ ...base, modo: "full_bleed", regiao: "right" })).toMatch(/subject on the left.*negative space on the right/);
    expect(construirPromptVisual({ ...base, modo: "full_bleed", regiao: "bottom" })).toMatch(/upper.*lower portion/);
    expect(construirPromptVisual({ ...base, modo: "hero", regiao: "bottom" })).toMatch(/upper third/);
  });
  it("inclui todos os campos pedidos, 1080x1350 e proibição de texto/logos/interfaces", () => {
    const p = construirPromptVisual({ ...base, modo: "full_bleed", regiao: "bottom" });
    for (const k of ["Subject and action", "Setting", "Camera angle", "Lighting", "Depth of field", "Composition", "Colour palette", "Visual style", "1080x1350"]) expect(p).toContain(k);
    expect(p).toMatch(/no text, letters, numbers, logos, labels, signage/);
    expect(p).toContain(base.intencao);
  });
  it("Pexels e IA partem da mesma intenção", () => {
    const q = construirQueryVisual(base.intencao, base.titulo);
    expect(q).toContain("profissional");
    expect(q.split(" ").length).toBeLessThanOrEqual(6);
  });
  it("automático decide primeiro se precisa de imagem (dado/comparação/ações sem foto)", () => {
    for (const r of ["data", "comparison", "actions", "transition"] as const) expect(inferirFonte(r).precisa).toBe(false);
    expect(inferirFonte("cover").fontes).toContain("ia");
    expect(inferirFonte("case_study").fontes).toEqual(["pexels", "biblioteca"]);
  });
});
