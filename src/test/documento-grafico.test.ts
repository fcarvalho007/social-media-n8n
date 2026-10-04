import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "opentype.js";
import { initWasm, Resvg } from "@resvg/resvg-wasm";
import {
  calcularRecorte, criarMedidor, layoutTexto, paginaParaSvg, validarPacote, type FonteOT, type PacoteProva,
} from "../../supabase/functions/_shared/documento-grafico/nucleo";
import { FIXTURES } from "@/features/editor-grafico/fixtures";
import { estadoInicial, reduzir } from "@/features/editor-grafico/estado";

const ab = (b: Buffer) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
const f400 = readFileSync("public/fontes/WorkSans-Regular.ttf");
const f700 = readFileSync("public/fontes/WorkSans-Bold.ttf");
const medidor = criarMedidor({ 400: parse(ab(f400)) as unknown as FonteOT, 700: parse(ab(f700)) as unknown as FonteOT });

describe("DocumentoGrafico v1", () => {
  it("cinco fixtures sintéticas identificadas e válidas", () => {
    expect(FIXTURES).toHaveLength(5);
    for (const f of FIXTURES) {
      expect(f.sintetico).toBe(true);
      expect(f.nome).toMatch(/^Fixture sintética/);
      expect(() => validarPacote(f)).not.toThrow();
    }
  });

  it("JSON roundtrip preserva o documento", () => {
    for (const f of FIXTURES) expect(validarPacote(JSON.parse(JSON.stringify(f)))).toEqual(JSON.parse(JSON.stringify(f)));
  });

  it("recusa documentos não sintéticos, dimensões erradas e recursos em falta", () => {
    const base = JSON.parse(JSON.stringify(FIXTURES[0])) as PacoteProva;
    expect(() => validarPacote({ ...base, sintetico: false })).toThrow(/sintéticos/);
    expect(() => validarPacote({ ...base, variantes: { ...base.variantes, A: { ...base.variantes.A, largura: 1000 } } })).toThrow(/1080×1350/);
    const r = JSON.parse(JSON.stringify(FIXTURES[3])) as PacoteProva;
    r.assets = {};
    expect(() => validarPacote(r)).toThrow(/não existe/);
  });

  it("texto longo reduz o tamanho e corta com reticências quando necessário", () => {
    const e = { peso: 700 as const, tam: 84, linha: 1.1, alinh: "esq" as const, cor: "#000000", maxLinhas: 2, overflow: "reduzir" as const, tamMin: 40 };
    const l = layoutTexto("palavra ".repeat(60), e, 600, 200, medidor);
    expect(l.tam).toBe(40);
    expect(l.linhas).toHaveLength(2);
    expect(l.cortado).toBe(true);
    expect(l.linhas[1].texto.endsWith("…")).toBe(true);
    for (const x of l.linhas) expect(x.largura).toBeLessThanOrEqual(600 + 0.01);
  });

  it("caminhos de glifos não têm NaN (acentos e pontuação pt-PT)", () => {
    const d = medidor.caminho("Ação, receção — «já» 1.º 3 € longas, palavras", 0, 50, 44, 400);
    expect(d).not.toMatch(/NaN/);
    expect(d.length).toBeGreaterThan(100);
  });

  it("regressão: preserva especificamente o «a» de «longas» entre os glifos adjacentes", () => {
    const esquerda = medidor.largura("long", 44, 400);
    const larguraA = medidor.largura("a", 44, 400);
    const caminho = medidor.caminho("longas", 0, 50, 44, 400);
    const movimentos = [...caminho.matchAll(/M\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g)].map((m) => Number(m[1]));
    expect(caminho).not.toMatch(/NaN/);
    expect(movimentos.some((x) => x >= esquerda - 2 && x <= esquerda + larguraA + 2)).toBe(true);
  });

  it("mantém métricas e quebras determinísticas nas cinco fixtures e variantes", () => {
    for (const f of FIXTURES) for (const v of ["A", "B"] as const) {
      const pagina = f.variantes[v].paginas[0];
      for (const c of pagina.camadas) if (c.tipo === "texto") {
        const texto = c.ref ? f.conteudo.slides[0][c.ref.endsWith("titulo") ? "titulo" : "texto"] : c.texto ?? "";
        const a = layoutTexto(texto, c.estilo, c.w, c.h, medidor);
        const b = layoutTexto(texto, c.estilo, c.w, c.h, medidor);
        expect(b).toEqual(a);
        expect(a.linhas.every((linha) => linha.largura <= c.w + 0.01)).toBe(true);
        expect(a.linhas.map((linha) => linha.texto).join(" ").length).toBeGreaterThan(0);
      }
    }
  });

  it("recorte cover respeita o foco e contain mostra a imagem inteira", () => {
    const a = { largura: 800, altura: 600 };
    const cover = calcularRecorte(a, { w: 1080, h: 1350, recorte: "cover", foco: { x: 1, y: 0.5 } });
    expect(cover.sh).toBe(600);
    expect(cover.sx + cover.sw).toBeCloseTo(800);
    const contain = calcularRecorte(a, { w: 400, h: 400, recorte: "contain" });
    expect(contain.dw).toBe(400);
    expect(contain.dh).toBe(300);
    expect(contain.dy).toBe(50);
  });

  it("servidor: SVG das 5 fixtures renderiza 1080×1350 com resvg-wasm", async () => {
    await initWasm(readFileSync("node_modules/@resvg/resvg-wasm/index_bg.wasm"));
    for (const f of FIXTURES) {
      for (const v of ["A", "B"] as const) {
        const svg = paginaParaSvg(f, v, 0, medidor);
        const img = new Resvg(svg, { font: { fontBuffers: [new Uint8Array(f400), new Uint8Array(f700)], loadSystemFonts: false } }).render();
        expect([img.width, img.height]).toEqual([1080, 1350]);
      }
    }
  }, 30000);
});

describe("estado do editor", () => {
  it("texto partilhado muda nas variantes A e B; desfazer/refazer", () => {
    let s = estadoInicial(FIXTURES[0]);
    s = reduzir(s, { tipo: "texto", slide: "s1", campo: "titulo", valor: "Novo", agrupar: "t" });
    s = reduzir(s, { tipo: "texto", slide: "s1", campo: "titulo", valor: "Novo título", agrupar: "t" });
    expect(s.passado).toHaveLength(1); // typing merged into one undo step
    expect(paginaParaSvg(s.pacote, "B", 0, medidor)).toContain("Novo título");
    expect(paginaParaSvg(s.pacote, "A", 0, medidor)).toContain("Novo título");
    s = reduzir(s, { tipo: "desfazer" });
    expect(s.pacote.conteudo.slides[0].titulo).toBe(FIXTURES[0].conteudo.slides[0].titulo);
    s = reduzir(s, { tipo: "refazer" });
    expect(s.pacote.conteudo.slides[0].titulo).toBe("Novo título");
  });

  it("editar, desfazer, refazer e guardar/reabrir JSON preserva o texto", () => {
    let s = estadoInicial(FIXTURES[1]);
    s = reduzir(s, { tipo: "texto", slide: "s1", campo: "texto", valor: "Texto escrito por toque e teclado virtual", agrupar: "teclado:s1" });
    const guardado = JSON.stringify(s.pacote);
    s = reduzir(s, { tipo: "desfazer" });
    expect(s.pacote.conteudo.slides[0].texto).not.toContain("teclado virtual");
    s = reduzir(s, { tipo: "refazer" });
    expect(s.pacote.conteudo.slides[0].texto).toContain("teclado virtual");
    expect(validarPacote(JSON.parse(guardado)).conteudo.slides[0].texto).toContain("teclado virtual");
  });

  it("documento inválido é recusado sem substituir o rascunho corrente", () => {
    const s = reduzir(estadoInicial(FIXTURES[0]), { tipo: "texto", slide: "s1", campo: "titulo", valor: "Rascunho intacto" });
    const antes = JSON.stringify(s.pacote);
    expect(() => validarPacote({ ...JSON.parse(antes), sintetico: false })).toThrow();
    expect(JSON.stringify(s.pacote)).toBe(antes);
  });

  it("ordem, duplicar e reordenar páginas", () => {
    let s = estadoInicial(FIXTURES[4]);
    s = reduzir(s, { tipo: "ordem", id: "a1-elipse", direcao: "topo" });
    const pg = s.pacote.variantes.A.paginas[0];
    expect(Math.max(...pg.camadas.map((c) => c.z))).toBe(pg.camadas.find((c) => c.id === "a1-elipse")!.z);
    s = reduzir(s, { tipo: "duplicarPagina", indice: 0 });
    expect(s.pacote.variantes.A.paginas).toHaveLength(2);
    expect(s.pagina).toBe(1);
    const ids = s.pacote.variantes.A.paginas.map((p) => p.id);
    s = reduzir(s, { tipo: "moverPagina", de: 1, para: 0 });
    expect(s.pacote.variantes.A.paginas.map((p) => p.id)).toEqual([ids[1], ids[0]]);
    expect(s.pacote.variantes.B.paginas).toHaveLength(1);
    expect(() => validarPacote(JSON.parse(JSON.stringify(s.pacote)))).not.toThrow();
  });
});
