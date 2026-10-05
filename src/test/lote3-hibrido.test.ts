import { describe, it, expect, beforeEach } from "vitest";
import { aplicarTextoNaProposta } from "../../supabase/functions/_shared/motor/proposta";
import { compatibilidade, fundirSelecao, guardarSelecao, lerSelecao } from "@/features/motor/estruturas";
import type { PropostaEditorial } from "../../supabase/functions/_shared/motor/proposta";

const papeis = ["capa", "desenvolvimento", "desenvolvimento", "fecho"] as const;
const mk = (tag: string, n = 4): PropostaEditorial => ({
  v: 1, titulo: `T ${tag}`, legenda: `Legenda ${tag}`, alt: Array.from({ length: n }, (_, i) => `alt ${tag}${i}`),
  slides: Array.from({ length: n }, (_, i) => ({ id: `s${i + 1}`, papel: (i === 0 ? "capa" : i === n - 1 ? "fecho" : "desenvolvimento") as never, titulo: `${tag} t${i}`, texto: i === 1 ? `«Citação» ${tag} 37%` : `${tag} x${i}`, fontes: [i + 1] })),
} as unknown as PropostaEditorial);

describe("mistura híbrida por slide", () => {
  const atual = mk("A");
  const pas = { trabalho: "j-pas", framework: "pas", conteudo: mk("PAS") };
  const adp = { trabalho: "j-adp", framework: "antes_depois_ponte", conteudo: mk("ADP") };
  it("mistura 2 frameworks, mantém 1 slide, preserva citação/alt/§/ids/legenda e regista proveniência", () => {
    const r = fundirSelecao(atual, [pas, adp], ["j-pas", "j-adp", null, null]);
    expect(r.ok).toBe(true); if (!r.ok) return;
    expect(r.trocados).toBe(2);
    expect(r.conteudo.slides.map((s) => s.id)).toEqual(atual.slides.map((s) => s.id));
    expect(r.conteudo.slides[1].texto).toBe("«Citação» ADP 37%");
    expect(r.conteudo.slides[2]).toEqual(atual.slides[2]);
    expect(r.conteudo.alt).toEqual(["alt PAS0", "alt ADP1", "alt A2", "alt A3"]);
    expect(r.conteudo.legenda).toBe("Legenda A");
    expect(r.conteudo.origem_slides).toEqual({ s1: { framework: "pas", trabalho: "j-pas" }, s2: { framework: "antes_depois_ponte", trabalho: "j-adp" } });
    expect(r.transicoes).toEqual([1, 2]);
    expect(r.conteudo.titulo).toBe("PAS t0");
    expect(atual.slides[0].titulo).toBe("A t0");
  });
  it("recusa tamanhos diferentes e capa/fecho trocados sem alinhar por índice", () => {
    expect(compatibilidade(atual, mk("X", 5)).ok).toBe(false);
    const troca = mk("Y"); troca.slides[0] = { ...troca.slides[0], papel: "desenvolvimento" as never };
    expect(compatibilidade(atual, troca).ok).toBe(false);
    expect(() => fundirSelecao(atual, [{ trabalho: "x", framework: "pas", conteudo: mk("X", 5) }], ["x", null, null, null])).toThrow();
    void papeis;
  });
  it("autosave não vê diferença depois de aplicar (sem versão duplicada)", () => {
    const r = fundirSelecao(atual, [pas], ["j-pas", null, null, null]); if (!r.ok) throw new Error();
    const pacote = { conteudo: { slides: r.conteudo.slides } } as never;
    expect(JSON.stringify(aplicarTextoNaProposta(r.conteudo, pacote))).toBe(JSON.stringify(r.conteudo));
  });
  it("seleção vazia não é aplicável", () => { expect(fundirSelecao(atual, [pas], [null, null, null, null]).ok).toBe(false); });
});

describe("seleção persistente por versão", () => {
  beforeEach(() => localStorage.clear());
  it("sobrevive a reload e isola por versão de base", () => {
    guardarSelecao("t1", 3, ["j", null]);
    expect(lerSelecao("t1", 3, 2)).toEqual(["j", null]);
    expect(lerSelecao("t1", 4, 2)).toEqual([null, null]);
    expect(lerSelecao("t1", 3, 3)).toEqual([null, null, null]);
  });
});
