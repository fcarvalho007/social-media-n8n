import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "opentype.js";
import { criarMedidor, validarPacote, type FonteOT, type PacoteProva, type Pagina } from "../../supabase/functions/_shared/documento-grafico/nucleo";
import { aplicarSistema, recolorir, sistemaPadrao, type SistemaVisual } from "../../supabase/functions/_shared/motor/sistema";
import { aplicarEfeitos, efeitosAtivos } from "../../supabase/functions/_shared/motor/efeitos";
import { aplicarCandidato, assinatura, hashConteudo, redesenharPagina } from "../../supabase/functions/_shared/motor/redesenhar";
import { obterPaleta } from "../../supabase/functions/_shared/motor/sistema";

const ab = (b: Buffer) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
const ler = (f: string) => parse(ab(readFileSync(`public${f}`))) as unknown as FonteOT;
const m = criarMedidor({ 400: ler("/fontes/WorkSans-Regular.ttf"), 700: ler("/fontes/WorkSans-Bold.ttf") });
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function pagina(i: number, sid: string, img: boolean): Pagina {
  return { id: `p${i}`, slide: sid, fundo: "#ffffff", camadas: [
    ...(img ? [{ id: `img${i}`, tipo: "imagem" as const, asset_id: "foto", x: 0, y: 0, w: 1080, h: 1350, z: 1, recorte: "cover" as const }] : []),
    { id: `t${i}`, tipo: "texto", ref: `${sid}.titulo`, x: 96, y: 200, w: 888, h: 300, z: 2, estilo: { peso: 700, tam: 72, linha: 1.1, alinh: "esq", cor: "#111111", overflow: "cortar" } },
    { id: `b${i}`, tipo: "texto", ref: `${sid}.texto`, x: 96, y: 560, w: 888, h: 500, z: 2, estilo: { peso: 400, tam: 40, linha: 1.4, alinh: "esq", cor: "#333333", overflow: "cortar" } },
  ] };
}
function pacote(img = true, n = 4): PacoteProva {
  const slides = Array.from({ length: n }, (_, i) => ({ id: `s${i + 1}`, titulo: "Estratégia antes da ferramenta", texto: "Escolher a ferramenta primeiro custa tempo." }));
  const doc = (v: "A" | "B") => ({ v: 1 as const, variante: v, largura: 1080 as const, altura: 1350 as const, fonte: "WorkSans@1" as const, paginas: slides.map((s, i) => pagina(i, s.id, img)) });
  return { v: 1, id: "fx", nome: "fx", sintetico: true, conteudo: { slides }, assets: { foto: { id: "foto", mime: "image/png", largura: 1080, altura: 1350, dados: PNG } }, variantes: { A: doc("A"), B: doc("B") } };
}
const sis = (estilo: SistemaVisual["estilo"]): SistemaVisual => ({ ...sistemaPadrao(4, estilo), quebras: {} });
const fx = (p: Pagina) => p.camadas.filter((c) => c.id.startsWith("fx-"));

describe("efeitos como tokens do estilo", () => {
  it("Editorial não herda brilho, grelha, linhas de textura nem cantos", () => {
    const a = efeitosAtivos("editorial");
    expect([a.glow, a.grid, a.scanlines, a.corners, a.particulas]).toEqual([false, false, false, false, false]);
    const r = aplicarSistema(pacote(), sis("editorial"), m).pacote;
    for (const pg of r.variantes.A.paginas) expect(fx(pg).some((c) => /fx-(glow|grelha|scan|canto)/.test(c.id))).toBe(false);
  });
  it("Contraste tem grelha/cantos; Fotográfico mantém tratamento da imagem e full bleed", () => {
    const c = aplicarSistema(pacote(false), sis("contraste"), m).pacote.variantes.A.paginas[1];
    expect(fx(c).some((x) => x.id.startsWith("fx-canto"))).toBe(true);
    const f = aplicarSistema(pacote(), sis("fotografico"), m).pacote.variantes.A.paginas[0];
    const img = f.camadas.find((x) => x.tipo === "imagem")!;
    expect(img.w).toBeGreaterThanOrEqual(1026);
    expect(fx(f).some((x) => x.id === "fx-tom")).toBe(true);
  });
  it("paleta muda só cores dos efeitos, nunca geometria ou intensidade", () => {
    const a = aplicarSistema(pacote(false), sis("contraste"), m).pacote;
    const b = recolorir(a, a.variantes.A.sistema!.paleta as "azul", "navy-signal");
    const ga = fx(a.variantes.A.paginas[1]), gb = fx(b.variantes.A.paginas[1]);
    expect(gb.map((c) => [c.id, c.x, c.y, c.w, c.h, c.opacidade, c.tipo === "forma" ? c.estilo.intensidade : 0])).toEqual(ga.map((c) => [c.id, c.x, c.y, c.w, c.h, c.opacidade, c.tipo === "forma" ? c.estilo.intensidade : 0]));
    const glowA = ga.find((c) => c.id === "fx-glow"), glowB = gb.find((c) => c.id === "fx-glow");
    if (glowA && glowB && glowA.tipo === "forma" && glowB.tipo === "forma") expect(glowB.estilo.cor).not.toBe(glowA.estilo.cor);
  });
  it("idempotente, respeita o limite de camadas e o documento continua válido", () => {
    const pg = pacote().variantes.A.paginas[0];
    const p = obterPaleta("navy-digital").cores;
    const um = aplicarEfeitos(pg, "contraste", p), dois = aplicarEfeitos(um, "contraste", p);
    expect(dois).toEqual(um);
    expect(um.camadas.length).toBeLessThanOrEqual(60);
    expect(() => validarPacote(aplicarSistema(pacote(), sis("contraste"), m).pacote)).not.toThrow();
  });
  it("capa com fotografias de origens diferentes tem exactamente o mesmo layout e efeitos", () => {
    const p = pacote();
    const q: PacoteProva = { ...p, assets: { foto: { ...p.assets.foto, dados: PNG + "" } } };
    const a = aplicarSistema(p, sis("fotografico"), m).pacote.variantes.A.paginas[0];
    const b = aplicarSistema(q, sis("fotografico"), m).pacote.variantes.A.paginas[0];
    expect(b).toEqual(a);
  });
});

describe("redesenhar slide", () => {
  const p0 = aplicarSistema(pacote(), sis("editorial"), m).pacote;
  it("5 propostas distintas, conteúdo e papel intactos", () => {
    const { candidatos } = redesenharPagina({ pacote: p0, sistema: sis("editorial"), variante: "A", indice: 1, m, incluirIA: false });
    expect(candidatos.length).toBe(5);
    expect(candidatos.filter((c) => c.disruptiva)).toHaveLength(2);
    const h0 = hashConteudo(p0.variantes.A.paginas[1], p0.conteudo);
    for (const c of candidatos) { expect(hashConteudo(c.pagina, p0.conteudo)).toBe(h0); expect(c.pagina.papel).toBe(p0.variantes.A.paginas[1].papel); }
    expect(new Set(candidatos.map((c) => assinatura(c.pagina))).size).toBe(5);
  });
  it("garante cinco propostas, incluindo duas disruptivas, mesmo sem imagens", () => {
    const semImagem = aplicarSistema(pacote(false), sis("editorial"), m).pacote;
    const { candidatos } = redesenharPagina({ pacote: semImagem, sistema: sis("editorial"), variante: "A", indice: 1, m, incluirIA: false });
    expect(candidatos).toHaveLength(5);
    expect(candidatos.filter((c) => c.disruptiva)).toHaveLength(2);
    expect(new Set(candidatos.map((c) => assinatura(c.pagina))).size).toBe(5);
  });
  it("gerar não altera o documento; aplicar muda só a página escolhida", () => {
    const antes = JSON.stringify(p0);
    const { candidatos } = redesenharPagina({ pacote: p0, sistema: sis("editorial"), variante: "A", indice: 1, m });
    expect(JSON.stringify(p0)).toBe(antes);
    const depois = aplicarCandidato(p0, "A", 1, candidatos[0]);
    depois.variantes.A.paginas.forEach((pg, i) => { if (i !== 1) expect(pg).toBe(p0.variantes.A.paginas[i]); });
    expect(depois.variantes.B).toBe(p0.variantes.B);
    expect(depois.conteudo).toBe(p0.conteudo);
    expect(() => validarPacote(depois)).not.toThrow();
  });
  it("explorar livremente não muda o estilo global", () => {
    const { candidatos } = redesenharPagina({ pacote: p0, sistema: sis("editorial"), variante: "A", indice: 1, m, modo: "explorar" });
    const d = aplicarCandidato(p0, "A", 1, candidatos[0]);
    expect(d.variantes.A.sistema?.estilo).toBe(p0.variantes.A.sistema?.estilo);
  });
});
