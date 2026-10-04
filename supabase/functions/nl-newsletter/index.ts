// Newsletter server entry. Uses the ported original engine (_shared/newsletter-engine).
// Exposes read-only actions only (preview). Sending to E-goi / WordPress is NOT wired here
// until explicitly enabled; secrets live exclusively in server env.
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { renderEdicaoEmail } from "../_shared/newsletter-engine/render.server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const UUID = /^[0-9a-f-]{36}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const auth = req.headers.get("Authorization");
  if (!auth) return json({ error: "Sessão em falta" }, 401);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return json({ error: "Sessão inválida" }, 401);
  const { data: staff } = await sb.rpc("nl_is_staff");
  if (!staff) return json({ error: "Sem permissão" }, 403);

  const body = await req.json().catch(() => ({}));
  try {
    if (body.acao === "preview") {
      if (!UUID.test(String(body.edicao_id))) return json({ error: "Edição inválida" }, 400);
      const r = await renderEdicaoEmail(body.edicao_id);
      return json(r);
    }
    return json({ error: "Ação não disponível" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
