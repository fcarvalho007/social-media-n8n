import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.83.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_NETWORKS = new Set(["instagram", "linkedin", "youtube", "tiktok", "facebook", "googlebusiness", "x"]);
const ALLOWED_TONES = new Set(["direto", "emocional", "técnico", "neutro", "mais_curto", "mais_forte"]);

type RequestBody = {
  text?: string;
  network?: string;
  tone?: string;
  formats?: string[];
  rawTranscription?: string;
  language?: string;
};

const responseJson = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function validateBody(body: RequestBody) {
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (text.length < 10) return { valid: false, status: 400, error: "A legenda precisa de pelo menos 10 caracteres." };
  if (text.length > 8000) return { valid: false, status: 400, error: "A legenda é demasiado longa para reescrita automática." };

  const network = typeof body.network === "string" && ALLOWED_NETWORKS.has(body.network) ? body.network : "instagram";
  const tone = typeof body.tone === "string" && ALLOWED_TONES.has(body.tone) ? body.tone : "neutro";
  const formats = Array.isArray(body.formats) ? body.formats.filter((format): format is string => typeof format === "string").slice(0, 12) : [];
  const rawTranscription = typeof body.rawTranscription === "string" ? body.rawTranscription.trim().slice(0, 5000) : "";

  return { valid: true, text, network, tone, formats, rawTranscription };
}

const toneGuidance: Record<string, string> = {
  direto: "mais claro, objetivo e sem rodeios, mantendo naturalidade",
  emocional: "mais humano, próximo e emocional, sem exagero ou sentimentalismo artificial",
  técnico: "mais preciso, estruturado e profissional, sem jargão desnecessário",
  neutro: "equilibrado, natural e editorialmente limpo",
  mais_curto: "mais curto e denso, preservando a ideia central",
  mais_forte: "mais assertivo, memorável e persuasivo, sem promessas inventadas",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return responseJson({ success: false, error: "Tens de iniciar sessão para usar a reescrita com IA." }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return responseJson({ success: false, error: "Sessão inválida. Inicia sessão novamente." }, 401);
    }

    const body = (await req.json()) as RequestBody;
    const validated = validateBody(body);
    if (!validated.valid) return responseJson({ success: false, error: validated.error }, validated.status);

    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) return responseJson({ success: false, error: "Serviço de IA não configurado." }, 500);

    const systemPrompt = "És um editor sénior de redes sociais. Reescreves legendas em português de Portugal, Acordo Ortográfico de 1990. Nunca uses português do Brasil. Não inventes factos, métricas, resultados, nomes, datas, preços ou promessas. Mantém hashtags, URLs e menções quando fizerem sentido. Devolve apenas a legenda final.";
    const userPrompt = `Rede alvo: ${validated.network}\nFormatos: ${validated.formats.join(", ") || "não especificado"}\nTom pretendido: ${validated.tone} — ${toneGuidance[validated.tone]}\nIdioma: pt-PT\n${validated.rawTranscription ? `Contexto da transcrição:\n${validated.rawTranscription}\n\n` : ""}Legenda atual:\n${validated.text}\n\nReescreve a legenda para o tom indicado. Mantém o sentido, não acrescentes factos novos e evita linguagem genérica.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[ai-caption-rewriter] gateway error", aiResponse.status, errorText);
      const message = aiResponse.status === 429
        ? "Limite de IA atingido. Tenta novamente daqui a pouco."
        : aiResponse.status === 402
          ? "Créditos de IA insuficientes."
          : "A reescrita com IA está indisponível. Tenta novamente.";
      return responseJson({ success: false, error: message }, aiResponse.status === 402 || aiResponse.status === 429 ? aiResponse.status : 500);
    }

    const aiData = await aiResponse.json();
    const rewrittenText = String(aiData.choices?.[0]?.message?.content || "").trim();
    if (!rewrittenText) return responseJson({ success: false, error: "A IA não devolveu uma versão válida." }, 422);

    return responseJson({
      success: true,
      rewrittenText,
      metadata: {
        network: validated.network,
        tone: validated.tone,
        source: "caption_rewriter",
        created_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[ai-caption-rewriter] error", error);
    return responseJson({ success: false, error: error instanceof Error ? error.message : "Erro interno na reescrita com IA." }, 500);
  }
});
