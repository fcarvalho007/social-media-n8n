import { describe, expect, it } from "vitest";
import { eProva, etiquetaTeste } from "@/features/motor/biblioteca";
import type { TrabalhoResumo } from "@/services/motor";

const t = (x: Partial<TrabalhoResumo>): TrabalhoResumo => ({ id: "1", project_id: "p", estado: "concluido", etapa: "", erro: null, modelo: "estruturacao-local", criado_em: "", actualizado_em: "", titulo: null, ...x });

describe("biblioteca: provas só por marcador persistido", () => {
  it("título com «teste» ou «R8 —» escolhido por alguém não é prova", () => {
    const real = t({ titulo: "R8 — teste de produto para clientes" });
    expect(etiquetaTeste(real)).toBeNull();
    expect(eProva(real)).toBe(false);
  });
  it("marcador prova e demonstração são separados", () => {
    expect(etiquetaTeste(t({ prova: true }))).toBe("Prova");
    expect(eProva(t({ prova: true }))).toBe(true);
    expect(etiquetaTeste(t({ modelo: "simulado-demo" }))).toBe("Demonstração");
    expect(eProva(t({ modelo: "simulado-demo" }))).toBe(true);
  });
});
