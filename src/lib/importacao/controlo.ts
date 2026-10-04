/** Client-side control of the resumable newsletter import (pure, testable). */
export interface RunResumo {
  id: string; modo: string; estado: string; created_by?: string | null;
  relatorio: Record<string, unknown> | null; manifesto: Record<string, unknown> | null;
  progresso: { indice?: number; fase?: string } | null;
}
export interface Passo { concluido: boolean; relatorio?: Record<string, unknown>; progresso?: { indice: number; fase: string }; total_tabelas?: number }

export type DecisaoReload =
  | { tipo: "nada" }
  | { tipo: "retomar"; run: RunResumo }
  | { tipo: "relatorio"; relatorio: Record<string, unknown> }
  | { tipo: "simulacao_por_verificar"; run: RunResumo }
  | { tipo: "nova_simulacao"; motivo: string };

/** What to restore after a reload. Only runs owned by this admin are considered. */
export function decidirAposReload(run: RunResumo | null, userId: string): DecisaoReload {
  if (!run) return { tipo: "nada" };
  if (run.created_by && run.created_by !== userId) return { tipo: "nada" };
  if (run.modo === "importacao") {
    if (run.estado === "em_curso") return { tipo: "retomar", run };
    if (run.estado === "concluida" && run.relatorio) return { tipo: "relatorio", relatorio: run.relatorio };
    if (run.estado === "falhada") return { tipo: "nova_simulacao", motivo: String(run.relatorio?.falha ?? "A última importação falhou.") };
    return { tipo: "nada" };
  }
  if (run.modo === "dry_run") {
    const rel = run.relatorio ?? {};
    const contratoOk = Array.isArray(rel.tabelas) && Array.isArray(rel.erros) && (rel.erros as unknown[]).length === 0 && !!run.manifesto?.sha256_global;
    if (run.estado !== "concluida" || !contratoOk) return { tipo: "nova_simulacao", motivo: "A última simulação não passou ou está incompleta." };
    return { tipo: "simulacao_por_verificar", run };
  }
  return { tipo: "nada" };
}

export const ehErroRede = (e: unknown) => /fetch|network|rede|Failed|timeout/i.test((e as Error)?.message ?? "");

export type ResultadoImportacao =
  | { estado: "concluida"; relatorio: Record<string, unknown> }
  | { estado: "pausa"; runId: string; passos: number };

/**
 * Runs import steps until done. Never reports success on the step limit: returns a resumable pause.
 * Network failures retry the same (idempotent) step; any thrown error keeps the run id resumable.
 */
export async function executarImportacao(
  runId: string,
  passo: (id: string) => Promise<Passo>,
  opts: { maxPassos?: number; tentativas?: number; esperar?: (ms: number) => Promise<void>; onProgresso?: (pct: number, p: Passo) => void } = {},
): Promise<ResultadoImportacao> {
  const max = opts.maxPassos ?? 200, tent = opts.tentativas ?? 3;
  const esperar = opts.esperar ?? ((ms) => new Promise((ok) => setTimeout(ok, ms)));
  for (let i = 0; i < max; i++) {
    let r: Passo | null = null;
    for (let t = 0; t < tent && !r; t++) {
      try { r = await passo(runId); }
      catch (e) { if (t === tent - 1 || !ehErroRede(e)) throw e; await esperar(1500 * (t + 1)); }
    }
    if (!r) throw new Error("Sem resposta do servidor");
    if (r.concluido) { opts.onProgresso?.(100, r); return { estado: "concluida", relatorio: r.relatorio ?? {} }; }
    if (r.progresso && r.total_tabelas) opts.onProgresso?.(Math.min(95, Math.round((r.progresso.indice / r.total_tabelas) * 90)), r);
  }
  return { estado: "pausa", runId, passos: max };
}
