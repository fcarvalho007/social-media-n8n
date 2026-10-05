import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "opentype.js";
import { initWasm, Resvg } from "@resvg/resvg-wasm";
import {
  colisoes, criarMedidor, paginaParaSvg, transbordos, validarPacote,
  type Familia, type FonteOT, type PacoteProva, type Pagina, type Peso,
} from "../../supabase/functions/_shared/documento-grafico/nucleo";
import { ESTILOS } from "../../supabase/functions/_shared/motor/estilos";
import { aplicarModelo, comporModelo } from "../../supabase/functions/_shared/motor/modelos";
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
const assinatura = (p: Pagina) => p.camadas.filter((c) => c.id.startsWith("mod-") || c.tipo === "texto").map((c) => `${c.id}:${c.x},${c.y},${c.w}`).join("|");

describe("seis modelos de composição", () => {
  it("geram composições geometricamente diferentes (não só cores)", () => {
    const sigs = ESTILOS.map((e) => assinatura(aplicarModelo(pacote(), e.id, e.paleta, e.par, ["A"], m).pacote.variantes.A.paginas[1]));
    expect(new Set(sigs).size).toBe(6);
  });

  it("preservam texto, ids, refs, ordem e camadas manuais; nada transborda nem colide", () => {
    for (const longo of [false, true]) for (const e of ESTILOS) {
      const base = pacote(longo);
      const r = aplicarModelo(base, e.id, e.paleta, e.par, ["A", "B"], m);
      expect(r.pacote.conteudo).toEqual(base.conteudo);
      expect(() => validarPacote(JSON.parse(JSON.stringify(r.pacote)))).not.toThrow();
      for (const v of ["A", "B"] as const) {
        expect([e.id, transbordos(r.pacote, v, m)]).toEqual([e.id, []]);
        expect(r.pacote.variantes[v].paginas.map((p) => p.id)).toEqual(base.variantes[v].paginas.map((p) => p.id));
        r.pacote.variantes[v].paginas.forEach((p, i) => {
          const refs = p.camadas.filter((c) => c.tipo === "texto" && c.ref).map((c) => c.id).sort();
          expect(refs).toEqual([`b${i}`, `t${i}`]);
          const nota = p.camadas.find((c) => c.id === `nota${i}`);
          expect(nota).toEqual(base.variantes[v].paginas[i].camadas[4]);
        });
        expect(colisoes(r.pacote, v, m)).toEqual([]);
      }
    }
  });

  it("título grande e corpo legível no telemóvel", () => {
    for (const e of ESTILOS) {
      const p = aplicarModelo(pacote(), e.id, e.paleta, e.par, ["A"], m).pacote.variantes.A.paginas[1];
      const t = p.camadas.find((c) => c.id === "t1")!, b = p.camadas.find((c) => c.id === "b1")!;
      if (t.tipo !== "texto" || b.tipo !== "texto") throw new Error();
      expect(t.estilo.tam).toBeGreaterThanOrEqual(80);
      expect(b.estilo.tam).toBeGreaterThanOrEqual(36);
    }
  });

  it("aplicar só ao slide 3 deixa os restantes slides e a outra variante intactos", () => {
    const base = pacote();
    const e = ESTILOS.find((x) => x.id === "revista")!;
    const r = aplicarModelo(base, e.id, e.paleta, e.par, ["A"], m, [2]);
    base.variantes.A.paginas.forEach((p, i) => { if (i !== 2) expect(r.pacote.variantes.A.paginas[i]).toBe(p); });
    expect(r.pacote.variantes.A.paginas[2]).not.toEqual(base.variantes.A.paginas[2]);
    expect(r.pacote.variantes.B).toBe(base.variantes.B);
  });

  it("recusa (sem cortar) quando o texto não cabe no mínimo legível", () => {
    const base = pacote();
    base.conteudo.slides[2] = { ...base.conteudo.slides[2], texto: "Texto muito longo. ".repeat(120) };
    const e = ESTILOS[0];
    const r = aplicarModelo(base, e.id, e.paleta, e.par, ["A"], m);
    expect(r.recusadas).toEqual([{ variante: "A", pagina: 2 }]);
    expect(r.pacote.variantes.A.paginas[2]).toBe(base.variantes.A.paginas[2]);
  });

  it("Fotográfico sem imagem usa marcador explícito; com imagem reutiliza o recurso existente", () => {
    const e = ESTILOS.find((x) => x.id === "fotografico")!;
    const sem = aplicarModelo(pacote(), e.id, e.paleta, e.par, ["A"], m);
    expect(sem.marcador).toBe(true);
    expect(sem.pacote.variantes.A.paginas[1].camadas.some((c) => c.id === "mod-ph-rotulo")).toBe(true);
    const com = pacote();
    com.assets = { foto: { id: "foto", mime: "image/png", largura: 2, altura: 2, dados: "iVBORw0KGgo=" } };
    const p = comporModelo(com.variantes.A.paginas[1], "fotografico", { indice: 1, total: 5, paleta: e.paleta, par: e.par, conteudo: com.conteudo, assets: com.assets, m })!;
    const img = p.pagina.camadas.find((c) => c.tipo === "imagem");
    expect(img).toMatchObject({ asset_id: "foto", x: 0, y: 0, w: 1080, h: 1350 });
    expect(p.marcador).toBe(false);
  });

  it("exporta PNG pelo mesmo caminho do servidor (capturas das seis composições)", async () => {
    await initWasm(readFileSync("node_modules/@resvg/resvg-wasm/index_bg.wasm"));
    const fontes = [
      "/fontes/WorkSans-Regular.ttf", "/fontes/WorkSans-Bold.ttf",
      ...Object.values(FICHEIROS_EXTRA).flatMap((x) => Object.values(x ?? {}) as string[]),
    ].map((f) => new Uint8Array(readFileSync(`public${f}`)));
    const dir = "/mnt/documents/qa-modelos";
    mkdirSync(dir, { recursive: true });
    for (const longo of [false, true]) for (const e of ESTILOS) {
      const r = aplicarModelo(pacote(longo), e.id, e.paleta, e.par, ["A"], m);
      for (const i of [0, 2]) {
        const svg = paginaParaSvg(r.pacote, "A", i, m);
        const png = new Resvg(svg, { font: { fontBuffers: fontes, loadSystemFonts: false, defaultFontFamily: "Work Sans" } }).render().asPng();
        expect(png.length).toBeGreaterThan(1000);
        writeFileSync(`${dir}/${e.id}-${longo ? "longo" : "curto"}-slide${i + 1}.png`, png);
      }
    }
  }, 60_000);
});
