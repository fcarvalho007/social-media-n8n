import { describe, it, expect, vi } from "vitest";
import { decidirAposReload, executarImportacao, type Passo } from "./controlo";

const semEspera = async () => {};

describe("importação retomável (dados fictícios)", () => {
  it("repete o mesmo passo em falha de rede e conclui", async () => {
    const passo = vi.fn<(id: string) => Promise<Passo>>()
      .mockRejectedValueOnce(new Error("Failed to fetch"))
      .mockResolvedValueOnce({ concluido: false, progresso: { indice: 1, fase: "tabelas" }, total_tabelas: 2 })
      .mockResolvedValueOnce({ concluido: true, relatorio: { linhas: 3 } });
    const r = await executarImportacao("run-x", passo, { esperar: semEspera });
    expect(r).toEqual({ estado: "concluida", relatorio: { linhas: 3 } });
    expect(passo).toHaveBeenCalledTimes(3);
  });

  it("limite de passos devolve pausa retomável, nunca sucesso", async () => {
    const passo = vi.fn(async (): Promise<Passo> => ({ concluido: false }));
    const r = await executarImportacao("run-x", passo, { maxPassos: 4, esperar: semEspera });
    expect(r).toEqual({ estado: "pausa", runId: "run-x", passos: 4 });
  });

  it("erro não-rede propaga sem repetir", async () => {
    const passo = vi.fn(async (): Promise<Passo> => { throw new Error("Pacote alterado"); });
    await expect(executarImportacao("run-x", passo, { esperar: semEspera })).rejects.toThrow("Pacote alterado");
    expect(passo).toHaveBeenCalledTimes(1);
  });

  it("após reload: retoma importação própria, ignora de outro admin", () => {
    const run = { id: "r", modo: "importacao", estado: "em_curso", created_by: "u1", relatorio: null, manifesto: null, progresso: { indice: 2 } };
    expect(decidirAposReload(run, "u1").tipo).toBe("retomar");
    expect(decidirAposReload(run, "u2").tipo).toBe("nada");
  });

  it("simulação aprovada só fica por verificar; incompleta pede nova", () => {
    const base = { id: "s", modo: "dry_run", estado: "concluida", created_by: "u1", progresso: null };
    expect(decidirAposReload({ ...base, relatorio: { tabelas: [], erros: [] }, manifesto: { sha256_global: "abc" } }, "u1").tipo).toBe("simulacao_por_verificar");
    expect(decidirAposReload({ ...base, relatorio: { tabelas: [], erros: ["x"] }, manifesto: { sha256_global: "abc" } }, "u1").tipo).toBe("nova_simulacao");
    expect(decidirAposReload({ ...base, relatorio: { tabelas: [], erros: [] }, manifesto: {} }, "u1").tipo).toBe("nova_simulacao");
  });
});
