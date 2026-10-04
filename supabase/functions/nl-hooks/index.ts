// Inbound hooks of the newsletter (ported origin handlers), each with its own authentication:
// - cron tasks: x-nl-cron secret (NL_CRON_SEGREDO) or service-role bearer, and only when NL_CRON_ACTIVO=1;
// - email-newsletter: HTTP Basic (CLOUDMAILIN_AUTH_USER/PASS), checked inside the ported handler;
// - egoi-subscricao: ?k= shared key (NL_EGOI_WEBHOOK_CHAVE), checked inside the ported handler.
// GET /estado (admin session): presence of configuration only, never values.
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";
import { baseFuncoes, basePublica, campoTokenEgoi, idCampoValido, resolverCampoLista, tagTokenEgoi } from "../_shared/nl-publico-config.ts";
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

// deno-lint-ignore no-explicit-any
async function validacoes(sb: { from: (t: string) => any }): Promise<Record<string, { validado: boolean; detalhe: string }>> {
  const [l, t] = await Promise.all([
    sb.from("nl_egoi_listas").select("egoi_lista_id, campo_token_id").eq("activa", true).eq("tipo", "real"),
    sb.from("nl_egoi_tokens_sync").select("egoi_lista_id, campo_id, estado, campo_validado, verificado_leitura"),
  ]);
  if (l.error || t.error) return { egoi_tokens: { validado: false, detalhe: "Não foi possível ler o estado da sincronização." } };
  const listas = (l.data ?? []) as Array<{ egoi_lista_id: string; campo_token_id: number | null }>;
  const sync = (t.data ?? []) as Array<{ egoi_lista_id: string; campo_id: number; estado: string; campo_validado: boolean; verificado_leitura: boolean }>;
  // Each list counts only with ITS OWN resolved field.
  const ok = listas.filter((x) => {
    const c = resolverCampoLista(x)?.campo;
    return c && sync.some((s) => s.egoi_lista_id === x.egoi_lista_id && s.campo_id === c && s.estado === "concluida" && s.campo_validado && s.verificado_leitura);
  }).length;
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
  const { data: lt } = await sb.from("nl_egoi_listas").select("id, nome, egoi_lista_id, campo_token_id, campo_token_nome").eq("activa", true).eq("tipo", "real").order("ordem");
  const listasToken = ((lt ?? []) as Array<{ id: string; nome: string; egoi_lista_id: string; campo_token_id: number | null; campo_token_nome: string | null }>).map((x) => {
    const r = resolverCampoLista(x);
    return { id: x.id, nome: x.nome, egoi_lista_id: x.egoi_lista_id, campo: r?.campo ?? null, origem: r?.origem ?? null, campo_nome: x.campo_token_nome };
  });
  return json({
    endereco_publico: basePublica() || null,
    tag_token_egoi: tagTokenEgoi() || null,
    listas_token: listasToken,
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
      FREDERICO_WP_URL: tem("FREDERICO_WP_URL"),
      FREDERICO_WP_USER: tem("FREDERICO_WP_USER"),
      FREDERICO_WP_APP_PASSWORD: tem("FREDERICO_WP_APP_PASSWORD"),
      PEXELS_API_KEY: tem("PEXELS_API_KEY"),
      LOVABLE_API_KEY: tem("LOVABLE_API_KEY"),
      FAL_KEY: tem("FAL_KEY"),
      GETLATE_API_TOKEN: tem("GETLATE_API_TOKEN"),
      RESEND_API_KEY: tem("RESEND_API_KEY"),
      NL_PUBLIC_BASE_URL: /^https:\/\//.test(basePublica()),
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
  const { data: listasRaw } = await srv.from("nl_egoi_listas").select("nome, egoi_lista_id, campo_token_id").eq("tipo", "real").eq("activa", true);
  const listas = (listasRaw ?? []) as Array<{ nome: string; egoi_lista_id: string; campo_token_id: number | null }>;
  const campoDe = (l: { campo_token_id: number | null }) => resolverCampoLista(l)?.campo ?? null;
  const segredo = Deno.env.get("SUBSCRICAO_SEGREDO") ?? "";
  const { data: cfg } = await srv.from("nl_configuracoes").select("valor").eq("chave", "egoi_api_key").maybeSingle();
  const apiKey = (cfg as { valor?: string } | null)?.valor || Deno.env.get("EGOI_API_KEY") || "";
  const armazem = armazemSupabase(srv);
  const lerProgresso = async () => Promise.all(listas.map(async (l) => {
    const campo = campoDe(l);
    const p = campo ? await armazem.ler(l.egoi_lista_id, campo) : null;
    return { nome: l.nome, egoi_lista_id: l.egoi_lista_id, campo, progresso: p, falhas_pendentes: p && campo ? await armazem.contarFalhas(l.egoi_lista_id, campo) : 0 };
  }));

  if (!segredo || !apiKey) {
    return json({ ok: false, configurado: false, tag: null, listas: await lerProgresso(), problemas: ["Faltam EGOI_API_KEY ou SUBSCRICAO_SEGREDO."] }, accao === "estado" ? 200 : 412);
  }
  const fp = await impressaoSegredo(segredo);
  const deps = { egoi: clienteEgoiHttp(apiKey), armazem, criarToken: (await import("../_shared/nl-app/lib/subscricao.server.ts")).criarToken };

  if (accao === "estado") {
    const { problemasPorLista } = await import("../_shared/nl-egoi-tokens-gate.ts");
    const problemas = await problemasPorLista(deps, listas, fp);
    return json({ ok: problemas.length === 0, configurado: listas.every((l) => campoDe(l)), tag: null, listas: await lerProgresso(), problemas });
  }

  const pedidas = typeof corpo?.lista === "string" ? listas.filter((l) => l.egoi_lista_id === corpo.lista) : listas;
  if (!pedidas.length) return json({ error: "Lista desconhecida" }, 400);
  // Lists without their own field are skipped (never written with another list's field).
  const alvo = pedidas.filter((l) => campoDe(l));
  if (!alvo.length) return json({ error: "Nenhuma destas listas tem o campo do token configurado." }, 412);
  try {
    if (accao === "repetir-falhas") {
      const r = [];
      for (const l of alvo) r.push({ lista: l.egoi_lista_id, ...(await repetirFalhas(deps, { lista: l.egoi_lista_id, campo: campoDe(l)!, fp })) });
      return json({ ok: true, resultados: r, listas: await lerProgresso() });
    }
    // One limited batch per call: the first list not yet finished (or with new contacts).
    const recomecar = accao === "recomecar";
    if (recomecar && alvo.length !== 1) return json({ error: "Recomeçar exige uma lista concreta" }, 400);
    let resultado = null;
    for (const l of alvo) {
      const campo = campoDe(l)!;
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

/**
 * Read-only discovery of E-goi extra fields per active real list (GET /lists/{id}/fields only).
 * Never creates fields, writes contacts or sends; returns names/ids/formats, never the API key.
 */
async function camposEgoi(req: Request): Promise<Response> {
  const negado = await adminSessao(req);
  if (negado) return negado;
  const srv = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: listasRaw } = await srv.from("nl_egoi_listas").select("id, nome, egoi_lista_id, campo_token_id").eq("tipo", "real").eq("activa", true).order("ordem");
  const listas = (listasRaw ?? []) as Array<{ id: string; nome: string; egoi_lista_id: string; campo_token_id: number | null }>;
  const { data: cfg } = await srv.from("nl_configuracoes").select("valor").eq("chave", "egoi_api_key").maybeSingle();
  const apiKey = (cfg as { valor?: string } | null)?.valor || Deno.env.get("EGOI_API_KEY") || "";
  if (!apiKey) return json({ ok: false, problema: "Falta a chave da API da E-goi (EGOI_API_KEY)." });
  const egoi = clienteEgoiHttp(apiKey);
  const resultado = await Promise.all(listas.map(async (l) => {
    try {
      const campos = (await egoi.lerCampos(l.egoi_lista_id)).filter((c) => c.type === "extra");
      return {
        id: l.id, nome: l.nome, egoi_lista_id: l.egoi_lista_id, campo_atual: resolverCampoLista(l)?.campo ?? null,
        campos: campos.map((c) => ({ id: Number(c.field_id), nome: c.name, formato: c.format, texto: c.format === "text", dedicado: campoDedicado(c) })),
      };
    } catch (e) {
      return { id: l.id, nome: l.nome, egoi_lista_id: l.egoi_lista_id, campo_atual: resolverCampoLista(l)?.campo ?? null, erro: (e as Error).message.slice(0, 120), campos: [] };
    }
  }));
  return json({ ok: true, legado: campoTokenEgoi(), listas: resultado });
}

/** A dedicated token field: extra, text format, and named for the token (never a regular contact field). */
function campoDedicado(c: { type: string; format: string; name: string }): boolean {
  return c.type === "extra" && c.format === "text" && /token/i.test(c.name);
}

/**
 * Saves the token field id of ONE list (admin session, explicit confirmation). The id must exist in that
 * list, live, as a dedicated text field; nothing is written to E-goi. campo_id null clears the mapping.
 */
async function guardarCampoLista(req: Request): Promise<Response> {
  const negado = await adminSessao(req);
  if (negado) return negado;
  const corpo = await req.json().catch(() => null) as { lista_id?: unknown; campo_id?: unknown; confirmar?: unknown } | null;
  if (corpo?.confirmar !== "configurar-campo-token") return json({ error: "Confirmação explícita em falta" }, 428);
  if (typeof corpo.lista_id !== "string" || !/^[0-9a-f-]{36}$/i.test(corpo.lista_id)) return json({ error: "Lista inválida" }, 400);
  const limpar = corpo.campo_id === null;
  if (!limpar && !idCampoValido(corpo.campo_id)) return json({ error: "Identificador de campo inválido" }, 400);
  const srv = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: l } = await srv.from("nl_egoi_listas").select("id, nome, egoi_lista_id, tipo, activa").eq("id", corpo.lista_id).maybeSingle();
  const lista = l as { id: string; nome: string; egoi_lista_id: string; tipo: string; activa: boolean } | null;
  if (!lista || !lista.activa) return json({ error: "Lista desconhecida ou inativa" }, 404);
  if (limpar) {
    const { error } = await srv.from("nl_egoi_listas").update({ campo_token_id: null, campo_token_nome: null }).eq("id", lista.id);
    return error ? json({ error: "Não foi possível guardar" }, 500) : json({ ok: true });
  }
  const { data: cfg } = await srv.from("nl_configuracoes").select("valor").eq("chave", "egoi_api_key").maybeSingle();
  const apiKey = (cfg as { valor?: string } | null)?.valor || Deno.env.get("EGOI_API_KEY") || "";
  if (!apiKey) return json({ error: "Falta a chave da API da E-goi (EGOI_API_KEY)." }, 412);
  let campos;
  try { campos = await clienteEgoiHttp(apiKey).lerCampos(lista.egoi_lista_id); } catch { return json({ error: "Não foi possível ler os campos na E-goi." }, 502); }
  const f = campos.find((c) => c.type === "extra" && Number(c.field_id) === corpo.campo_id);
  if (!f) return json({ error: `O campo ${corpo.campo_id} não existe na lista «${lista.nome}».` }, 422);
  if (!campoDedicado(f)) return json({ error: `O campo «${f.name}» não é um campo de texto dedicado ao token (o nome tem de conter «token»).` }, 422);
  const { error } = await srv.from("nl_egoi_listas").update({ campo_token_id: corpo.campo_id, campo_token_nome: f.name.slice(0, 120) }).eq("id", lista.id);
  if (error) return json({ error: "Não foi possível guardar" }, 500);
  await srv.from("nl_audit_log").insert({ quem: "admin", accao: `Campo do token da lista «${lista.nome}» definido`, detalhe: `campo ${corpo.campo_id} (${f.name})` });
  return json({ ok: true, campo: corpo.campo_id, nome: f.name });
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
  if (nome === "campo-token-lista" && req.method === "POST") {
    const r = await guardarCampoLista(req);
    r.headers.set("Access-Control-Allow-Origin", "*");
    return r;
  }
  if (nome === "campos-egoi" && req.method === "GET") {
    const r = await camposEgoi(req);
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
