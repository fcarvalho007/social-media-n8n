import { describe, expect, it } from "vitest";
import { ORIGINAL, pecaDeTrecho, snapshotRepor } from "@/newsletter/features/newsletter/revista/pecas-trecho";

const par = "Esta semana, 19% dos jovens perderam emprego. É um sinal claro.";

describe("destacar trecho e repor crónica", () => {
  it("frase selecionada vira frase de destaque logo a seguir ao parágrafo", () => {
    expect(pecaDeTrecho("pull_quote", " É um sinal claro. ", par, 2)).toEqual({ pull_quote: "É um sinal claro.", pull_quote_posicao: 3 });
  });
  it("número selecionado vira número da semana com o resto como descrição", () => {
    const r = pecaDeTrecho("momento", "19%", par, 0)!;
    expect(r.momento_valor).toBe("19%");
    expect(r.momento_activo).toBe(true);
    expect(r.momento_posicao).toBe(1);
    expect(String(r.momento_descricao)).not.toContain("19%");
  });
  it("seleção vazia não cria peça", () => {
    expect(pecaDeTrecho("pull_quote", "   ", par, 0)).toBeNull();
  });
  it("repor guarda o estado anterior para desfazer e limpa só peças e excerto", () => {
    const cfg = { ...ORIGINAL, cronica_lede: "L", pull_quote: "Q", momento_activo: true, cronica_excerto: "E", cronica_titulo: "T" };
    const antes = snapshotRepor(cfg);
    expect(antes.cronica_lede).toBe("L");
    expect(antes).not.toHaveProperty("cronica_titulo");
    expect(ORIGINAL.cronica_excerto).toBe("");
    expect(ORIGINAL.momento_activo).toBe(false);
  });
});
