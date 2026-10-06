import { describe, expect, it } from "vitest";
import { reduzir, estadoInicial } from "@/features/editor-grafico/estado";
import type { Asset, Camada, PacoteProva, Pagina } from "../../supabase/functions/_shared/documento-grafico/nucleo";

const pg = (id: string, slide: string): Pagina => ({ id, slide, fundo: "#fff", camadas: [
  { id: `t-${id}`, tipo: "texto", x: 10, y: 10, w: 100, h: 100, z: 1, ref: `${slide}.titulo`, estilo: { peso: 700, tam: 40, linha: 1.1, alinh: "esq", cor: "#000", overflow: "cortar" } } as Camada,
] });
const pacote = (): PacoteProva => ({
  v: 1, id: "p", nome: "x", sintetico: true, assets: {},
  conteudo: { slides: [{ id: "s1", titulo: "Um", texto: "a" }, { id: "s2", titulo: "Dois", texto: "b" }] },
  variantes: {
    A: { v: 1, variante: "A", largura: 1080, altura: 1350, fonte: "x", paginas: [pg("a1", "s1"), pg("a2", "s2")] },
    B: { v: 1, variante: "B", largura: 1080, altura: 1350, fonte: "x", paginas: [pg("b1", "s1"), pg("b2", "s2")] },
  },
} as unknown as PacoteProva);
const asset = (id: string, l = 1000, a = 500): Asset => ({ id, largura: l, altura: a } as unknown as Asset);

describe("várias imagens", () => {
  it("fundo, imagem e logótipo somam-se sem substituir", () => {
    let s = estadoInicial(pacote());
    s = reduzir(s, { tipo: "adicionarImagem", asset: asset("f"), nome: "F", modo: "fundo" });
    s = reduzir(s, { tipo: "adicionarImagem", asset: asset("i"), nome: "I", modo: "imagem" });
    s = reduzir(s, { tipo: "adicionarImagem", asset: asset("l"), nome: "L", modo: "logo" });
    const imgs = s.pacote.variantes.A.paginas[0]!.camadas.filter((c) => c.tipo === "imagem");
    expect(imgs).toHaveLength(3);
    const logo = imgs.find((c) => c.tipo === "imagem" && c.asset_id === "l")!;
    expect([logo.w, logo.h, logo.x + logo.w, logo.y + logo.h]).toEqual([160, 80, 1016, 1286]);
    expect(reduzir(s, { tipo: "desfazer" }).pacote.variantes.A.paginas[0]!.camadas.filter((c) => c.tipo === "imagem")).toHaveLength(2);
  });
});

describe("copiar/colar", () => {
  it("cola texto noutro slide como texto independente, na mesma posição", () => {
    let s = estadoInicial(pacote());
    const origem = s.pacote.variantes.A.paginas[0]!.camadas[0]!;
    s = reduzir(s, { tipo: "pagina", indice: 1 });
    s = reduzir(s, { tipo: "colarCamada", camada: origem, assets: {} });
    const nova = s.pacote.variantes.A.paginas[1]!.camadas.find((c) => c.id === s.selecao)!;
    expect(nova.tipo === "texto" && nova.texto).toBe("Um");
    expect(nova.tipo === "texto" && nova.ref).toBeFalsy();
    expect(nova.x).toBe(10);
  });
  it("colar só o estilo mantém o texto", () => {
    let s = estadoInicial(pacote());
    const origem = { ...s.pacote.variantes.A.paginas[0]!.camadas[0]!, estilo: { peso: 400, tam: 72, linha: 1.3, alinh: "centro", cor: "#f00", overflow: "cortar" } } as Camada;
    s = reduzir(s, { tipo: "pagina", indice: 1 });
    s = reduzir(s, { tipo: "colarEstilo", id: "t-a2", origem });
    const c = s.pacote.variantes.A.paginas[1]!.camadas[0]!;
    expect(c.tipo === "texto" && [c.estilo.tam, c.estilo.cor, c.ref]).toEqual([72, "#f00", "s2.titulo"]);
  });
});
