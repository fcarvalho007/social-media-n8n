import process from "node:process";
import { createServerFn } from "../_shim/start.ts";
import { requireSupabaseAuth } from "../_shim/auth.ts";

export type EstadoSecrets = {
  deepseek: boolean;
  egoi: boolean;
  wp_url: boolean;
  wp_user: boolean;
  wp_pass: boolean;
};

export const verificarSecretsAPI = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<EstadoSecrets> => {
    const { data: isAdmin } = await context.supabase.rpc("nl_is_admin");
    if (!isAdmin) throw new Error("Sem permissão");
    const has = (v: string | undefined) => !!(v && v.trim().length > 0);
    return {
      deepseek: has(process.env.DEEPSEEK_API_KEY),
      egoi: has(process.env.EGOI_API_KEY),
      wp_url: has(process.env.WORDPRESS_SITE_URL),
      wp_user: has((process.env.WORDPRESS_APP_USER || process.env.wordpress_site_username)),
      wp_pass: has((process.env.WORDPRESS_APP_PASSWORD || process.env.wordpress_site_key)),
    };
  });

/**
 * Devolve a URL completa do webhook do CloudMailin (com Basic Auth embutida)
 * para o admin colar na configuração do endereço em CloudMailin.
 * Só o admin pode ver. Server-only.
 */
export const getWebhookCloudMailinUrl = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ url: string | null }> => {
    const { data: isAdmin } = await context.supabase.rpc("nl_is_admin");
    if (!isAdmin) throw new Error("Sem permissão");
    const user = process.env.CLOUDMAILIN_AUTH_USER;
    const pass = process.env.CLOUDMAILIN_AUTH_PASS;
    if (!user || !pass) return { url: null };
    const { baseFuncoes } = await import("../../nl-publico-config.ts");
    return { url: `${baseFuncoes()}/nl-hooks/email-newsletter` };
  });
