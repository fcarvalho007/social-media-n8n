import { describe, expect, it, vi } from "vitest";
import {
  dividirTexto, gerarComReparacao, LIMITES, paragrafoDestaque, slidesDosDestaques, validarCarrossel, verificarLeiturasLiterais,
  TITULO_LEITURA, TITULO_SUBSCRICAO, type DestaqueFonte, type RespostaGerador,
} from "../../supabase/functions/_shared/conteudos/carrossel";

const LONGA = Array.from({ length: 9 }, (_, i) => `Esta é a frase número ${i + 1} da leitura aprovada, que tem de chegar intacta ao carrossel.`).join(" ");
const destaques: DestaqueFonte[] = [
  { titulo: "Primeiro destaque", sintese: "Síntese factual do primeiro.", leitura: LONGA, fonteUrl: "https://tek.sapo.pt/a", publisher: "tek.sapo.pt" },
  { titulo: "Segundo destaque", sintese: "Síntese do segundo.", leitura: "Leitura curta.", fonteUrl: "https://b.pt/b", publisher: "b.pt" },
  { titulo: "Terceiro destaque", sintese: "Síntese do terceiro.", leitura: "Outra leitura.", fonteUrl: "https://c.pt/c", publisher: "c.pt" },
];
const fonte = {
  titulo: "Edição", numero: 319, url: "https://fredericocarvalho.pt/c/", edicaoUrl: "https://hub/edicoes/319",
  paragrafos: ["Crónica 1", "Crónica 2", "Crónica 3", ...destaques.map(paragrafoDestaque)], destaques,
};
const parteIa = (slides = 3, extra: Record<string, unknown> = {}) => JSON.stringify({
  slides: Array.from({ length: slides }, (_, i) => ({ titulo: `T${i}`, texto: `Texto ${i}`, fontes: i ? [1] : [], ...extra })),
  legenda: "Legenda breve.",
});
const deps = (respostas: string[]) => ({
  chamar: vi.fn(async (): Promise<RespostaGerador> => ({ conteudo: respostas.shift() ?? "" })),
  registar: vi.fn(async () => {}),
  parse: (t: string) => JSON.parse(t),
});

describe("carrossel da newsletter com leituras longas", () => {
  it("leitura acima de 360 caracteres é repartida sem cortar nem alterar", () => {
    expect(LONGA.length).toBeGreaterThan(LIMITES.texto);
    const partes = dividirTexto(LONGA, LIMITES.texto - 2);
    expect(partes.length).toBeGreaterThan(1);
    expect(partes.every((p) => p.length <= 358)).toBe(true);
    expect(partes.join(" ")).toBe(LONGA);
  });

  it("frase única maior do que o limite divide por palavras, sem perder texto", () => {
    const frase = "palavra ".repeat(80).trim();
    const partes = dividirTexto(frase, 100);
    expect(partes.every((p) => p.length <= 100)).toBe(true);
    expect(partes.join(" ")).toBe(frase);
  });

  it("slides dos destaques citam o parágrafo do destaque e a leitura completa", () => {
    const slides = slidesDosDestaques(fonte);
    const leitura1 = slides.filter((s) => s.titulo.startsWith(TITULO_LEITURA) && s.fontes[0] === 4);
    expect(leitura1.length).toBeGreaterThan(1);
    expect(leitura1[0].titulo).toBe(`${TITULO_LEITURA} · 1/${leitura1.length}`);
    expect(slides.every((s) => s.texto.length <= LIMITES.texto)).toBe(true);
    expect(slides.find((s) => s.titulo === "Primeiro destaque")?.texto).toContain("Fonte original: tek.sapo.pt");
  });

  it("gera carrossel válido: IA só faz a capa e a crónica, destaques e final vêm do código", async () => {
    const d = deps([parteIa(3)]);
    const c = await gerarComReparacao(fonte, d);
    expect(d.chamar).toHaveBeenCalledTimes(1);
    expect(c.slides.length).toBeGreaterThan(LIMITES.slidesMax);
    expect(c.slides.length).toBeLessThanOrEqual(LIMITES.slidesMaxNewsletter);
    expect(() => validarCarrossel(c, fonte)).not.toThrow();
    expect(() => verificarLeiturasLiterais(c, fonte)).not.toThrow();
    expect(c.slides[c.slides.length - 1].titulo).toBe(TITULO_SUBSCRICAO);
  });

  it("resposta inválida da IA (slide da crónica a citar um destaque) é corrigida uma vez e depois falha", async () => {
    const invalida = JSON.stringify({ slides: [{ titulo: "C", texto: "x", fontes: [] }, { titulo: "A", texto: "y", fontes: [4] }, { titulo: "B", texto: "z", fontes: [1] }], legenda: "L" });
    const d = deps([invalida, parteIa(3, { texto: "w".repeat(400) })]);
    await expect(gerarComReparacao(fonte, d)).rejects.toThrow("após uma correção");
    expect(d.chamar).toHaveBeenCalledTimes(2);
    expect(d.registar).toHaveBeenCalledTimes(2);
  });

  it("leitura alterada num slide é detetada", async () => {
    const c = await gerarComReparacao(fonte, deps([parteIa(3)]));
    const i = c.slides.findIndex((s) => s.titulo.startsWith(TITULO_LEITURA));
    c.slides[i] = { ...c.slides[i], texto: "«Texto reescrito.»" };
    expect(() => verificarLeiturasLiterais(c, fonte)).toThrow("literal");
  });

  it("leituras que não cabem em 20 slides falham antes de qualquer chamada paga", async () => {
    const enorme = { ...destaques[0], leitura: "Frase longa de leitura aprovada. ".repeat(200) };
    const ds = [enorme, destaques[1], destaques[2]];
    const f = { ...fonte, destaques: ds, paragrafos: ["Crónica", ...ds.map(paragrafoDestaque)] };
    const d = deps([parteIa(3)]);
    await expect(gerarComReparacao(f, d)).rejects.toThrow("não sobra espaço");
    expect(d.chamar).not.toHaveBeenCalled();
  });
});

describe("slide da crónica demasiado longo vindo da IA", () => {
  it("é repartido em slides seguidos, com o texto completo, sem nova chamada", async () => {
    const longo = "Primeira frase do argumento da crónica, com algum detalhe. ".repeat(10).trim();
    const resp = JSON.stringify({ slides: [{ titulo: "Capa", texto: "Edição 319", fontes: [] }, { titulo: "Argumento", texto: longo, fontes: [1] }, { titulo: "Implicação", texto: "Curto.", fontes: [2] }], legenda: "L" });
    const d = deps([resp]);
    const c = await gerarComReparacao(fonte, d);
    expect(d.chamar).toHaveBeenCalledTimes(1);
    const arg = c.slides.filter((s) => s.titulo.startsWith("Argumento"));
    expect(arg.length).toBeGreaterThan(1);
    expect(arg.map((s) => s.texto).join(" ")).toBe(longo);
    expect(c.slides.every((s) => s.texto.length <= LIMITES.texto)).toBe(true);
  });
});
