import { describe, expect, it } from "vitest";
import { apagarSlideLogico, inserirSlide, moverSlideLogico } from "@/features/editor-grafico/estado";
import { lerAlternativas, semNumerosNovos } from "../../supabase/functions/_shared/motor/reescrever";
import type { PacoteProva, Pagina } from "../../supabase/functions/_shared/documento-grafico/nucleo";

const pg = (id: string, slide: string): Pagina => ({ id, slide, fundo: "#fff", camadas: [
  { id: `t-${id}`, tipo: "texto", x: 0, y: 0, w: 100, h: 100, z: 1, ref: `${slide}.titulo`, estilo: { peso: 700, tam: 40, linha: 1.1, alinh: "esq", cor: "#000" } } as never,
] });
const pacote = (): PacoteProva => ({
  v: 1, id: "p", nome: "x", sintetico: true, assets: {},
  conteudo: { slides: [{ id: "s1", titulo: "A", texto: "a" }, { id: "s2", titulo: "B", texto: "b" }, { id: "s3", titulo: "C", texto: "c" }] },
  variantes: {
    A: { v: 1, variante: "A", largura: 1080, altura: 1350, fonte: "x", paginas: [pg("a1", "s1"), pg("a2", "s2"), pg("a2b", "s2"), pg("a3", "s3")] },
    B: { v: 1, variante: "B", largura: 1080, altura: 1350, fonte: "x", paginas: [pg("b1", "s1"), pg("b2", "s2"), pg("b3", "s3")] },
  },
} as unknown as PacoteProva);
const ids = (p: PacoteProva) => [p.conteudo.slides.map((s) => s.id), p.variantes.A.paginas.map((x) => x.slide), p.variantes.B.paginas.map((x) => x.slide)];

describe("remover slide na Narrativa", () => {
  it("remove o slide da narrativa e todas as suas páginas em A e B, mesmo com várias páginas", () => {
    const r = apagarSlideLogico(pacote(), "s2");
    expect(ids(r)).toEqual([["s1", "s3"], ["s1", "s3"], ["s1", "s3"]]);
  });
  it("remove um slide acrescentado", () => {
    const n = inserirSlide(pacote(), "A", 0, "texto")!.pacote;
    const novo = n.conteudo.slides[1]!.id;
    expect(ids(apagarSlideLogico(n, novo))[0]).toEqual(["s1", "s2", "s3"]);
  });
  it("nunca remove o último slide", () => {
    let p = apagarSlideLogico(apagarSlideLogico(pacote(), "s1"), "s2");
    p = apagarSlideLogico(p, "s3");
    expect(p.conteudo.slides.map((s) => s.id)).toEqual(["s3"]);
  });
});

describe("mover slide na Narrativa", () => {
  it("A e B seguem a nova ordem e as páginas do mesmo slide ficam juntas", () => {
    const r = moverSlideLogico(pacote(), 1, 2);
    expect(ids(r)).toEqual([["s1", "s3", "s2"], ["s1", "s3", "s2", "s2"], ["s1", "s3", "s2"]]);
  });
  it("um slide acrescentado pode ir para o início", () => {
    const n = inserirSlide(pacote(), "A", 2, "texto")!.pacote;
    const novo = n.conteudo.slides[2]!.id;
    const r = moverSlideLogico(n, 2, 0);
    expect(r.conteudo.slides[0]!.id).toBe(novo);
    expect(r.variantes.A.paginas[0]!.slide).toBe(novo);
    expect(r.variantes.B.paginas[0]!.slide).toBe(novo);
  });
});

describe("reescrever com IA", () => {
  it("devolve no máximo 2 propostas e descarta as que mudam números", () => {
    const orig = "75% dos marketers preveem mais orçamento em 2027.";
    const bruto = JSON.stringify({ alternativas: ["Em 2027, 75% dos marketers contam com mais orçamento.", "80% dos marketers preveem mais orçamento em 2027.", orig, "Três em cada quatro... não: 75% esperam mais verba em 2027.", "extra 75% 2027"] });
    const r = lerAlternativas(bruto, orig, "titulo");
    expect(r.alternativas).toHaveLength(2);
    expect(r.alternativas.every((a) => semNumerosNovos(orig, a))).toBe(true);
    expect(r.alternativas).not.toContain(orig);
  });
  it("resposta inválida não gera propostas", () => {
    expect(lerAlternativas("não é json", "x", "texto").alternativas).toEqual([]);
  });
});
