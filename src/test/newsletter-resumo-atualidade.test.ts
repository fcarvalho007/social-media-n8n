import { describe, expect, it } from "vitest";
import { resumoAtualidade } from "@/newsletter/features/newsletter/checklist";
const L = { destaquesMin: 2, destaquesMax: 3, radarMin: 3 };
describe("resumo de «A Atualidade»", () => {
  it("mostra as 43 aprovadas por organizar em vez de 0 · 0 · 0", () => {
    const r = resumoAtualidade({ destaques: 0, radar: 0, soSite: 0, porOrganizar: 43 }, L);
    expect(r.selo).toBe("43 por organizar");
    expect(r.linha.startsWith("43 aprovadas por organizar · ")).toBe(true);
  });
  it("mantém «Faltam 5» quando não há nada por organizar", () => {
    expect(resumoAtualidade({ destaques: 0, radar: 0, soSite: 0, porOrganizar: 0 }, L).selo).toBe("Faltam 5");
  });
  it("continua «Pronto» com os mínimos cumpridos", () => {
    expect(resumoAtualidade({ destaques: 2, radar: 3, soSite: 1, porOrganizar: 4 }, L).estado).toBe("pronto");
  });
});
