import { describe, expect, it } from "vitest";
import { caixaTexto, paginasCortadas, recorteCentral, recuos, sequenciaTitulos } from "@/features/motor/leituraPreview";
import type { PacoteProva } from "../../supabase/functions/_shared/documento-grafico/nucleo";

const txt = (id: string, ref: string, x: number, y: number, w: number, h: number) => ({ id, nome: id, tipo: "texto", ref, x, y, w, h, z: 1 });
const pacote = {
  v: 1, id: "t", nome: "t", sintetico: true, assets: {},
  conteudo: { slides: [{ id: "s1", titulo: "Tese curta", texto: "a" }, { id: "s2", titulo: "Segundo", texto: "b" }] },
  variantes: {
    A: { paginas: [
      { id: "p1", slide: "s1", fundo: "#fff", camadas: [txt("t1", "s1.titulo", 90, 60, 900, 200), txt("c1", "s1.texto", 90, 300, 900, 300)] },
      { id: "p2", slide: "s2", fundo: "#fff", camadas: [txt("t2", "s2.titulo", 90, 300, 900, 300)] },
    ] },
    B: { paginas: [] },
  },
} as unknown as PacoteProva;

describe("Ver como será lido (só pré-visualização)", () => {
  it("recortes centrais com a geometria real da página 1080×1350", () => {
    expect(recorteCentral("4:5")).toEqual({ x: 0, y: 0, w: 1080, h: 1350 });
    expect(recorteCentral("1:1")).toEqual({ x: 0, y: 135, w: 1080, h: 1080 });
    const r = recorteCentral("3:4");
    expect(r.h).toBe(1350); expect(r.w).toBeCloseTo(1012.5); expect(r.x).toBeCloseTo(33.75);
  });
  it("caixa e recuos vêm das camadas reais; deteta texto fora do recorte 1:1", () => {
    const c = caixaTexto(pacote, "A", 0)!;
    expect(recuos(c)).toEqual({ topo: 60, dir: 90, base: 750, esq: 90 });
    expect(paginasCortadas(pacote, "A", "1:1")).toEqual([0]);
    expect(paginasCortadas(pacote, "A", "3:4")).toEqual([]);
  });
  it("sequência de títulos pela ordem das páginas, com estado do alt", () => {
    expect(sequenciaTitulos(pacote, "A", ["Alt 1", ""])).toEqual([
      { pagina: 0, titulo: "Tese curta", altPreenchido: true },
      { pagina: 1, titulo: "Segundo", altPreenchido: false },
    ]);
  });
  it("não altera o pacote", () => {
    const antes = JSON.stringify(pacote);
    caixaTexto(pacote, "A", 1); paginasCortadas(pacote, "A", "1:1"); sequenciaTitulos(pacote, "A");
    expect(JSON.stringify(pacote)).toBe(antes);
  });
});
