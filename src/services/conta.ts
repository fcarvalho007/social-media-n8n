import { supabase } from "@/integrations/supabase/client";

/** Changes the password of the currently signed-in user only. Never logs values. */
export async function alterarMinhaPassword(atual: string, nova: string): Promise<{ ok: true } | { ok: false; mensagem: string }> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { ok: false, mensagem: "Sessão expirada. Volta a entrar." };
  const { error } = await supabase.auth.updateUser({ password: nova, current_password: atual } as { password: string });
  if (!error) return { ok: true };
  const m = error.message.toLowerCase();
  if (m.includes("current") || m.includes("invalid")) return { ok: false, mensagem: "A password atual não está correta." };
  if (m.includes("weak") || m.includes("pwned") || m.includes("leaked")) return { ok: false, mensagem: "Essa password é fraca ou já foi exposta. Escolhe outra." };
  if (m.includes("same")) return { ok: false, mensagem: "A nova password tem de ser diferente da atual." };
  return { ok: false, mensagem: "Não foi possível alterar a password. Tenta novamente." };
}
