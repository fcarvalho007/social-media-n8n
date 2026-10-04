// Inbound hooks of the newsletter (ported origin handlers), each with its own authentication:
// - cron tasks: x-nl-cron secret (NL_CRON_SEGREDO) or service-role bearer, and only when NL_CRON_ACTIVO=1;
// - email-newsletter: HTTP Basic (CLOUDMAILIN_AUTH_USER/PASS), checked inside the ported handler;
// - egoi-subscricao: ?k= shared key (NL_EGOI_WEBHOOK_CHAVE), checked inside the ported handler.
// GET /estado (admin session): presence of configuration only, never values.
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";
import { baseFuncoes, basePublica, tagTokenEgoi } from "../_shared/nl-publico-config.ts";

type Handler = (ctx: { request: Request }) => Promise<Response> | Response;
type HookModule = { Route: { options: { server: { handlers: { POST: Handler } } } } };

const HOOKS: Record<string, { tipo: "cron" | "webhook"; carregar: () => Promise<HookModule> }> = {
  "curadoria-rss": { tipo: "cron", carregar: () => import("../_shared/nl-app/hooks/curadoria-rss.ts") as Promise<HookModule> },
  "curadoria-ferramentas": { tipo: "cron", carregar: () => import("../_shared/nl-app/hooks/curadoria-ferramentas.ts") as Promise<HookModule> },
  "enviar-agendados": { tipo: "cron", carregar: () => import("../_shared/nl-app/hooks/enviar-agendados.ts") as Promise<HookModule> },
  "sincronizar-podcast": { tipo: "cron", carregar: () => import("../_shared/nl-app/hooks/sincronizar-podcast.ts") as Promise<HookModule> },
  "reprocessar-emails": { tipo: "cron", carregar: () => import("../_shared/nl-app/hooks/reprocessar-emails.ts") as Promise<HookModule> },
  "retomar-subscricoes": { tipo: "cron", carregar: () => import("../_shared/nl-app/hooks/retomar-subscricoes.ts") as Promise<HookModule> },
  "email-newsletter": { tipo: "webhook", carregar: () => import("../_shared/nl-app/hooks/email-newsletter.ts") as Promise<HookModule> },
  "egoi-subscricao": { tipo: "webhook", carregar: () => import("../_shared/nl-app/hooks/egoi-subscricao.ts") as Promise<HookModule> },
};

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

function igual(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
}

function cronAutorizado(req: Request): boolean {
  const segredo = Deno.env.get("NL_CRON_SEGREDO") ?? "";
  const dado = req.headers.get("x-nl-cron") ?? "";
  if (segredo.length >= 24 && igual(dado, segredo)) return true;
  const sr = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  return igual(bearer, sr);
}

async function estado(req: Request): Promise<Response> {
  const auth = req.headers.get("Authorization");
  if (!auth) return json({ error: "Sessão em falta" }, 401);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return json({ error: "Sessão inválida" }, 401);
  const { data: admin } = await sb.rpc("nl_is_admin");
  if (!admin) return json({ error: "Apenas administradores" }, 403);
  const tem = (n: string) => Boolean((Deno.env.get(n) ?? "").trim());
  const f = baseFuncoes();
  return json({
    endereco_publico: basePublica() || null,
    tag_token_egoi: tagTokenEgoi() || null,
    automatismos_activos: Deno.env.get("NL_CRON_ACTIVO") === "1",
    segredos: {
      SUBSCRICAO_SEGREDO: tem("SUBSCRICAO_SEGREDO"),
      NL_CRON_SEGREDO: tem("NL_CRON_SEGREDO"),
      NL_EGOI_WEBHOOK_CHAVE: tem("NL_EGOI_WEBHOOK_CHAVE"),
      CLOUDMAILIN_AUTH_USER: tem("CLOUDMAILIN_AUTH_USER"),
      CLOUDMAILIN_AUTH_PASS: tem("CLOUDMAILIN_AUTH_PASS"),
      EGOI_API_KEY: tem("EGOI_API_KEY"),
      NL_EGOI_CAMPO_TOKEN_ID: tem("NL_EGOI_CAMPO_TOKEN_ID"),
      DEEPSEEK_API_KEY: tem("DEEPSEEK_API_KEY"),
    },
    endpoints: {
      email_entrada: `${f}/nl-hooks/email-newsletter`,
      egoi_cancelamentos: `${f}/nl-hooks/egoi-subscricao?k=<NL_EGOI_WEBHOOK_CHAVE>`,
      um_clique: `${f}/nl-publico/unsubscribe`,
      sitemap: `${f}/nl-publico/sitemap.xml`,
      automatismos: Object.entries(HOOKS).filter(([, h]) => h.tipo === "cron").map(([n]) => `${f}/nl-hooks/${n}`),
    },
  });
}

/**
 * Writes each contact's signed subscription token into the E-goi extra field (NL_EGOI_CAMPO_TOKEN_ID),
 * so footer links can use the merge tag instead of the bare e-mail. External write: admin session and
 * body { confirmar: "sincronizar-tokens" } required. Must run before a real send (and after new sign-ups).
 */
async function sincronizarTokens(req: Request): Promise<Response> {
  const auth = req.headers.get("Authorization");
  if (!auth) return json({ error: "Sessão em falta" }, 401);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return json({ error: "Sessão inválida" }, 401);
  const { data: admin } = await sb.rpc("nl_is_admin");
  if (!admin) return json({ error: "Apenas administradores" }, 403);
  const corpo = await req.json().catch(() => null) as { confirmar?: unknown } | null;
  if (corpo?.confirmar !== "sincronizar-tokens") return json({ error: "Confirmação explícita em falta" }, 428);
  const campo = Number(Deno.env.get("NL_EGOI_CAMPO_TOKEN_ID") ?? "");
  const apiKey = Deno.env.get("EGOI_API_KEY") ?? "";
  if (!Number.isInteger(campo) || campo <= 0 || !apiKey) return json({ error: "Faltam EGOI_API_KEY ou NL_EGOI_CAMPO_TOKEN_ID" }, 412);
  const { criarToken } = await import("../_shared/nl-app/lib/subscricao.server.ts");
  const srv = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: listas } = await srv.from("nl_egoi_listas").select("egoi_lista_id").eq("tipo", "real").eq("activa", true);
  const h = { Apikey: apiKey, Accept: "application/json", "Content-Type": "application/json" };
  let actualizados = 0, falhas = 0;
  const inicio = Date.now();
  for (const l of (listas ?? []) as Array<{ egoi_lista_id: string }>) {
    for (let offset = 0; offset < 100000; offset += 100) {
      if (Date.now() - inicio > 120_000) return json({ ok: false, parcial: true, actualizados, falhas, mensagem: "Tempo esgotado; repetir continua de forma idempotente." });
      const r = await fetch(`https://api.egoiapp.com/lists/${encodeURIComponent(l.egoi_lista_id)}/contacts?limit=100&offset=${offset}`, { headers: h });
      if (!r.ok) { falhas++; break; }
      const pag = await r.json().catch(() => ({})) as { items?: Array<{ base?: { contact_id?: string; email?: string } }> };
      const itens = pag.items ?? [];
      for (const c of itens) {
        const id = c.base?.contact_id, email = c.base?.email;
        if (!id || !email) continue;
        const w = await fetch(`https://api.egoiapp.com/lists/${encodeURIComponent(l.egoi_lista_id)}/contacts/${encodeURIComponent(id)}`, {
          method: "PATCH", headers: h, body: JSON.stringify({ extra: [{ field_id: campo, value: criarToken(email) }] }),
        });
        if (w.ok) actualizados++; else falhas++;
      }
      if (itens.length < 100) break;
    }
  }
  return json({ ok: falhas === 0, actualizados, falhas });
}

Deno.serve(async (req) => {
  const nome = new URL(req.url).pathname.split("/").filter(Boolean).pop() ?? "";
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" } });
  }
  if (nome === "estado" && (req.method === "GET" || req.method === "POST")) {
    const r = await estado(req);
    r.headers.set("Access-Control-Allow-Origin", "*");
    return r;
  }
  if (nome === "sincronizar-tokens" && req.method === "POST") {
    const r = await sincronizarTokens(req);
    r.headers.set("Access-Control-Allow-Origin", "*");
    return r;
  }
  const hook = HOOKS[nome];
  if (!hook) return json({ error: "Desconhecido" }, 404);
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  let pedido = req;
  if (hook.tipo === "cron") {
    if (!cronAutorizado(req)) return json({ ok: false, mensagem: "Não autorizado" }, 401);
    // Automations stay disabled until migration and keys are validated (explicit switch).
    if (Deno.env.get("NL_CRON_ACTIVO") !== "1") return json({ ok: false, mensagem: "Automatismos inactivos" }, 423);
    // The ported handler still checks the origin's apikey header; it is satisfied only after our own check.
    const h = new Headers(req.headers);
    h.set("apikey", Deno.env.get("SUPABASE_ANON_KEY") ?? "");
    pedido = new Request(req.url, { method: "POST", headers: h, body: await req.arrayBuffer() });
  }
  try {
    const m = await hook.carregar();
    return await m.Route.options.server.handlers.POST({ request: pedido });
  } catch (e) {
    const msg = (e as Error).message ?? "";
    console.error(`[nl-hooks] ${nome} falhou:`, msg);
    // Missing server configuration: fail closed without processing anything.
    if (/em falta|não configurad/i.test(msg)) return json({ ok: false, mensagem: "Ligação não configurada" }, 503);
    return json({ ok: false, mensagem: "Erro interno" }, 500);
  }
});
