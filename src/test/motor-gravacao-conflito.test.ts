import { describe, expect, it, vi, beforeEach } from "vitest";

const rpc = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: (...a: unknown[]) => rpc(...a) } }));
vi.mock("@/lib/sessaoRecusada", () => ({ tratarSessaoRecusada: async () => false }));

import { ConflitoVersao, gravarEdicao } from "@/services/motor";

const args = { proposta_id: "p", proposta_versao: 1, conteudo: null, documentos: {} };
const resposta = (r: unknown) => ({ abortSignal: () => Promise.resolve(r) });

describe("gravarEdicao — conflito e prazo", () => {
  beforeEach(() => rpc.mockReset());

  it("MC409 é conflito de versão (não erro genérico nem repetição)", async () => {
    rpc.mockReturnValue(resposta({ data: null, error: { code: "MC409", message: "conflito" } }));
    await expect(gravarEdicao(args)).rejects.toBeInstanceOf(ConflitoVersao);
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("código antigo 40001 continua a ser tratado como conflito", async () => {
    rpc.mockReturnValue(resposta({ data: null, error: { code: "40001", message: "conflito" } }));
    await expect(gravarEdicao(args)).rejects.toBeInstanceOf(ConflitoVersao);
  });

  it("sem resposta do servidor termina por prazo, sem ficar pendurado", async () => {
    vi.useFakeTimers();
    rpc.mockReturnValue({ abortSignal: (s: AbortSignal) => new Promise((res) => s.addEventListener("abort", () => res({ data: null, error: { code: "20", message: "abort" } }))) });
    const p = gravarEdicao(args);
    const verif = expect(p).rejects.toThrow("O servidor não respondeu a tempo.");
    await vi.advanceTimersByTimeAsync(20_000);
    await verif;
    vi.useRealTimers();
  });

  it("gravação vencedora devolve as novas versões", async () => {
    rpc.mockReturnValue(resposta({ data: { proposta_versao: 2, documentos: { A: 3 } }, error: null }));
    await expect(gravarEdicao(args)).resolves.toEqual({ proposta_versao: 2, documentos: { A: 3 } });
  });
});
