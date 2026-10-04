import { supabase } from "@/integrations/supabase/client";

/**
 * Changes the password of the currently signed-in user only. Never logs values.
 * `current_password` is part of the typed UserAttributes since @supabase/auth-js 2.98;
 * the auth server checks it when "require current password" is enabled.
 */
export async function alterarMinhaPassword(atual: string, nova: string): Promise<{ ok: true } | { ok: false; mensagem: string }> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { ok: false, mensagem: "Sessão expirada. Volta a entrar." };
  const { error } = await supabase.auth.updateUser({ password: nova, current_password: atual });
  if (!error) return { ok: true };
  const code = error.code ?? "";
  const m = error.message.toLowerCase();
  if (code === "reauthentication_needed" || code === "reauthentication_not_valid")
    return { ok: false, mensagem: "Por segurança, é preciso confirmar a identidade. Sai, volta a entrar com o código por email e tenta de novo." };
  if (code === "invalid_credentials" || m.includes("current")) return { ok: false, mensagem: "A password atual não está correta." };
  if (code === "weak_password" || m.includes("pwned") || m.includes("leaked")) return { ok: false, mensagem: "Essa password é fraca ou já foi exposta. Escolhe outra." };
  if (code === "same_password") return { ok: false, mensagem: "A nova password tem de ser diferente da atual." };
  return { ok: false, mensagem: "Não foi possível alterar a password. Tenta novamente." };
}
