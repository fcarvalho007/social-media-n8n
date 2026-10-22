import { describe, expect, it } from "vitest";
import { avaliarFonte, LIMITES_FONTE, MARGEM_TRADUCAO, normalizarFonte } from "../../supabase/functions/_shared/motor/proposta";

const P = "Frase de teste com um facto verificável e mais umas palavras para encher este parágrafo.";
const texto = (n: number) => { let s = P; while (s.length < n) s += "\n\n" + P; return s.slice(0, n); };

describe("limite de caracteres das traduções", () => {
  it("aceita uma tradução de ~20 500 caracteres", () => {
    expect(avaliarFonte(normalizarFonte(texto(20500)), { traducao: true }).ok).toBe(true);
    expect(avaliarFonte(normalizarFonte(texto(20500))).ok).toBe(false);
  });
  it("bloqueia acima da margem", () => {
    expect(avaliarFonte(normalizarFonte(texto(27000)), { traducao: true }).ok).toBe(false);
    expect(Math.ceil(LIMITES_FONTE.max * MARGEM_TRADUCAO)).toBe(26000);
  });
});

import { validarTraducao as vt } from "../../supabase/functions/_shared/motor/traducao";
import { describe as d2, it as i2, expect as e2 } from "vitest";
d2("validação de números na tradução", () => {
  i2("aceita o mesmo valor com separador de milhares diferente", () => {
    e2(vt(["Over 2,000 firms and 1,500,000 users in 2027."], { paragrafos: ["Mais de 2 000 empresas e 1 500 000 utilizadores em 2027."] }).ok).toBe(true);
  });
  i2("recusa um número alterado", () => {
    e2(vt(["75% of marketers"], { paragrafos: ["70% dos marketers"] }).ok).toBe(false);
  });
});

d2("tradução parcial", () => {
  const orig = Array.from({ length: 6 }, (_, i) => `Paragraph ${i} has ${i * 10 + 5}% growth.`);
  const trad = orig.map((_, i) => `O parágrafo ${i} tem ${i * 10 + 5}% de crescimento.`);
  i2("um parágrafo com número diferente fica no original e é assinalado", () => {
    const t = [...trad]; t[2] = "O parágrafo 2 tem 99% de crescimento.";
    const v = vt(orig, { paragrafos: t });
    e2(v.ok).toBe(true);
    if (v.ok) { e2(v.mantidos).toEqual([3]); e2(v.paragrafos[2]).toBe(orig[2]); e2(v.paragrafos.join(" ")).not.toContain("99%"); }
  });
  i2("mais de um terço a falhar recusa tudo", () => {
    const t = [...trad]; t[0] = "x 1"; t[1] = "x 2"; t[2] = "x 3";
    e2(vt(orig, { paragrafos: t }).ok).toBe(false);
  });
  i2("número de parágrafos diferente recusa", () => {
    e2(vt(orig, { paragrafos: trad.slice(1) }).ok).toBe(false);
  });
});
