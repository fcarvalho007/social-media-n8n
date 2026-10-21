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
    const { platform, ...payload } = await req.json();
    if (!["instagram", "linkedin"].includes(platform)) {
      throw new ErroSocial("Rede não suportada.", 400);
    }
    if (
      !Array.isArray(payload.images) || payload.images.length < 1 ||
      payload.images.length > 20 || !payload.images.every((u: unknown) =>
        typeof u === "string" && u.startsWith("https://")
      )
    ) {
      throw new ErroSocial("Ficheiros HTTPS inválidos.", 400);
    }
    const url = Deno.env.get(
      platform === "instagram"
        ? "N8N_INSTAGRAM_WEBHOOK_URL"
        : "N8N_LINKEDIN_WEBHOOK_URL",
    );
    const secret = Deno.env.get("N8N_WEBHOOK_SECRET");
    if (!url || !secret) {
      throw new ErroSocial("Integração ainda não configurada.");
    }
    const reserva = await reservarSocial(
      sb,
      user,
      payload.post_id,
      `${platform}:feed`,
      "publicar",
      {
        content: payload.caption_final ?? payload.body_final ?? "",
        media: payload.images,
      },
      corsHeaders,
    );
    if (reserva.repetida) {
      return reserva.repetida;
    }
    // Never retry a webhook after a timeout: it may have published already.
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Secret": secret,
          "Idempotency-Key": reserva.key!,
        },
        body: JSON.stringify({
          ...payload,
          user_id: user,
          idempotency_key: reserva.key,
        }),
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) {
        throw new Error("Webhook não confirmou a operação.");
      }
      const result = await response.json().catch(() =>
        null
      );
      if (!result || result.success === false || result.error) {
        throw new Error("Resposta do webhook não confirmada.");
      }
      const body = {
        success: true,
        pending: true,
        published: false,
        message: "Pedido aceite. Aguarda a confirmação no histórico.",
        result,
      };
      await concluirSocial(sb, reserva, "aceite", body, 200);
      return respostaSocial(body, 200, corsHeaders);
    } catch {
      const body = {
        success: false,
        fallback: false,
        error: {
          message:
            "Resultado por confirmar. Não repitas o envio; consulta o histórico.",
          code: "PUBLICATION_UNCONFIRMED",
          isRetryable: false,
        },
      };
      await concluirSocial(sb, reserva, "incerto", body, 409);
      return respostaSocial(body, 409, corsHeaders);
    }
  } catch (e) {
    return erroSocial(e, corsHeaders);
  }
});
