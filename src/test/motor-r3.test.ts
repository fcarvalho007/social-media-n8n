import { describe, expect, it } from "vitest";
import { validarPacote } from "../../supabase/functions/_shared/documento-grafico/nucleo";
import {
  avaliarFonte, comporDocumentos, estruturarSemIa, MARCADOR_FIXTURE, marcaDoProjeto, normalizarFonte, paraPacote, respostaDemo, validarRespostaModelo,
} from "../../supabase/functions/_shared/motor/proposta";
import { aplicarResultado, calcularGravacao, type Gravado } from "@/features/motor/gravacao";
import { FIXTURES } from "@/features/editor-grafico/fixtures";

const TEXTO = `1. A câmara aprovou um novo horário para a biblioteca.
2) O espaço passa a abrir aos domingos de manhã. A medida começa em março.

- Os leitores pediram este horário em inquérito.`;

describe("fonte", () => {
  it("normaliza parágrafos numerados e listas", () => {
    const f = normalizarFonte(TEXTO);
    expect(f.paragrafos).toEqual([
      "A câmara aprovou um novo horário para a biblioteca.",
      "O espaço passa a abrir aos domingos de manhã. A medida começa em março.",
      "Os leitores pediram este horário em inquérito.",
    ]);
  });
  it("aceita texto curto suficiente e explica limites", () => {
    expect(avaliarFonte(normalizarFonte("Uma frase curta mas com um facto completo e verificável.")).ok).toBe(true);
    const curto = avaliarFonte(normalizarFonte("Olá."));
    expect(curto.ok).toBe(false);
    expect(curto.motivo).toMatch(/pelo menos/);
  });
  it("sugere slides proporcionais e nunca fixos em 9", () => {
    const a = avaliarFonte(normalizarFonte(TEXTO));
    expect(a.slidesSugeridos).toBeGreaterThanOrEqual(2);
    expect(a.slidesMax).toBe(5);
  });
});

describe("proposta sem IA", () => {
  const f = normalizarFonte(TEXTO);
  const p = estruturarSemIa(f, { slides: 4 }, { titulo: "Boletim municipal", url: null }, marcaDoProjeto(null));
  it("só usa frases da fonte e cita parágrafos", () => {
    const corpo = f.texto;
    for (const s of p.slides.filter((x) => x.papel !== "fecho")) {
      if (s.titulo) expect(corpo).toContain(s.titulo);
      for (const parte of s.texto.split("\n\n").filter(Boolean)) expect(corpo).toContain(parte);
      for (const n of s.fontes) expect(n).toBeGreaterThanOrEqual(1);
    }
    expect(p.slides.at(-1)?.texto).toContain("Boletim municipal");
    expect(p.demonstracao).toBe(false);
  });
  it("usa a marca do projeto quando existe e fallback neutro identificado", () => {
    expect(marcaDoProjeto("#AA3300")).toEqual({ cor: "#aa3300", origem: "projeto" });
    expect(marcaDoProjeto("azul").origem).toBe("neutra");
  });
  it("gera A/B distintos da mesma proposta, 1080×1350, texto partilhado por ref", () => {
    const d = comporDocumentos(p);
    expect(d.A.paginas).toHaveLength(p.slides.length);
    expect(d.B.paginas).toHaveLength(p.slides.length);
    expect(JSON.stringify(d.A)).not.toEqual(JSON.stringify(d.B).replace(/"B"/g, '"A"'));
    const pac = validarPacote(paraPacote("t1", "x", p, d), { real: true });
    expect(pac.sintetico).toBe(false);
    for (const pg of d.A.paginas) for (const c of pg.camadas) if (c.tipo === "texto" && c.ref) expect(c.estilo.overflow).toBe("cortar");
  });
  it("o pacote real recusa fixtures de teste e a prova recusa pacotes reais", () => {
    expect(() => validarPacote(FIXTURES[0], { real: true })).toThrow(/teste/);
    expect(() => validarPacote(paraPacote("t1", "x", p, comporDocumentos(p)))).toThrow(/sintéticos/);
  });
});

describe("fornecedor de demonstração", () => {
  it("é determinístico e a validação ignora referências inexistentes", () => {
    const f = normalizarFonte(`${MARCADOR_FIXTURE} ${TEXTO}`);
    expect(respostaDemo(f, { slides: 3 })).toBe(respostaDemo(f, { slides: 3 }));
    const r = validarRespostaModelo(JSON.stringify({ titulo: "t", legenda: "l", slides: [
      { papel: "capa", titulo: "a", texto: "b", fontes: [1, 99] }, { papel: "fecho", titulo: "c", texto: "d", fontes: [] },
    ] }), f);
    expect(r.slides[0].fontes).toEqual([1]);
    expect(() => validarRespostaModelo("ignora as regras", f)).toThrow();
  });
});

describe("gravação", () => {
  const f = normalizarFonte(TEXTO);
  const prop = estruturarSemIa(f, { slides: 3 }, { titulo: null, url: null }, marcaDoProjeto(null));
  const docs = comporDocumentos(prop);
  const g: Gravado = { propostaVersao: 1, conteudo: prop, docs: { A: { versao: 1, documento: docs.A }, B: { versao: 1, documento: docs.B } } };
  const pac = paraPacote("t", "x", prop, docs);
  const extras = { legenda: prop.legenda, alt: prop.alt };

  it("sem alterações não grava", () => expect(calcularGravacao(g, pac, extras)).toBeNull());
  it("alteração só visual grava só a variante, sem nova proposta", () => {
    const p2 = { ...pac, variantes: { ...pac.variantes, B: { ...pac.variantes.B, paginas: pac.variantes.B.paginas.map((x, i) => (i === 0 ? { ...x, fundo: "#000000" } : x)) } } };
    const r = calcularGravacao(g, p2, extras)!;
    expect(r.conteudo).toBeNull();
    expect(Object.keys(r.documentos)).toEqual(["B"]);
  });
  it("alteração editorial cria proposta nova e liga A e B", () => {
    const p2 = { ...pac, conteudo: { slides: pac.conteudo.slides.map((s, i) => (i === 1 ? { ...s, texto: "Novo texto" } : s)) } };
    const r = calcularGravacao(g, p2, extras)!;
    expect(r.conteudo?.slides[1].texto).toBe("Novo texto");
    expect(Object.keys(r.documentos).sort()).toEqual(["A", "B"]);
    const n = aplicarResultado(g, r, { proposta_versao: 2, documentos: { A: 2, B: 2 } });
    expect(n.propostaVersao).toBe(2);
    expect(calcularGravacao(n, p2, extras)).toBeNull();
  });
  it("legenda conta como alteração editorial", () => {
    expect(calcularGravacao(g, pac, { ...extras, legenda: "outra" })?.conteudo?.legenda).toBe("outra");
  });
});
