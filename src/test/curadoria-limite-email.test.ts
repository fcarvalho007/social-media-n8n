import { describe, expect, it, vi } from "vitest";

type Pipeline = {
  processarEmailComPipeline: (admin: unknown, meta: unknown, deps: unknown, opcoes?: unknown) =>
    Promise<{ noticias_inseridas: number; motivo_sem_resultado: string | null; detalhe: { adiado_por_limite?: boolean } }>;
};
const pipeline = (): Promise<Pipeline> =>
  import(/* @vite-ignore */ ["../../supabase/functions/_shared/nl-app/edge-shared", "pipeline-newsletter.ts"].join("/"));

/** Minimal chainable fake: `emailHoje` news from email already entered in the last 24 h. */
function adminFalso(emailHoje: number) {
  return {
    from(tabela: string) {
      const b: Record<string, unknown> = {};
      const devolve = () => b;
      for (const m of ["select", "eq", "in", "gte", "update", "insert", "is", "order", "limit"]) b[m] = devolve;
      b.maybeSingle = async () => ({
        data: tabela.endsWith("curadoria_config") ? { max_por_dia: 25, max_por_dia_email: 15, max_por_email: 4 } : null,
      });
      b.then = (ok: (v: unknown) => void) => ok({ data: null, error: null, count: tabela.endsWith("noticias") ? emailHoje : 0 });
      return b;
    },
  };
}

const meta = {
  html: "<h2>Notícia</h2><p>Texto suficiente sobre um tema de marketing digital.</p>",
  plain: null, assunto: "Teste", remetenteLabel: "x", remetenteEmail: "x@exemplo.pt", emailRecebidoId: "e1",
};

describe("newsletters e limite diário de email", () => {
  it("com o limite de 15 atingido (19 hoje), não chama a IA e adia o email", async () => {
    const { processarEmailComPipeline } = await pipeline();
    const ia = vi.fn();
    const r = await processarEmailComPipeline(adminFalso(19), meta, { chamarIaExtrator: ia, chamarDeepSeek: ia });
    expect(ia).not.toHaveBeenCalled();
    expect(r.noticias_inseridas).toBe(0);
    expect(r.motivo_sem_resultado).toBe("limite_diario");
    expect(r.detalhe.adiado_por_limite).toBe(true);
  });
});
