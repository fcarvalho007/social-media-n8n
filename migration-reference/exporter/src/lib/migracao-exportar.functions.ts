import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Read-only migration export. Admin only, verified as the caller before any privileged read. */
export const exportarMigracaoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin, error } = await context.supabase.rpc("is_admin");
    if (error || !isAdmin) throw new Error("Apenas o administrador pode exportar o pacote de migração.");
    const { admin } = await import("./newsletter-engine/envio.server");
    const { gerarPacote } = await import("./migracao-exportar.server");
    const quem = context.userId;
    const pacote = await gerarPacote(admin(), quem);
    return JSON.stringify(pacote);
  });
