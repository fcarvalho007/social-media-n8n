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
