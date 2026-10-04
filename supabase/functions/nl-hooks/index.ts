// Inbound hooks of the newsletter (ported origin handlers), each with its own authentication:
// - cron tasks: x-nl-cron secret (NL_CRON_SEGREDO) or service-role bearer, and only when NL_CRON_ACTIVO=1;
// - email-newsletter: HTTP Basic (CLOUDMAILIN_AUTH_USER/PASS), checked inside the ported handler;
// - egoi-subscricao: ?k= shared key (NL_EGOI_WEBHOOK_CHAVE), checked inside the ported handler.
// GET /estado (admin session): presence of configuration only, never values.
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";
import { baseFuncoes, basePublica, campoTokenEgoi, tagTokenEgoi } from "../_shared/nl-publico-config.ts";
import { clienteEgoiHttp, executarLote, impressaoSegredo, repetirFalhas, verificarProntidao } from "../_shared/nl-egoi-tokens.ts";
import { armazemSupabase } from "../_shared/nl-egoi-tokens-armazem.ts";

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

async function validacoes(sb: ReturnType<typeof createClient>): Promise<Record<string, { validado: boolean; detalhe: string }>> {
  const [l, t] = await Promise.all([
    sb.from("nl_egoi_listas").select("egoi_lista_id").eq("activa", true),
    sb.from("nl_egoi_tokens_sync").select("egoi_lista_id, estado, campo_validado, verificado_leitura"),
  ]);
  if (l.error || t.error) return { egoi_tokens: { validado: false, detalhe: "Não foi possível ler o estado da sincronização." } };
  const listas = (l.data ?? []) as Array<{ egoi_lista_id: string }>;
  const sync = (t.data ?? []) as Array<{ egoi_lista_id: string; estado: string; campo_validado: boolean; verificado_leitura: boolean }>;
  const ok = listas.filter((x) => sync.some((s) => s.egoi_lista_id === x.egoi_lista_id && s.estado === "concluida" && s.campo_validado && s.verificado_leitura)).length;
  return {
    egoi_tokens: listas.length === 0
      ? { validado: false, detalhe: "Sem listas E-goi ativas registadas." }
      : { validado: ok === listas.length, detalhe: `${ok} de ${listas.length} listas com tokens sincronizados e confirmados por leitura.` },
  };
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
      WORDPRESS_SITE_URL: tem("WORDPRESS_SITE_URL"),
      WORDPRESS_APP_USER: tem("WORDPRESS_APP_USER"),
      WORDPRESS_APP_PASSWORD: tem("WORDPRESS_APP_PASSWORD"),
      PEXELS_API_KEY: tem("PEXELS_API_KEY"),
    },
    // Validation evidence only from real recorded state; "configured" never implies "validated".
    validacoes: await validacoes(sb),
    endpoints: {
      email_entrada: `${f}/nl-hooks/email-newsletter`,
      egoi_cancelamentos: `${f}/nl-hooks/egoi-subscricao?k=<NL_EGOI_WEBHOOK_CHAVE>`,
      um_clique: `${f}/nl-publico/unsubscribe`,
      sitemap: `${f}/nl-publico/sitemap.xml`,
      automatismos: Object.entries(HOOKS).filter(([, h]) => h.tipo === "cron").map(([n]) => `${f}/nl-hooks/${n}`),
    },
  });
}

async function adminSessao(req: Request): Promise<Response | null> {
  const auth = req.headers.get("Authorization");
  if (!auth) return json({ error: "Sessão em falta" }, 401);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return json({ error: "Sessão inválida" }, 401);
  const { data: admin } = await sb.rpc("nl_is_admin");
  if (!admin) return json({ error: "Apenas administradores" }, 403);
  return null;
}

/**
 * Token sync, resumable and durable per list + field (see _shared/nl-egoi-tokens.ts).
 * accao: "estado" (read-only progress + live readiness), "lote" (next limited batch from the saved offset),
 * "repetir-falhas", "recomecar" (explicit reset of one list). Writes need admin + confirmar:"sincronizar-tokens".
 */
async function sincronizarTokens(req: Request): Promise<Response> {
  const negado = await adminSessao(req);
  if (negado) return negado;
  const corpo = await req.json().catch(() => null) as { accao?: unknown; confirmar?: unknown; lista?: unknown } | null;
  const accao = typeof corpo?.accao === "string" ? corpo.accao : "lote";
  if (!["estado", "lote", "repetir-falhas", "recomecar"].includes(accao)) return json({ error: "Ação inválida" }, 400);
  if (accao !== "estado" && corpo?.confirmar !== "sincronizar-tokens") return json({ error: "Confirmação explícita em falta" }, 428);

  const srv = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: listasRaw } = await srv.from("nl_egoi_listas").select("nome, egoi_lista_id").eq("tipo", "real").eq("activa", true);
  const listas = (listasRaw ?? []) as Array<{ nome: string; egoi_lista_id: string }>;
  const campo = campoTokenEgoi();
  const segredo = Deno.env.get("SUBSCRICAO_SEGREDO") ?? "";
  const { data: cfg } = await srv.from("nl_configuracoes").select("valor").eq("chave", "egoi_api_key").maybeSingle();
  const apiKey = (cfg as { valor?: string } | null)?.valor || Deno.env.get("EGOI_API_KEY") || "";
  const armazem = armazemSupabase(srv);
  const lerProgresso = async () => Promise.all(listas.map(async (l) => {
    const p = campo ? await armazem.ler(l.egoi_lista_id, campo) : null;
    return { nome: l.nome, egoi_lista_id: l.egoi_lista_id, progresso: p, falhas_pendentes: p && campo ? await armazem.contarFalhas(l.egoi_lista_id, campo) : 0 };
  }));

  if (!campo || !segredo || !apiKey) {
    return json({ ok: false, configurado: false, tag: tagTokenEgoi() || null, listas: await lerProgresso(), problemas: ["Faltam EGOI_API_KEY, NL_EGOI_CAMPO_TOKEN_ID ou SUBSCRICAO_SEGREDO."] }, accao === "estado" ? 200 : 412);
  }
  const fp = await impressaoSegredo(segredo);
  const deps = { egoi: clienteEgoiHttp(apiKey), armazem, criarToken: (await import("../_shared/nl-app/lib/subscricao.server.ts")).criarToken };

  if (accao === "estado") {
    const problemas = await verificarProntidao(deps, { listas, campo, fp });
    return json({ ok: problemas.length === 0, configurado: true, tag: tagTokenEgoi() || null, listas: await lerProgresso(), problemas });
  }

  const alvo = typeof corpo?.lista === "string" ? listas.filter((l) => l.egoi_lista_id === corpo.lista) : listas;
  if (!alvo.length) return json({ error: "Lista desconhecida" }, 400);
  try {
    if (accao === "repetir-falhas") {
      const r = [];
      for (const l of alvo) r.push({ lista: l.egoi_lista_id, ...(await repetirFalhas(deps, { lista: l.egoi_lista_id, campo, fp })) });
      return json({ ok: true, resultados: r, listas: await lerProgresso() });
    }
    // One limited batch per call: the first list not yet finished (or with new contacts).
    const recomecar = accao === "recomecar";
    if (recomecar && alvo.length !== 1) return json({ error: "Recomeçar exige uma lista concreta" }, 400);
    let resultado = null;
    for (const l of alvo) {
      const p = await armazem.ler(l.egoi_lista_id, campo);
      if (!recomecar && p && p.estado === "concluida" && p.segredo_fp === fp) {
        const vivo = await deps.egoi.listar(l.egoi_lista_id, 0, 1, campo).catch(() => null);
        if (vivo && vivo.total !== null && vivo.total <= p.offset_proximo) continue;
      }
      resultado = await executarLote(deps, { lista: l.egoi_lista_id, campo, fp, recomecar, limite: 300, prazoMs: 35_000 });
      break;
    }
    return json({ ok: true, resultado, terminado: resultado === null, listas: await lerProgresso() });
  } catch (e) {
    console.error("[nl-hooks] sincronizar-tokens:", (e as Error).message);
    return json({ ok: false, error: "Falha na comunicação com a E-goi; o progresso guardado mantém-se." }, 502);
  }
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
