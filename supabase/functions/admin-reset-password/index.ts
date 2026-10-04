// Admin-only password reset. Requires a valid session of a user with the 'admin' role.
// Never called by the login flow; no default target or fixed password.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await admin.auth.getUser(auth.slice(7));
  if (authError || !user) return json({ error: "unauthorized" }, 401);

  const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
  if (!isAdmin) return json({ error: "forbidden" }, 403);

  const body = await req.json().catch(() => ({}));
  const userId = typeof body.userId === "string" ? body.userId : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
  if (!/^[0-9a-f-]{36}$/i.test(userId) || newPassword.length < 12 || newPassword.length > 128) {
    return json({ error: "userId e newPassword (12–128 caracteres) são obrigatórios" }, 400);
  }

  const { error } = await admin.auth.admin.updateUserById(userId, { password: newPassword });
  if (error) return json({ error: "update_failed" }, 500);
  return json({ success: true });
});
