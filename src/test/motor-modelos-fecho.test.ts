import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "opentype.js";
import { initWasm, Resvg } from "@resvg/resvg-wasm";
import {
  caminhoMascara, criarMedidor, layoutTexto, paginaParaSvg, tracarMascara, transbordos, validarPacote,
  type Familia, type FonteOT, type PacoteProva, type Pagina, type Peso,
} from "../../supabase/functions/_shared/documento-grafico/nucleo";
import { ESTILOS } from "../../supabase/functions/_shared/motor/estilos";
import { adaptarCorNotas, aplicarModelo, comMarcaRascunho, notasIlegiveis, paginasComMarcador } from "../../supabase/functions/_shared/motor/modelos";
import { FICHEIROS_EXTRA } from "@/features/editor-grafico/fontes";

const ab = (b: Buffer) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
const ler = (f: string) => parse(ab(readFileSync(`public${f}`))) as unknown as FonteOT;
const extras: Partial<Record<Familia, Partial<Record<Peso, FonteOT>>>> = {};
for (const [fam, pesos] of Object.entries(FICHEIROS_EXTRA)) for (const [p, f] of Object.entries(pesos ?? {})) (extras[fam as Familia] ??= {})[Number(p) as Peso] = ler(f as string);
const m = criarMedidor({ 400: ler("/fontes/WorkSans-Regular.ttf"), 700: ler("/fontes/WorkSans-Bold.ttf") }, extras);

const CURTO = { titulo: "Estratégia antes da ferramenta", texto: "Escolher a ferramenta primeiro custa tempo e dinheiro às PME (§2)." };
const LONGO = {
  titulo: "Automação determinística: menos improviso, mais processo verificável em cada etapa do trabalho",
  texto: "Antes de automatizar, documenta o processo, define critérios de aceitação e mede o resultado. Sem isso, a automação apenas acelera o improviso. Em 2025, 62% das PME portuguesas inquiridas disseram ter abandonado pelo menos uma ferramenta no primeiro ano (§3). A minha leitura: o problema raramente é a tecnologia.",
};

function pagina(i: number, sid: string): Pagina {
  return { id: `p${i}`, slide: sid, fundo: "#ffffff", camadas: [
    { id: "faixa", tipo: "forma", forma: "ret", x: 0, y: 0, w: 1080, h: 20, z: 1, estilo: { cor: "#3e5b46" } },
    { id: `t${i}`, tipo: "texto", ref: `${sid}.titulo`, x: 96, y: 200, w: 888, h: 300, z: 2, estilo: { peso: 700, tam: 72, linha: 1.1, alinh: "esq", cor: "#111111", overflow: "cortar" } },
    { id: `b${i}`, tipo: "texto", ref: `${sid}.texto`, x: 96, y: 560, w: 888, h: 500, z: 2, estilo: { peso: 400, tam: 40, linha: 1.4, alinh: "esq", cor: "#333333", overflow: "cortar" } },
    { id: "num", tipo: "texto", texto: `${i + 1}/5`, x: 96, y: 1250, w: 200, h: 50, z: 3, estilo: { peso: 400, tam: 30, linha: 1.2, alinh: "esq", cor: "#666666", overflow: "cortar" } },
    { id: `nota${i}`, tipo: "texto", texto: "Nota manual", x: 700, y: 1250, w: 280, h: 50, z: 4, estilo: { peso: 400, tam: 28, linha: 1.2, alinh: "esq", cor: "#123456", overflow: "cortar" } },
  ] };
}
function pacote(longo = false): PacoteProva {
  const slides = Array.from({ length: 5 }, (_, i) => ({ id: `s${i + 1}`, ...(longo && i === 2 ? LONGO : CURTO) }));
  const doc = (v: "A" | "B") => ({ v: 1 as const, variante: v, largura: 1080 as const, altura: 1350 as const, fonte: "WorkSans@1" as const, paginas: slides.map((s, i) => pagina(i, s.id)) });
  return { v: 1, id: "fixture-modelos", nome: "Fixture — seis modelos", sintetico: true, conteudo: { slides }, assets: {}, variantes: { A: doc("A"), B: doc("B") } };
}

const est = (id: string) => ESTILOS.find((x) => x.id === id)!;
const norm = (t: string) => t.replace(/\s+/g, " ").trim();
let fontes: Uint8Array[] = [];
async function png(svg: string) {
  if (!fontes.length) {
    await initWasm(readFileSync("node_modules/@resvg/resvg-wasm/index_bg.wasm"));
    fontes = ["/fontes/WorkSans-Regular.ttf", "/fontes/WorkSans-Bold.ttf", ...Object.values(FICHEIROS_EXTRA).flatMap((x) => Object.values(x ?? {}) as string[])].map((f) => new Uint8Array(readFileSync(`public${f}`)));
  }
  return new Resvg(svg, { font: { fontBuffers: fontes, loadSystemFonts: false, defaultFontFamily: "Work Sans" } }).render().asPng();
}
async function foto(): Promise<string> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2f6f8f"/><stop offset="1" stop-color="#e0a458"/></linearGradient></defs><rect width="1200" height="800" fill="url(#g)"/><circle cx="820" cy="300" r="180" fill="#f3e9d2"/><rect x="0" y="560" width="1200" height="240" fill="#25412f"/></svg>`;
  return Buffer.from(await png(svg)).toString("base64");
}
const DIR = "/mnt/documents/qa-modelos-fecho";

describe("fecho dos modelos: capitular, recorte, avisos", () => {
  it("capitular é derivada do corpo: a primeira letra sai do texto da linha e não se perde nem duplica", () => {
    const e = { peso: 400 as const, familia: "inter" as const, tam: 40, linha: 1.45, alinh: "esq" as const, cor: "#111111", overflow: "cortar" as const, capitular: true };
    const l = layoutTexto(LONGO.texto, e, 860, 2000, m);
    expect(l.capitular?.texto).toBe("A");
    expect(norm(l.capitular!.texto + l.linhas.map((x) => x.texto).join(" "))).toBe(norm(LONGO.texto));
    expect(l.linhas[0].x).toBeGreaterThan(0);
    expect(l.linhas[3].x).toBe(0);
    expect(l.capitular!.baseline).toBe(l.linhas[2].baseline);
    // short or non-letter starts: no drop cap
    expect(layoutTexto(CURTO.texto, e, 860, 2000, m).capitular).toBeUndefined();
    expect(layoutTexto(`«${LONGO.texto}`, e, 860, 2000, m).capitular).toBeUndefined();
  });

  it("Editorial liga a capitular só nos slides interiores, sem tocar no texto, e cabe sem cortes", () => {
    const base = pacote(true);
    const r = aplicarModelo(base, "editorial", est("editorial").paleta, est("editorial").par, ["A"], m);
    expect(r.pacote.conteudo).toEqual(base.conteudo);
    const corpo = (i: number) => r.pacote.variantes.A.paginas[i].camadas.find((c) => c.id === `b${i}`);
    expect(corpo(0)).toMatchObject({ estilo: { capitular: undefined } });
    expect(corpo(2)).toMatchObject({ estilo: { capitular: true } });
    expect(transbordos(r.pacote, "A", m)).toEqual([]);
    expect(() => validarPacote(JSON.parse(JSON.stringify(r.pacote)))).not.toThrow();
    // other models never keep the drop cap
    const r2 = aplicarModelo(r.pacote, "minimalista", est("minimalista").paleta, est("minimalista").par, ["A"], m);
    expect(r2.pacote.variantes.A.paginas[2].camadas.find((c) => c.id === "b2")).toMatchObject({ estilo: { capitular: undefined } });
  });

  it("Revista recorta a imagem com a mesma máscara no canvas e no SVG; texto fica fora da imagem", async () => {
    const p = pacote(true);
    p.assets = { foto: { id: "foto", mime: "image/png", largura: 1200, altura: 800, dados: await foto() } };
    p.variantes.A.paginas[1].camadas.push({ id: "img2", tipo: "imagem", asset_id: "foto", recorte: "cover", x: 100, y: 100, w: 300, h: 300, z: 1 });
    const r = aplicarModelo(p, "revista", est("revista").paleta, est("revista").par, ["A"], m);
    expect(r.recusadas).toEqual([]);
    const pg = r.pacote.variantes.A.paginas[1];
    const img = pg.camadas.find((c) => c.id === "img2")!;
    expect(img).toMatchObject({ mascara: "diagonal", y: 0, h: 520 });
    const textos = pg.camadas.filter((c) => c.tipo === "texto" && c.ref);
    for (const t of textos) expect(t.y).toBeGreaterThanOrEqual(img.y + img.h);
    const svg = paginaParaSvg(r.pacote, "A", 1, m);
    expect(svg).toContain(`<path d="${caminhoMascara("diagonal", img.w, img.h, img.x, img.y)}"/>`);
    // Canvas tracing uses the same commands
    const ops: string[] = [];
    tracarMascara({ beginPath: () => undefined, moveTo: (x, y) => ops.push(`M${x} ${y}`), lineTo: (x, y) => ops.push(`L${x} ${y}`), quadraticCurveTo: (a, b, c, d) => ops.push(`Q${a} ${b} ${c} ${d}`), closePath: () => ops.push("Z") }, "diagonal", img.w, img.h);
    expect(ops.join("")).toBe(caminhoMascara("diagonal", img.w, img.h));
    // Fotográfico drops the mask (full-bleed)
    const f = aplicarModelo(r.pacote, "fotografico", est("fotografico").paleta, est("fotografico").par, ["A"], m);
    expect(f.pacote.variantes.A.paginas[1].camadas.find((c) => c.id === "img2")).toMatchObject({ mascara: undefined });
  });

  it("nota manual com pouco contraste é detetada; «Adaptar cor» só muda essa nota; sem aceitar, a cor fica", () => {
    const r = aplicarModelo(pacote(), "contraste", est("contraste").paleta, est("contraste").par, ["A"], m);
    const d = r.pacote.variantes.A;
    // capa do Contraste é preta: a nota #123456 fica ilegível
    const notas = notasIlegiveis(d);
    expect(notas.some((n) => n.pagina === 0 && n.id === "nota0")).toBe(true);
    expect(notas.every((n) => n.razao < n.minimo)).toBe(true);
    expect(d.paginas[0].camadas.find((c) => c.id === "nota0")).toMatchObject({ estilo: { cor: "#123456" } });
    const a = adaptarCorNotas(d, notas);
    expect(notasIlegiveis(a)).toEqual([]);
    a.paginas.forEach((pg, i) => pg.camadas.forEach((c, j) => {
      const antes = d.paginas[i].camadas[j];
      if (!notas.some((n) => n.pagina === i && n.id === c.id)) expect(c).toEqual(antes);
    }));
  });

  it("marcador «Imagem por escolher» é detetado; o rascunho de teste leva marca de água sem alterar o documento", () => {
    const r = aplicarModelo(pacote(), "fotografico", est("fotografico").paleta, est("fotografico").par, ["A"], m);
    const d = r.pacote.variantes.A;
    expect(paginasComMarcador(d)).toEqual([1, 2, 3, 4, 5]);
    const copia = JSON.stringify(d);
    const t = comMarcaRascunho(d);
    expect(JSON.stringify(d)).toBe(copia);
    expect(t.paginas.every((p) => p.camadas.some((c) => c.id === "rascunho-texto"))).toBe(true);
    const ed = aplicarModelo(pacote(), "editorial", est("editorial").paleta, est("editorial").par, ["A"], m).pacote.variantes.A;
    expect(paginasComMarcador(ed)).toEqual([]);
    expect(comMarcaRascunho(ed)).toEqual(ed);
  });

  it("gera PNG pelo caminho do servidor para capitular, recorte, Black 900, gradiente, ícones e rascunho de teste", async () => {
    mkdirSync(DIR, { recursive: true });
    const p = pacote(true);
    p.assets = { foto: { id: "foto", mime: "image/png", largura: 1200, altura: 800, dados: await foto() } };
    p.variantes.A.paginas[1].camadas.push({ id: "img2", tipo: "imagem", asset_id: "foto", recorte: "cover", x: 100, y: 100, w: 300, h: 300, z: 1 });
    const casos: Array<[string, PacoteProva, number]> = [];
    for (const e of ESTILOS) for (const i of [1, 2]) casos.push([e.id, aplicarModelo(p, e.id, e.paleta, e.par, ["A"], m).pacote, i]);
    const semImg = aplicarModelo(pacote(), "fotografico", est("fotografico").paleta, est("fotografico").par, ["A"], m).pacote;
    casos.push(["fotografico-rascunho-teste", { ...semImg, variantes: { ...semImg.variantes, A: comMarcaRascunho(semImg.variantes.A) } }, 2]);
    for (const [nome, pk, i] of casos) {
      const b = await png(paginaParaSvg(pk, "A", i, m));
      expect(b.length).toBeGreaterThan(1000);
      writeFileSync(`${DIR}/${nome}-slide${i + 1}.png`, b);
    }
    writeFileSync("/tmp/fixture-fecho.json", JSON.stringify(Object.fromEntries(casos.filter((c) => c[2] === 1).map((c) => [c[0], c[1]]))));
  }, 60_000);
});
