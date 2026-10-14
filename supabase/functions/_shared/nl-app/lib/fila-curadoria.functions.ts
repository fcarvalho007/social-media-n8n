import { createServerFn } from "../_shim/start.ts";
import { requireSupabaseAuth } from "../_shim/auth.ts";

async function nomeDeQuem(context: { supabase: unknown; userId?: string }): Promise<string> {
  try {
    const sb = context.supabase as {
      from: (t: string) => {
        select: (c: string) => {
          eq: (c: string, v: string) => { maybeSingle: () => PromiseLike<{ data: { nome?: string | null } | null }> };
        };
      };
    };
    const { data } = await sb.from("nl_perfis").select("nome").eq("id", context.userId ?? "").maybeSingle();
    return data?.nome || "utilizador";
  } catch {
    return "utilizador";
  }
}

/** Quantos itens estão à espera de ser interpretados. */
export const contarFilaCuradoria = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("../_shim/admin.ts");
    const { contarFila, modoManualActivo } = await import("./fila-curadoria.server.ts");
    const [contagem, manual] = await Promise.all([
      contarFila(supabaseAdmin as never),
      modoManualActivo(supabaseAdmin as never),
    ]);
    return { ...contagem, modo_manual: manual };
  });

/** Processa um lote da fila (10/20/30/50), dos mais recentes para os mais antigos. */
export const processarFilaCuradoria = createServerFn({ method: "POST" })
  .inputValidator((data: { limite: number }) => {
    const limite = Number(data?.limite);
    if (!Number.isFinite(limite) || limite < 1) throw new Error("Limite inválido");
    return { limite: Math.min(50, Math.floor(limite)) };
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("../_shim/admin.ts");
    const { processarLote } = await import("./fila-curadoria.server.ts");
    const quem = await nomeDeQuem(context as never);
    return processarLote(supabaseAdmin as never, { limite: data.limite, quem });
  });

/** Devolve itens falhados à fila para nova tentativa. */
export const retomarFalhadosCuradoria = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("../_shim/admin.ts");
    const { error, count } = await supabaseAdmin
      .from("nl_curadoria_fila")
      .update({ estado: "em_fila", motivo: null } as never, { count: "exact" })
      .eq("estado", "falhado")
      .select("id");
    if (error) throw new Error(error.message);
    return { retomados: count ?? 0 };
  });

/** Liga ou desliga o modo manual da recolha. */
export const definirModoManualCuradoria = createServerFn({ method: "POST" })
  .inputValidator((data: { manual: boolean }) => ({ manual: Boolean(data?.manual) }))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as { rpc: (fn: "nl_me_papel") => PromiseLike<{ data: unknown }> };
    const { data: papel } = await sb.rpc("nl_me_papel");
    if (papel !== "admin") throw new Error("Só administradores podem alterar este modo");
    const { supabaseAdmin } = await import("../_shim/admin.ts");
    const { definirModoManual } = await import("./fila-curadoria.server.ts");
    await definirModoManual(supabaseAdmin as never, data.manual);
    return { ok: true, manual: data.manual };
  });

/** Apaga itens da fila com mais de N dias (pré-definição: 20). */
export const limparFilaAntigaCuradoria = createServerFn({ method: "POST" })
  .inputValidator((data: { dias?: number }) => ({ dias: data?.dias }))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("../_shim/admin.ts");
    const { limparFilaAntiga } = await import("./fila-curadoria.server.ts");
    const quem = await nomeDeQuem(context as never);
    return limparFilaAntiga(supabaseAdmin as never, { dias: data.dias, quem });
  });
