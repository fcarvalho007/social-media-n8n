// Client replacement for @tanstack/react-start: server functions become calls to the nl-api edge function.
import { supabase } from "@/integrations/supabase/client";

export type NlCall = <T = any>(arg?: { data?: unknown }) => Promise<T>; // eslint-disable-line @typescript-eslint/no-explicit-any

export function nlServerFn(id: string): NlCall {
  return async (arg) => {
    const { data, error } = await supabase.functions.invoke("nl-api", { body: { id, data: arg?.data ?? null } });
    if (error) {
      const ctx = (error as { context?: Response }).context;
      const body = ctx ? await ctx.json().catch(() => null) : null;
      throw new Error(body?.error ?? error.message);
    }
    return data;
  };
}

export function useServerFn<F>(fn: F): F {
  return fn;
}

/** Only for type compatibility if referenced in client files; never executed. */
export function createServerFn(): never {
  throw new Error("createServerFn não está disponível no cliente");
}
