// Gateway for the ported newsletter server functions.
// Every call: valid session + newsletter staff role, then the explicit per-operation map in
// _shared/nl-ops.ts (leitura/editor/admin/externa). External actions require admin and a
// confirmation token equal to the operation id, sent only after the UI dialog. Secrets are read only from server env.
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { MODULES } from "../_shared/nl-app/registry.ts";
import { NL_OPS } from "../_shared/nl-ops.ts";
import { requestStore, runServerFn, type NlServerFn } from "../_shared/nl-app/_shim/start.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b ?? null), { status: s, headers: { ...cors, "Content-Type": "application/json" } });


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

  const body = await req.json().catch(() => null) as { id?: unknown; data?: unknown; confirmar?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id : "";
  const m = /^([a-z0-9-]+):([A-Za-z0-9_]+)$/.exec(id);
  if (!m) return json({ error: "Pedido inválido" }, 400);
  const fn = MODULES[m[1]]?.[m[2]] as NlServerFn | undefined;
  if (!fn || (fn as { __nl?: boolean }).__nl !== true) return json({ error: "Função desconhecida" }, 404);

  // Fail closed: every operation must be classified in the explicit map.
  const op = NL_OPS[id];
  if (!op) return json({ error: "Operação sem classificação de acesso" }, 403);
  if (op.nivel === "admin" || op.nivel === "externa") {
    const { data: admin } = await sb.rpc("nl_is_admin");
    if (!admin) return json({ error: op.nivel === "externa" ? "Apenas administradores podem enviar ou publicar" : "Apenas administradores" }, 403);
  }
  // External actions need the confirmation token for THIS operation, set only after the UI dialog.
  if (op.nivel === "externa" && body?.confirmar !== id) return json({ error: "Confirmação explícita em falta", confirmar: op.confirmar }, 428);

  try {
    const out = await requestStore.run(req, () => runServerFn(fn, body?.data ?? null));
    // After a send is closed/reconciled, process derived-content jobs in the background
    // (bounded; never inside the send response path).
    if (id === "envio:finalizarEnvioFn" || id === "envio:reconciliarEdicaoFn") {
      const bg = import("../_shared/conteudos/jobs.server.ts").then((m) => m.processarJobs(2)).catch(() => {});
      (globalThis as { EdgeRuntime?: { waitUntil: (p: Promise<unknown>) => void } }).EdgeRuntime?.waitUntil(bg);
    }
    return json(out);
  } catch (e) {
    const msg = (e as Error).message ?? "Erro";
    const st = /unauthori/i.test(msg) ? 401 : /permiss/i.test(msg) ? 403 : 500;
    return json({ error: msg }, st);
  }
});
