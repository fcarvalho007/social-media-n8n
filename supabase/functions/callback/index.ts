import { createClient } from "npm:@supabase/supabase-js@2.98.0";
import {
  ErroSocial,
  erroSocial,
  exigirEditor,
  respostaSocial,
} from "../_shared/social-seguro.ts";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const user = await exigirEditor(req, sb);
    if (req.method !== "POST") {
      throw new ErroSocial("Método não permitido.", 405);
    }
    const { post_id, status, notes } = await req.json();
    if (status !== "rejected" || typeof post_id !== "string") {
      throw new ErroSocial("Esta operação apenas regista uma recusa.", 400);
    }
    const { data: post, error } = await sb.from("posts").select(
      "id,workflow_id,status,user_id",
    ).eq("id", post_id).eq("user_id", user).single();
    if (error || !post) throw new ErroSocial("Publicação inacessível.", 403);
    const saved = await sb.from("posts").update({
      status: "rejected",
      notes: typeof notes === "string" ? notes.slice(0, 4000) : null,
      reviewed_at: new Date().toISOString(),
    }).eq("id", post_id).eq("user_id", user);
    if (saved.error) throw new ErroSocial("Não foi possível guardar a recusa.");
    // No outbound publishing webhook is called by a rejection.
    return respostaSocial({ success: true, post_id }, 200, cors);
  } catch (e) {
    return erroSocial(e, cors);
  }
});
