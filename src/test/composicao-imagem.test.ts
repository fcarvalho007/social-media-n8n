import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "opentype.js";
import { calcularRecorte, criarMedidor, geometriaGradiente, paginaParaSvg, transbordos, type CamadaForma, type CamadaImagem, type FonteOT, type PacoteProva, type Pagina } from "../../supabase/functions/_shared/documento-grafico/nucleo";
import { aplicarSistema, quebrasPadrao, type SistemaVisual } from "../../supabase/functions/_shared/motor/sistema";
import { chaveComposicao, comporImagem, decidir, inferirPapel, MATRIZ, type ComposicoesImagem } from "../../supabase/functions/_shared/motor/imagem";
import { PALETAS } from "../../supabase/functions/_shared/motor/sistema";
import { ESTILOS } from "../../supabase/functions/_shared/motor/estilos";

const ab = (b: Buffer) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
const ler = (f: string) => parse(ab(readFileSync(`public${f}`))) as unknown as FonteOT;
const m = criarMedidor({ 400: ler("/fontes/WorkSans-Regular.ttf"), 700: ler("/fontes/WorkSans-Bold.ttf") });

const SLIDES = [
  { titulo: "Visibilidade em IA: o que mudou", texto: "Uma frase curta de capa." },
  { titulo: "O contexto", texto: "As equipas começaram a medir a presença da marca nas respostas dos assistentes de IA, comparando semanas e temas para perceber o que mudou." },
  { titulo: "62% das PME", texto: "abandonaram uma ferramenta no primeiro ano." },
  { titulo: "Antes vs depois", texto: "Por um lado medição manual; por outro, painéis automáticos." },
  { titulo: "O que é visibilidade", texto: "Significa aparecer citado." },
  { titulo: "O caso da cooperativa", texto: "A cooperativa testou um assistente durante três meses e reduziu o tempo de resposta." },
  { titulo: "Passos", texto: "- medir\n- comparar\n- decidir" },
  { titulo: "Conclusão", texto: "Medir antes de mudar." },
];
const ASSET = { id: "a1", mime: "image/jpeg" as const, largura: 1600, altura: 2400, bytes: 10, hash: "h", dados: "AA==" };
function pagina(i: number, comImagem: boolean): Pagina {
  const sid = `s${i + 1}`;
  return { id: `p${i}`, slide: sid, fundo: "#ffffff", camadas: [
    ...(comImagem ? [{ id: `img${i}`, tipo: "imagem", asset_id: "a1", x: 96, y: 800, w: 888, h: 400, z: 1, recorte: "cover" } as CamadaImagem] : []),
    { id: `t${i}`, tipo: "texto", ref: `${sid}.titulo`, x: 96, y: 200, w: 888, h: 200, z: 2, estilo: { peso: 700, tam: 64, linha: 1.1, alinh: "esq", cor: "#111111", overflow: "cortar" } },
    { id: `b${i}`, tipo: "texto", ref: `${sid}.texto`, x: 96, y: 420, w: 888, h: 300, z: 2, estilo: { peso: 400, tam: 36, linha: 1.4, alinh: "esq", cor: "#333333", overflow: "cortar" } },
    { id: `nota${i}`, tipo: "texto", texto: "Nota", x: 800, y: 1270, w: 180, h: 40, z: 4, estilo: { peso: 400, tam: 24, linha: 1.2, alinh: "esq", cor: "#123456", overflow: "cortar" } },
  ] } as Pagina;
}
function pacote(comImagem = true): PacoteProva {
  const slides = SLIDES.map((s, i) => ({ id: `s${i + 1}`, ...s }));
  const doc = (v: "A" | "B") => ({ v: 1 as const, variante: v, largura: 1080 as const, altura: 1350 as const, fonte: "WorkSans@1" as const, paginas: slides.map((_, i) => pagina(i, comImagem)) });
  return { v: 1, id: "fx", nome: "fx", sintetico: true, conteudo: { slides }, assets: comImagem ? { a1: ASSET } : {}, variantes: { A: doc("A"), B: doc("B") } } as PacoteProva;
}
const sis = (estilo: SistemaVisual["estilo"], paleta = "navy-editorial"): SistemaVisual => ({ estilo, variante: "A", paleta: paleta as SistemaVisual["paleta"], quebras: quebrasPadrao(8) });
const img = (p: Pagina) => p.camadas.find((c) => c.tipo === "imagem") as CamadaImagem | undefined;
const grad = (p: Pagina) => p.camadas.find((c) => c.tipo === "forma" && c.forma === "gradiente") as CamadaForma | undefined;
const comp = (v: "A" | "B", i: number, c: ComposicoesImagem[string]): ComposicoesImagem => ({ [chaveComposicao(v, `s${i + 1}`)]: c });

describe("papéis e decisão automática", () => {
  it("infere papéis distintos sem IA", () => {
    expect(SLIDES.map((s, i) => inferirPapel(s, i, SLIDES.length))).toEqual(["cover", "standard", "data", "comparison", "concept", "case_study", "actions", "conclusion"]);
  });
  it("sem imagem disponível decide 'none'; com imagem do utilizador nunca a remove automaticamente", () => {
    expect(decidir({ papel: "case_study", estilo: "editorial", variante: "A", temImagem: false, chars: 50 }).modo).toBe("none");
    expect(decidir({ papel: "data", estilo: "editorial", variante: "A", temImagem: true, chars: 50 }).modo).toBe("inset");
    expect(MATRIZ.cover.editorial).toBe("full_bleed");
  });
});

describe("renderer de composição de imagem", () => {
  const A = aplicarSistema(pacote(), sis("editorial"), m).pacote.variantes.A.paginas;
  it("capa: fundo total, gradiente de base a ~38% na cor escura da paleta, texto branco", () => {
    expect(img(A[0])).toMatchObject({ x: 0, y: 0, w: 1080, h: 1350, foco: { x: 0.5, y: 0.3 } });
    expect(grad(A[0])?.estilo).toMatchObject({ direcao: "base", inicio: 0.38, cor: PALETAS[0].cores.fundoCapa });
  });
  it("1-2. textRegion left/right gera overlay do mesmo lado", () => {
    for (const r of ["left", "right"] as const) {
      const p = aplicarSistema(pacote(), sis("editorial"), m, [0], comp("A", 0, { regiao: r })).pacote.variantes.A.paginas[0];
      expect(grad(p)?.estilo.direcao).toBe(r === "left" ? "esquerda" : "direita");
      const g = geometriaGradiente(grad(p)!);
      expect(r === "left" ? g.x2 < g.x1 : g.x2 > g.x1).toBe(true);
    }
  });
  it("3. focalPoint altera o recorte", () => {
    const p = (y: number) => img(aplicarSistema(pacote(), sis("editorial"), m, [0], comp("A", 0, { foco: { x: 0.5, y } })).pacote.variantes.A.paginas[0])!;
    expect(calcularRecorte(ASSET, p(0.1)).sy).not.toBe(calcularRecorte(ASSET, p(0.9)).sy);
  });
  it("4. imageMode none não deixa espaço vazio de imagem", () => {
    const p = aplicarSistema(pacote(), sis("editorial"), m, [1], comp("A", 1, { modo: "none" })).pacote.variantes.A.paginas[1];
    expect(img(p)).toBeUndefined();
    const sem = aplicarSistema(pacote(false), sis("editorial"), m).pacote.variantes.A.paginas[1];
    expect(p.camadas.filter((c) => c.tipo === "texto").map((c) => [c.x, c.y])).toEqual(sem.camadas.filter((c) => c.tipo === "texto").map((c) => [c.x, c.y]));
  });
  it("5. hero: imagem no topo com gradiente que funde no fundo", () => {
    const p = A[5];
    expect(img(p)).toMatchObject({ x: 0, y: 0, w: 1080 });
    expect(grad(p)?.estilo).toMatchObject({ direcao: "base", cor: PALETAS[0].cores.fundo });
    const t = p.camadas.find((c) => c.id === "t5")!;
    expect(t.y).toBeGreaterThan(img(p)!.h);
  });
  it("6. contida alinha com a grelha do texto", () => {
    const p = A[1];
    const i = img(p)!, t = p.camadas.find((c) => c.id === "t1")!;
    expect([i.x, i.w]).toEqual([t.x, t.w]);
  });
  it("7-8. trocar paleta não muda recorte nem imagem", () => {
    const outra = aplicarSistema(pacote(), sis("editorial", "navy-signal"), m).pacote.variantes.A.paginas;
    A.forEach((p, i) => { const a = img(p), b = img(outra[i]); expect(b && { ...b }).toEqual(a && { ...a }); });
  });
  it("9-10. trocar a imagem (ou a origem) não muda texto nem geometria", () => {
    const base = pacote();
    const p2 = { ...base, assets: { ...base.assets, a2: { ...ASSET, id: "a2" } } } as PacoteProva;
    p2.variantes.A.paginas[5].camadas = p2.variantes.A.paginas[5].camadas.map((c) => (c.tipo === "imagem" ? { ...c, asset_id: "a2" } : c));
    const r1 = aplicarSistema(base, sis("editorial"), m, [5], comp("A", 5, { origem: "pexels" })).pacote.variantes.A.paginas[5];
    const r2 = aplicarSistema(p2, sis("editorial"), m, [5], comp("A", 5, { origem: "library" })).pacote.variantes.A.paginas[5];
    const geo = (p: Pagina) => p.camadas.map((c) => `${c.id}:${c.x},${c.y},${c.w},${c.h}`).join("|");
    expect(geo(r1)).toBe(geo(r2));
    expect(r2.camadas.filter((c) => c.tipo === "texto")).toEqual(r1.camadas.filter((c) => c.tipo === "texto"));
  });
  it("11. determinístico (Design = Composição)", () => {
    expect(JSON.stringify(aplicarSistema(pacote(), sis("revista"), m).pacote)).toBe(JSON.stringify(aplicarSistema(pacote(), sis("revista"), m).pacote));
  });
  it("12. exportação SVG conserva recorte e gradiente direcional", () => {
    const p = aplicarSistema(pacote(), sis("editorial"), m, [0], comp("A", 0, { regiao: "left" })).pacote;
    const svg = paginaParaSvg(p, "A", 0, m);
    expect(svg).toMatch(/linearGradient id="[^"]+" gradientUnits="userSpaceOnUse" x1="1080" y1="0" x2="0" y2="0"/);
  });
  it("seis estilos × A/B: nada transborda, notas manuais intactas, variantes diferentes", () => {
    for (const e of ESTILOS) {
      const r = aplicarSistema(pacote(), sis(e.id), m).pacote;
      for (const v of ["A", "B"] as const) {
        expect([e.id, v, transbordos(r, v, m)]).toEqual([e.id, v, []]);
        r.variantes[v].paginas.forEach((p, i) => expect(p.camadas.find((c) => c.id === `nota${i}`)).toMatchObject({ x: 800, y: 1270, texto: "Nota" }));
      }
      expect(JSON.stringify(r.variantes.A.paginas[0])).not.toBe(JSON.stringify(r.variantes.B.paginas[0]));
    }
  });
  it("documento antigo (gradiente sem direção) mantém o desenho legado", () => {
    const g = geometriaGradiente({ x: 0, y: 100, w: 1080, h: 500, estilo: { cor: "#000000" } });
    expect(g).toMatchObject({ radial: false, x1: 0, y1: 100, x2: 0, y2: 600, paragens: [[0, 0], [1, 1]] });
  });
  it("modo que não cabe é recusado sem cortar", () => {
    const base = pacote();
    base.conteudo.slides[1].texto = "Texto muito longo ".repeat(60);
    const r = comporImagem(base.variantes.A.paginas[1], { indice: 1, total: 8, estilo: "editorial", variante: "A", paleta: PALETAS[0].cores, conteudo: base.conteudo, m, comp: { modo: "split" } });
    expect(r?.cabe).toBe(false);
  });
});

describe("sem imagem é reversível", () => {
  it("modo none esconde a foto e voltar a hero restaura-a do asset lembrado", () => {
    const sem = aplicarSistema(pacote(), sis("editorial"), m, [5], comp("A", 5, { modo: "none", asset_id: "a1" })).pacote;
    expect(img(sem.variantes.A.paginas[5])).toBeUndefined();
    // The page itself now carries the choice (single source of truth); change it there.
    expect(sem.variantes.A.paginas[5].composicao).toMatchObject({ modo: "none", asset_id: "a1" });
    const comHero = { ...sem, variantes: { ...sem.variantes, A: { ...sem.variantes.A, paginas: sem.variantes.A.paginas.map((p, i) => (i === 5 ? { ...p, composicao: { modo: "hero", asset_id: "a1" } } : p)) } } };
    const volta = aplicarSistema(comHero, sis("editorial"), m, [5]).pacote;
    expect(img(volta.variantes.A.paginas[5])).toMatchObject({ asset_id: "a1", y: 0 });
  });
});
