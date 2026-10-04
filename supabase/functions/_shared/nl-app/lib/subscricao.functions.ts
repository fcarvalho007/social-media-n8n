import { createServerFn } from "../_shim/start.ts";
import { requireSupabaseAuth } from "../_shim/auth.ts";

/**
 * Endpoints públicos da página de gestão de subscrição.
 * Não exigem sessão — quem chega aqui vem do rodapé de um email.
 * Nunca devolvem dados de terceiros: só o estado do email indicado.
 */

export interface EstadoPublico {
  ok: boolean;
  email: string | null;
  estado: "activa" | "cancelada" | "pausada" | "mensal";
  retomaEm: string | null;
  mensagem?: string;
}

export const estadoSubscricaoFn = createServerFn({ method: "POST" })
  .inputValidator((d: { token?: string | null; email?: string | null }) => d)
  .handler(async ({ data }): Promise<EstadoPublico> => {
    const { estadoSubscricao, estadoPorEmail } = await import("./subscricao.server.ts");
    if (data.token) return estadoSubscricao(data.token);
    if (data.email) return estadoPorEmail(data.email);
    return { ok: false, email: null, estado: "activa", retomaEm: null, mensagem: "Falta o email." };
  });

export const aplicarAccaoSubscricaoFn = createServerFn({ method: "POST" })
  .inputValidator((d: {
    token?: string | null;
    email?: string | null;
    accao: "cancelar" | "pausar" | "mensal" | "reverter";
    motivo?: string | null;
  }) => d)
  .handler(async ({ data }) => {
    const { aplicarAccao } = await import("./subscricao.server.ts");
    return aplicarAccao(data);
  });

/** Painel interno: últimos eventos e contagens por motivo. */
export const resumoSubscricoesFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
  const { supabaseAdmin } = await import("../_shim/admin.ts");
  const { data } = await supabaseAdmin
    .from("nl_subscricao_eventos")
    .select("id, email, accao, motivo, retoma_em, origem, criado_em")
    .order("criado_em", { ascending: false })
    .limit(60);

  const eventos = (data ?? []).map((e) => ({
    ...e,
    email: mascararEmail(e.email),
  }));

  const contagens = { cancelado: 0, pausado: 0, mensal: 0, reactivado: 0, revertido: 0 } as Record<string, number>;
  const motivos: Record<string, number> = {};
  for (const e of data ?? []) {
    contagens[e.accao] = (contagens[e.accao] ?? 0) + 1;
    if (e.motivo) motivos[e.motivo] = (motivos[e.motivo] ?? 0) + 1;
  }
  return { eventos, contagens, motivos };
});

/** Teste controlado do fluxo (pausa e reposição) com um email indicado. */
export const testarSubscricaoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { email: string }) => d)
  .handler(async ({ data }) => {
    const { testarFluxo } = await import("./subscricao.server.ts");
    return testarFluxo(data.email);
  });

/** URL a configurar na E-goi para receber os cancelamentos feitos lá. */
export const urlWebhookEgoiFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { chaveWebhookEgoi } = await import("./subscricao.server.ts");
    return { url: `https://newsletter-digital-sprint.lovable.app/api/public/hooks/egoi-subscricao?k=${chaveWebhookEgoi()}` };
  });

function mascararEmail(email: string): string {
  const [utilizador, dominio] = email.split("@");
  if (!dominio) return email;
  const visivel = utilizador.slice(0, 2);
  return `${visivel}${"•".repeat(Math.max(2, utilizador.length - 2))}@${dominio}`;
}
