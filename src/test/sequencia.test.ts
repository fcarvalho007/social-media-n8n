import { describe, expect, it } from "vitest";
import { avaliarSequencia } from "@/features/editor-grafico/sequencia";
import type { PacoteProva } from "../../supabase/functions/_shared/documento-grafico/nucleo";

const pag = (i: number, img = false) => ({ id: `p${i}`, fundo: "#fff", camadas: [
  { id: `t${i}`, tipo: "texto" as const, texto: "Uma frase curta", x: 0, y: 0, w: 100, h: 50, z: 1, estilo: { peso: 400 as const, tam: 40, linha: 1.2, alinh: "esq" as const, cor: "#000", overflow: "cortar" as const } },
  ...(img ? [{ id: `i${i}`, tipo: "imagem" as const, asset_id: "a", x: 0, y: 0, w: 10, h: 10, z: 0 }] : []),
] });
const pacote = (n: number, quebras: Record<string, boolean> = {}) => {
  const d = { v: 1, variante: "A", largura: 1080, altura: 1350, fonte: "WorkSans@1", paginas: Array.from({ length: n }, (_, i) => pag(i)), sistema: { estilo: "editorial", variante: "A", paleta: "azul", quebras } };
  return { v: 1, id: "x", nome: "x", conteudo: { slides: [] }, assets: {}, variantes: { A: d, B: d } } as unknown as PacoteProva;
};

describe("vista da sequência", () => {
  it("assinala quatro páginas seguidas iguais", () => {
    expect(avaliarSequencia(pacote(6), "A").avisos.some((a) => a.includes("quatro páginas seguidas"))).toBe(true);
  });
  it("assinala excesso de páginas fortes", () => {
    expect(avaliarSequencia(pacote(4, { "2": true, "3": true }), "A").avisos.some((a) => a.includes("3 de 4"))).toBe(true);
  });
  it("não sugere número ideal de slides", () => {
    expect(avaliarSequencia(pacote(3), "A").avisos.join(" ")).not.toMatch(/ideal/);
  });
});
