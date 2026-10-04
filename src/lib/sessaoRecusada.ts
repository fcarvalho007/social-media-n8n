import { supabase } from "@/integrations/supabase/client";

/**
 * Called when a function answers 401. Tries one session refresh; if the backend definitively
 * rejects it (not a network/outage error), ends the local session so the app returns to sign-in
 * instead of repeating "Sessão inválida". Returns true when the local session was ended.
 */
export async function tratarSessaoRecusada(): Promise<boolean> {
  const { data, error } = await supabase.auth.refreshSession();
  if (!error && data.session) return false;
  const status = (error as { status?: number } | null)?.status;
  const definitivo = !error || (typeof status === "number" && status >= 400 && status < 500);
  if (!definitivo) return false;
  await supabase.auth.signOut({ scope: "local" });
  return true;
}
