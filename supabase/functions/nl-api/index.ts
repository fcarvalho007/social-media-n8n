// Gateway for the ported newsletter server functions.
// Every call: valid session + newsletter staff role. Send/publish actions additionally require admin
// and an explicit confirmation flag from the UI. Secrets are read only from server env.
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { MODULES } from "../_shared/nl-app/registry.ts";
import { requestStore, runServerFn, type NlServerFn } from "../_shared/nl-app/_shim/start.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b ?? null), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

// Actions that send email, publish to WordPress or change live distribution.
const ENVIO = /^(envio|destinos|revista-web|brief|subscricao):(disparar|preparar|repetir|finalizar|publicar|sincronizar|agendar|enviar)/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);
  const auth = req.headers.get("Authorization");
  if (!auth) return json({ error: "Sessão em falta" }, 401);

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return json({ error: "Sessão inválida" }, 401);
  const { data: staff } = await sb.rpc("nl_is_staff");
  if (!staff) return json({ error: "Sem permissão" }, 403);

  const body = await req.json().catch(() => null) as { id?: unknown; data?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id : "";
  const m = /^([a-z0-9-]+):([A-Za-z0-9_]+)$/.exec(id);
  if (!m) return json({ error: "Pedido inválido" }, 400);
  const fn = MODULES[m[1]]?.[m[2]] as NlServerFn | undefined;
  if (!fn || (fn as { __nl?: boolean }).__nl !== true) return json({ error: "Função desconhecida" }, 404);

  if (ENVIO.test(id)) {
    const { data: admin } = await sb.rpc("nl_is_admin");
    if (!admin) return json({ error: "Apenas administradores podem enviar ou publicar" }, 403);
  }

  try {
    const out = await requestStore.run(req, () => runServerFn(fn, body?.data ?? null));
    return json(out);
  } catch (e) {
    const msg = (e as Error).message ?? "Erro";
    const st = /unauthori/i.test(msg) ? 401 : /permiss/i.test(msg) ? 403 : 500;
    return json({ error: msg }, st);
  }
});
