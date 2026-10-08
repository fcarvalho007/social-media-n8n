import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "opentype.js";
import { criarMedidor, type FonteOT, type PacoteProva, type Pagina } from "../../supabase/functions/_shared/documento-grafico/nucleo";
import { comporModelo, unidadesSeparaveis, ZONA_STORY } from "../../supabase/functions/_shared/motor/modelos";
import { aplicarSistema, obterPaleta, quebrasPadrao, recolorir, tipografiaElemento, type SistemaVisual } from "../../supabase/functions/_shared/motor/sistema";

const ab = (b: Buffer) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
const ler = (f: string) => parse(ab(readFileSync(`public${f}`))) as unknown as FonteOT;
const m = criarMedidor({ 400: ler("/fontes/WorkSans-Regular.ttf"), 700: ler("/fontes/WorkSans-Bold.ttf") });

const pg = (i: number, sid: string): Pagina => ({ id: `p${i}`, slide: sid, fundo: "#ffffff", camadas: [
  { id: `t${i}`, tipo: "texto", ref: `${sid}.titulo`, x: 96, y: 200, w: 888, h: 300, z: 2, estilo: { peso: 700, tam: 72, linha: 1.1, alinh: "esq", cor: "#111111", overflow: "cortar" } },
  { id: `b${i}`, tipo: "texto", ref: `${sid}.texto`, x: 96, y: 560, w: 888, h: 500, z: 2, estilo: { peso: 400, tam: 40, linha: 1.4, alinh: "esq", cor: "#333333", overflow: "cortar" } },
] });
function pacote(textos: string[], altura: 1350 | 1920 = 1350): PacoteProva {
  const slides = textos.map((t, i) => ({ id: `s${i + 1}`, titulo: i === 0 ? "Capa" : "Três passos", texto: t }));
  const doc = (v: "A" | "B") => ({ v: 1 as const, variante: v, largura: 1080 as const, altura, fonte: "WorkSans@1" as const, ...(altura === 1920 ? { formato: "story" } : {}), paginas: slides.map((s, i) => pg(i, s.id)) });
  return { v: 1, id: "fx", nome: "fx", sintetico: true, conteudo: { slides }, assets: {}, variantes: { A: doc("A"), B: doc("B") } } as PacoteProva;
}
const sis = (x: Partial<SistemaVisual> = {}): SistemaVisual => ({ estilo: "editorial", variante: "A", paleta: "azul", quebras: quebrasPadrao(3), ...x });
const ctx = (p: PacoteProva, i: number, altura = 1350) => ({ indice: i, total: 3, paleta: obterPaleta("azul").cores, par: "montserrat-inter", conteudo: p.conteudo, assets: {}, m, variante: "B" as const, altura });

describe("Didático «Cartões»", () => {
  it("reconhece unidades separáveis e recusa um bloco contínuo", () => {
    expect(unidadesSeparaveis("Medir\nComparar\nDecidir")).toHaveLength(3);
    expect(unidadesSeparaveis("Um só parágrafo contínuo sem passos.")).toBeNull();
  });
  it("cria um cartão por unidade, sem mexer no texto", () => {
    const p = pacote(["", "Medir o ponto de partida\nComparar semanas\nDecidir com dados"]);
    const r = comporModelo(p.variantes.B.paginas[1], "didatico", ctx(p, 1))!;
    expect(r.cabe).toBe(true);
    expect(r.pagina.camadas.filter((c) => /^mod-cartao-\d$/.test(c.id))).toHaveLength(3);
    expect(r.pagina.camadas.find((c) => c.id === "b1")).toMatchObject({ ref: "s2.texto" });
  });
  it("sem unidades separáveis a página é recusada e fica como estava", () => {
    const p = pacote(["", "Um só parágrafo contínuo, sem passos."]);
    const r = comporModelo(p.variantes.B.paginas[1], "didatico", ctx(p, 1))!;
    expect(r.cabe).toBe(false);
    expect(r.pagina).toBe(p.variantes.B.paginas[1]);
  });
});

describe("zonas de leitura das stories", () => {
  it("o texto fica fora dos 250 px de topo e dos 340 px de base em todas as direções", () => {
    const p = pacote(["", "Texto curto de apoio.", "Fecho."], 1920);
    for (const estilo of ["editorial", "impacto", "revista", "fotografico", "didatico"] as const) {
      const res = aplicarSistema(p, sis({ estilo }), m);
      const r = res.pacote;
      // Refused pages stay exactly as they were (reported to the user); only composed pages are checked.
      for (const pag of r.variantes.A.paginas.filter((_, i) => !res.recusadas.some((x) => x.variante === "A" && x.pagina === i))) for (const c of pag.camadas) if (c.tipo === "texto" && c.ref) {
        expect(c.y).toBeGreaterThanOrEqual(ZONA_STORY.topo);
        expect(c.y + c.h).toBeLessThanOrEqual(1920 - ZONA_STORY.base);
      }
    }
  });
});

describe("alcance da direção visual", () => {
  const base = aplicarSistema(pacote(["", "Texto.", "Fecho."]), sis(), m).pacote;
  it("«Esta página» muda só a página escolhida", () => {
    const r = aplicarSistema(base, sis({ estilo: "impacto" }), m, [1], {}, { variantes: ["A"] }).pacote;
    expect(r.variantes.A.paginas[0]).toEqual(base.variantes.A.paginas[0]);
    expect(r.variantes.A.paginas[2]).toEqual(base.variantes.A.paginas[2]);
    expect(r.variantes.A.paginas[1]).not.toEqual(base.variantes.A.paginas[1]);
  });
  it("paleta por página não toca nas outras páginas nem no sistema do documento", () => {
    const r = recolorir(base, "azul", "terracota", { paginas: [1] });
    expect(r.variantes.A.paginas[0]).toEqual(base.variantes.A.paginas[0]);
    expect(r.variantes.A.sistema).toEqual(base.variantes.A.sistema);
  });
  it("elemento selecionado: só essa camada muda de letra", () => {
    const r = tipografiaElemento(base, "A", 1, "t1", { titulo: "playfair", corpo: "inter" });
    const antes = base.variantes.A.paginas[1].camadas, depois = r.variantes.A.paginas[1].camadas;
    depois.forEach((c, k) => (c.id === "t1" ? expect(c.tipo === "texto" && c.estilo.familia).toBe("playfair") : expect(c).toEqual(antes[k])));
  });
});
