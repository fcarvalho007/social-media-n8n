import { describe, expect, it, vi } from "vitest";
import { gerarComReparacao, type RespostaGerador } from "../../supabase/functions/_shared/conteudos/carrossel";

const fonte = { titulo: "Crónica", paragrafos: ["a", "b", "c", "d"], url: "https://exemplo.pt/cronica" };
const proposta = (legenda: string) => JSON.stringify({
  slides: Array.from({ length: 6 }, (_, i) => ({ titulo: `Título ${i + 1}`, texto: `Texto ${i + 1}`, fontes: i === 0 || i === 5 ? [] : [1 + (i % 4)] })),
  legenda,
});

function deps(respostas: string[]) {
  const chamar = vi.fn(async (_s: string, _u: string): Promise<RespostaGerador> => ({ conteudo: respostas.shift() ?? "" }));
  const registar = vi.fn(async (_r: RespostaGerador, _e: string | null) => {});
  return { chamar, registar, parse: (t: string) => JSON.parse(t) };
}

describe("gerador do carrossel com reparação", () => {
  it("resposta válida faz uma só chamada e regista o uso", async () => {
    const d = deps([proposta("Legenda breve.")]);
    const c = await gerarComReparacao(fonte, d);
    expect(c.legenda).toBe("Legenda breve.");
    expect(d.chamar).toHaveBeenCalledTimes(1);
    expect(d.registar).toHaveBeenCalledWith(expect.anything(), null);
  });

  it("legenda longa é corrigida numa segunda chamada guiada pelo erro e medidas", async () => {
    const d = deps([proposta("x".repeat(2500)), proposta("Legenda corrigida.")]);
    const c = await gerarComReparacao(fonte, d);
    expect(c.legenda).toBe("Legenda corrigida.");
    expect(d.chamar).toHaveBeenCalledTimes(2);
    const user2 = d.chamar.mock.calls[1][1];
    expect(user2).toContain("2200");
    expect(user2).toContain("legenda: 2500 caracteres");
    expect(d.registar.mock.calls.map((c) => c[1] === null)).toEqual([false, true]);
  });

  it("legenda que não deixa espaço para o endereço também é corrigida", async () => {
    const d = deps([proposta("x".repeat(2190)), proposta("Curta.")]);
    await gerarComReparacao(fonte, d);
    expect(d.chamar).toHaveBeenCalledTimes(2);
  });

  it("duas respostas inválidas dão erro, registam as duas e não devolvem nada", async () => {
    const d = deps([proposta("x".repeat(2500)), proposta("y".repeat(2400))]);
    await expect(gerarComReparacao(fonte, d)).rejects.toThrow("após uma correção");
    expect(d.chamar).toHaveBeenCalledTimes(2);
    expect(d.registar).toHaveBeenCalledTimes(2);
  });

  it("erro de credenciais ou saldo não é repetido", async () => {
    const d = deps([]);
    d.chamar.mockRejectedValueOnce(new Error("Sem saldo na DeepSeek."));
    await expect(gerarComReparacao(fonte, d)).rejects.toThrow("saldo");
    expect(d.chamar).toHaveBeenCalledTimes(1);
    expect(d.registar).not.toHaveBeenCalled();
  });
});
