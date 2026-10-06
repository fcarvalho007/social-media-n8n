import { describe, expect, it } from "vitest";
import { inserirSlide, reduzir, estadoInicial } from "@/features/editor-grafico/estado";
import type { PacoteProva, Pagina } from "../../supabase/functions/_shared/documento-grafico/nucleo";

const pg = (id: string, slide: string): Pagina => ({ id, slide, fundo: "#fff", camadas: [
  { id: `t-${id}`, tipo: "texto", x: 0, y: 0, w: 100, h: 100, z: 1, ref: `${slide}.titulo`, estilo: { peso: 700, tam: 40, linha: 1.1, alinh: "esq", cor: "#000" } } as never,
] });
const pacote = (): PacoteProva => ({
  v: 1, id: "p", nome: "x", sintetico: true, assets: {},
  conteudo: { slides: [{ id: "s1", titulo: "A", texto: "a" }, { id: "s2", titulo: "B", texto: "b" }] },
  variantes: {
    A: { v: 1, variante: "A", largura: 1080, altura: 1350, fonte: "x", paginas: [pg("a1", "s1"), pg("a2", "s2")] },
    B: { v: 1, variante: "B", largura: 1080, altura: 1350, fonte: "x", paginas: [pg("b1", "s1"), pg("b2", "s2")] },
  },
} as unknown as PacoteProva);

describe("inserirSlide", () => {
  it("insere a seguir ao atual em A, B e na narrativa", () => {
    const r = inserirSlide(pacote(), "A", 0, "texto")!;
    const novo = r.pacote.conteudo.slides[1]!.id;
    expect(r.pacote.conteudo.slides.map((s) => s.id)).toEqual(["s1", novo, "s2"]);
    expect(r.pacote.variantes.A.paginas.map((p) => p.slide)).toEqual(["s1", novo, "s2"]);
    expect(r.pacote.variantes.B.paginas.map((p) => p.slide)).toEqual(["s1", novo, "s2"]);
    const t = r.pacote.variantes.A.paginas[1]!.camadas[0] as { ref?: string };
    expect(t.ref).toBe(`${novo}.titulo`);
    expect(r.pagina).toBe(1);
  });
  it("em branco só tem fundo; desfazer repõe", () => {
    const s0 = estadoInicial(pacote());
    const s1 = reduzir(s0, { tipo: "inserirPagina", indice: 1, modelo: "branco" });
    expect(s1.pacote.variantes.A.paginas[2]!.camadas).toHaveLength(0);
    const s2 = reduzir(s1, { tipo: "desfazer" });
    expect(s2.pacote.variantes.A.paginas).toHaveLength(2);
  });
  it("respeita o limite de 20", () => {
    let p = pacote();
    for (let i = 0; i < 30; i++) { const r = inserirSlide(p, "A", 0, "branco"); if (!r) break; p = r.pacote; }
    expect(p.variantes.A.paginas).toHaveLength(20);
  });
});
