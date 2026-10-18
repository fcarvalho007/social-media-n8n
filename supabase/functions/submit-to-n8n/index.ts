import { createClient } from "npm:@supabase/supabase-js@2.98.0";
import {
  concluirSocial,
  ErroSocial,
  erroSocial,
  exigirEditor,
  reservarSocial,
  respostaSocial,
} from "../_shared/social-seguro.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Approval is an external write too: one durable reservation, one webhook call.
const WEBHOOKS: Record<string, string> = {
  instagram_carousel: "aprovacao-instagram",
  instagram_image: "aprovacao-instagram",
  instagram_reel: "aprovacao-instagram",
  instagram_stories: "aprovacao-stories",
  linkedin: "aprovacao-linkedin",
  linkedin_post: "aprovacao-linkedin",
  linkedin_document: "aprovacao-linkedin",
};
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return respostaSocial({ success: false }, 405, corsHeaders);
  }
  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const user = await exigirEditor(req, sb);
    const body = await req.json();
    const route = WEBHOOKS[body.platform];
    if (!route) {
      throw new ErroSocial(
        "Aprovação externa ainda não configurada para esta rede.",
        400,
      );
    }
    if (
      !Array.isArray(body.media_urls) || body.media_urls.length > 20 ||
      !body.media_urls.every((u: unknown) =>
        typeof u === "string" && u.startsWith("https://")
      )
    ) throw new ErroSocial("Ficheiros HTTPS inválidos.", 400);
    const secret = Deno.env.get("N8N_WEBHOOK_SECRET");
    if (!secret) {
      throw new ErroSocial("Integração de aprovação ainda não configurada.");
    }
    const reserva = await reservarSocial(
      sb,
      user,
      body.post_id,
      `${body.platform.split("_")[0]}:${
        body.platform.endsWith("_stories")
          ? "story"
          : body.platform.endsWith("_reel")
          ? "reel"
          : "feed"
      }`,
      "aprovar",
      { content: body.caption, media: body.media_urls },
      corsHeaders,
    );
    if (reserva.repetida) return reserva.repetida;
    try {
      const url = `${
        Deno.env.get("N8N_APPROVAL_BASE_URL") ??
          "https://n8n.srv881120.hstgr.cloud/webhook"
      }/${route}`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Secret": secret,
          "Idempotency-Key": reserva.key!,
        },
        body: JSON.stringify({
          ...body,
          user_id: user,
          idempotency_key: reserva.key,
          status: "pending_approval",
        }),
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) throw new Error("Resposta não confirmada.");
      const bodyResult = {
        success: true,
        pending: true,
        message: "Pedido de aprovação aceite.",
        post_id: body.post_id,
      };
      await concluirSocial(sb, reserva, "aceite", bodyResult, 200);
      return respostaSocial(bodyResult, 200, corsHeaders);
    } catch {
      const result = {
        success: false,
        fallback: false,
        error:
          "O pedido pode ter sido recebido. Consulta o histórico antes de repetir.",
      };
      await concluirSocial(sb, reserva, "incerto", result, 409);
      return respostaSocial(result, 409, corsHeaders);
    }
  } catch (e) {
    return erroSocial(e, corsHeaders);
  }
});
