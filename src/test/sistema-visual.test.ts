import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "opentype.js";
import { criarMedidor, transbordos, type FonteOT, type PacoteProva, type Pagina } from "../../supabase/functions/_shared/documento-grafico/nucleo";
import { ESTILOS } from "../../supabase/functions/_shared/motor/estilos";
import { aplicarSistema, PALETAS, PALETAS_PRINCIPAIS, quebrasPadrao, recolorir, sistemaPadrao, slidesQuebra, tipografiaDe, type SistemaVisual } from "../../supabase/functions/_shared/motor/sistema";
import { consultarLeitura } from "../../supabase/functions/_shared/motor/leitura";

const ab = (b: Buffer) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
const ler = (f: string) => parse(ab(readFileSync(`public${f}`))) as unknown as FonteOT;
const m = criarMedidor({ 400: ler("/fontes/WorkSans-Regular.ttf"), 700: ler("/fontes/WorkSans-Bold.ttf") });

function pagina(i: number, sid: string): Pagina {
  return { id: `p${i}`, slide: sid, fundo: "#ffffff", camadas: [
    { id: `t${i}`, tipo: "texto", ref: `${sid}.titulo`, x: 96, y: 200, w: 888, h: 300, z: 2, estilo: { peso: 700, tam: 72, linha: 1.1, alinh: "esq", cor: "#111111", overflow: "cortar" } },
    { id: `b${i}`, tipo: "texto", ref: `${sid}.texto`, x: 96, y: 560, w: 888, h: 500, z: 2, estilo: { peso: 400, tam: 40, linha: 1.4, alinh: "esq", cor: "#333333", overflow: "cortar" } },
    { id: `nota${i}`, tipo: "texto", texto: "Nota manual", x: 700, y: 1250, w: 280, h: 50, z: 4, estilo: { peso: 400, tam: 28, linha: 1.2, alinh: "esq", cor: "#123456", overflow: "cortar" } },
  ] };
}
function pacote(n = 8): PacoteProva {
  const slides = Array.from({ length: n }, (_, i) => ({ id: `s${i + 1}`, titulo: "Estratégia antes da ferramenta", texto: "Escolher a ferramenta primeiro custa tempo (§2)." }));
  const doc = (v: "A" | "B") => ({ v: 1 as const, variante: v, largura: 1080 as const, altura: 1350 as const, fonte: "WorkSans@1" as const, paginas: slides.map((s, i) => pagina(i, s.id)) });
  return { v: 1, id: "fx", nome: "fx", sintetico: true, conteudo: { slides }, assets: {}, variantes: { A: doc("A"), B: doc("B") } };
}
const geo = (p: Pagina) => p.camadas.map((c) => `${c.id}:${c.x},${c.y},${c.w},${c.h}`).join("|");
const sis = (estilo: SistemaVisual["estilo"], extra: Partial<SistemaVisual> = {}): SistemaVisual => ({ estilo, variante: "A", paleta: "navy-editorial", quebras: quebrasPadrao(8), ...extra });

describe("sistema visual", () => {
  it("quebras por omissão nos slides 3, 5 e último; nunca na capa", () => {
    expect(slidesQuebra(8)).toEqual([3, 5, 8]);
    expect(slidesQuebra(4)).toEqual([3, 4]);
    expect(quebrasPadrao(1)).toEqual({});
  });

  it("é determinístico: Design e Composição produzem o mesmo resultado", () => {
    for (const e of ESTILOS) expect(JSON.stringify(aplicarSistema(pacote(), sis(e.id), m).pacote)).toBe(JSON.stringify(aplicarSistema(pacote(), sis(e.id), m).pacote));
  });

  it("variante A e B têm composições diferentes em cada estilo, sem transbordar nem mudar texto", () => {
    for (const e of ESTILOS) {
      const base = pacote();
      const r = aplicarSistema(base, sis(e.id), m).pacote;
      expect(geo(r.variantes.A.paginas[1])).not.toBe(geo(r.variantes.B.paginas[1]));
      expect(r.conteudo).toEqual(base.conteudo);
      for (const v of ["A", "B"] as const) {
        expect([e.id, v, transbordos(r, v, m)]).toEqual([e.id, v, []]);
        r.variantes[v].paginas.forEach((p, i) => expect(p.camadas.find((c) => c.id === `nota${i}`)).toEqual(base.variantes[v].paginas[i].camadas[2]));
      }
    }
  });

  it("trocar a paleta só muda cores (geometria igual)", () => {
    const [a, b] = [PALETAS[0], PALETAS[2]].map((pl) => aplicarSistema(pacote(), sis("editorial", { paleta: pl.id }), m).pacote);
    expect(a.variantes.A.paginas.map(geo)).toEqual(b.variantes.A.paginas.map(geo));
    expect(a.variantes.A.paginas[1].fundo).not.toBe(b.variantes.A.paginas[1].fundo);
  });

  it("desligar a quebra do slide 5 só altera essa página", () => {
    const on = aplicarSistema(pacote(), sis("contraste"), m).pacote;
    const off = aplicarSistema(pacote(), sis("contraste", { quebras: { "3": true, "5": false, "8": true } }), m).pacote;
    on.variantes.A.paginas.forEach((p, i) => (i === 4 ? expect(JSON.stringify(off.variantes.A.paginas[i])).not.toBe(JSON.stringify(p)) : expect(off.variantes.A.paginas[i]).toEqual(p)));
  });

  it("avisa quando a capa tem mais do que uma frase curta", () => {
    const c = consultarLeitura([{ id: "s1", papel: "capa", titulo: "Visibilidade de IA", texto: "A análise mostra uma subida de tráfego direto. Isto levanta questões sobre o impacto real." }]);
    expect(c.some((x) => x.tipo === "capa_longa" && x.acao === "Capa: encurta para uma frase.")).toBe(true);
  });
});

describe("tipografia e paleta independentes da direção", () => {
  const familias = (p: Pagina) => p.camadas.filter((c) => c.tipo === "texto" && !!c.ref).map((c) => c.tipo === "texto" ? c.estilo.familia : "").join("|");
  const cores = (p: Pagina) => [p.fundo, ...p.camadas.map((c) => (c.tipo === "imagem" ? "" : c.estilo.cor))].join("|");
  it("conteúdo novo usa Montserrat + Inter em qualquer direção", () => {
    expect(sistemaPadrao(8).tipografia).toEqual({ titulo: "montserrat", corpo: "inter" });
    const r = aplicarSistema(pacote(), { ...sistemaPadrao(8), estilo: "editorial" }, m).pacote;
    const t = r.variantes.A.paginas[1].camadas.find((c) => c.tipo === "texto" && c.ref?.endsWith(".titulo"));
    expect(t?.tipo === "texto" && t.estilo.familia).toBe("montserrat");
  });
  it("trocar Editorial por Revista mantém fonte e paleta escolhidas", () => {
    const tipografia = { titulo: "grotesk" as const, corpo: "inter" as const };
    const a = aplicarSistema(pacote(), sis("editorial", { tipografia, paleta: "terracota" }), m).pacote;
    const b = aplicarSistema(pacote(), sis("revista", { tipografia, paleta: "terracota" }), m).pacote;
    expect(a.variantes.A.sistema?.tipografia).toEqual(tipografia);
    expect(b.variantes.A.sistema).toMatchObject({ tipografia, paleta: "terracota" });
    for (const p of b.variantes.A.paginas) for (const f of familias(p).split("|")) expect(["grotesk", "inter"]).toContain(f);
  });
  it("trocar a fonte mantém a paleta (cores iguais)", () => {
    const a = aplicarSistema(pacote(), sis("editorial", { paleta: "salvia", tipografia: { titulo: "montserrat", corpo: "inter" } }), m).pacote;
    const b = aplicarSistema(pacote(), sis("editorial", { paleta: "salvia", tipografia: { titulo: "plex", corpo: "plex" } }), m).pacote;
    expect(b.variantes.A.paginas.map(cores)).toEqual(a.variantes.A.paginas.map(cores));
    expect(familias(b.variantes.A.paginas[1])).not.toBe(familias(a.variantes.A.paginas[1]));
  });
  it("azul → vermelho mantém fontes e posições", () => {
    const tipografia = { titulo: "montserrat" as const, corpo: "inter" as const };
    const a = aplicarSistema(pacote(), sis("editorial", { paleta: "azul", tipografia }), m).pacote;
    const b = recolorir(a, "azul", "terracota");
    expect(b.variantes.A.paginas.map(geo)).toEqual(a.variantes.A.paginas.map(geo));
    expect(b.variantes.A.paginas.map(familias)).toEqual(a.variantes.A.paginas.map(familias));
    expect(b.variantes.A.paginas[1].fundo).not.toBe(a.variantes.A.paginas[1].fundo);
  });
  it("documentos antigos sem tipografia mantêm o par do estilo", () => {
    expect(tipografiaDe({ estilo: "editorial" })).toEqual({ titulo: "playfair", corpo: "sourcesans" });
  });
  it("as cinco famílias de paleta têm fundos fortes distintos", () => {
    expect(new Set(PALETAS_PRINCIPAIS.map((p) => p.cores.fundoCapa)).size).toBe(5);
  });
});
