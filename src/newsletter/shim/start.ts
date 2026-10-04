// Client replacement for @tanstack/react-start: server functions become calls to the nl-api edge function.
// Input/output types come from declarations emitted from the server tree (src/newsletter/_tipos-servidor).
import { supabase } from "@/integrations/supabase/client";
import { NL_OPS } from "../../../supabase/functions/_shared/nl-ops";
import { pedirConfirmacao } from "./confirmar";

/** Structural mirror of the server descriptor's phantom type fields. */
interface ServerFnTipo<I, O> { __in?: I; __out?: O }

type Entrada<F> = F extends ServerFnTipo<infer I, unknown> ? I : unknown;
type Saida<F> = F extends ServerFnTipo<unknown, infer O> ? O : unknown;

export type NlCall<F> = undefined extends Entrada<F>
  ? (arg?: { data?: Entrada<F> }) => Promise<Saida<F>>
  : (arg: { data: Entrada<F> }) => Promise<Saida<F>>;

export class AcaoCancelada extends Error {
  constructor() { super("Ação cancelada"); this.name = "AcaoCancelada"; }
}

export function nlServerFn<F = ServerFnTipo<unknown, unknown>>(id: string): NlCall<F> {
  const op = NL_OPS[id];
  const call = async (arg?: { data?: unknown }) => {
    let confirmar: string | undefined;
    if (op?.nivel === "externa") {
      const ok = await pedirConfirmacao(op.confirmar ?? "Esta ação sai do estúdio. Continuar?");
      if (!ok) throw new AcaoCancelada();
      confirmar = id;
    }
    const { data, error } = await supabase.functions.invoke("nl-api", { body: { id, data: arg?.data ?? null, confirmar } });
    if (error) {
      const ctx = (error as { context?: Response }).context;
      const body = ctx ? await ctx.json().catch(() => null) : null;
      throw new Error((body as { error?: string } | null)?.error ?? error.message);
    }
    return data as Saida<F>;
  };
  return call as NlCall<F>;
}

export function useServerFn<F>(fn: F): F {
  return fn;
}

/** Only for type compatibility if referenced in client files; never executed. */
export function createServerFn(): never {
  throw new Error("createServerFn não está disponível no cliente");
}
