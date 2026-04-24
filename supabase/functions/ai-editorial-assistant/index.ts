import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.83.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
const ALLOWED_NETWORKS = new Set(["instagram", "linkedin", "youtube", "tiktok", "facebook", "googlebusiness", "x"]);

type RequestBody = {
  fileBase64?: string;
  fileName?: string;
  mimeType?: string;
  networks?: string[];
  language?: string;
};

const responseJson = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const stripDataUrlPrefix = (value: string) => value.replace(/^data:[^;]+;base64,/, "");

const decodeBase64 = (value: string) => {
  const binary = atob(stripDataUrlPrefix(value));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const validateRequestBody = (body: RequestBody) => {
  if (!body.fileBase64 || typeof body.fileBase64 !== "string") {
    return { valid: false, status: 400, error: "Ficheiro de vídeo em falta." };
  }

  const mimeType = typeof body.mimeType === "string" && body.mimeType.trim() ? body.mimeType : "video/mp4";
  if (!mimeType.startsWith("video/") && !mimeType.startsWith("audio/")) {
    return { valid: false, status: 400, error: "O assistente só aceita vídeo ou áudio." };
  }

  const networks = Array.isArray(body.networks)
    ? body.networks.filter((network): network is string => typeof network === "string" && ALLOWED_NETWORKS.has(network))
    : [];

  return {
    valid: true,
    mimeType,
    fileName: typeof body.fileName === "string" && body.fileName.trim() ? body.fileName : "video.mp4",
    networks: networks.length > 0 ? Array.from(new Set(networks)) : ["instagram"],
  };
};

const buildFallbackResult = (transcription: string, networks: string[]) => {
  const lead = transcription.trim().split(/[.!?\n]/).find(Boolean)?.trim() || "Nova publicação";
  const caption = `${lead}\n\n${transcription.trim()}`.slice(0, 1800);
  return {
    draft_title: lead.slice(0, 80),
    base_caption: caption,
    captions_per_network: Object.fromEntries(networks.map((network) => [network, caption])),
    hashtags: { reach: [], niche: [], brand: [] },
    first_comment: "Que parte deste tema fez mais sentido para ti?",
    alt_text: "Vídeo vertical com uma pessoa a comunicar uma mensagem para redes sociais.",
    key_quotes: [],
    raw_transcription: transcription,
  };
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return responseJson({ success: false, error: "Tens de iniciar sessão para usar o assistente de IA." }, 401);
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
    const validated = validateRequestBody(body);
    if (!validated.valid) return responseJson({ success: false, error: validated.error }, validated.status);
    const { networks, mimeType, fileName } = validated;

    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAiKey) return responseJson({ success: false, error: "Serviço de transcrição não configurado." }, 500);

    const bytes = decodeBase64(body.fileBase64);
    if (bytes.byteLength > MAX_VIDEO_BYTES) {
      return responseJson({ success: false, error: "O vídeo é demasiado grande para transcrição automática. Usa um ficheiro até 25MB." }, 413);
    }

    const transcriptionForm = new FormData();
    transcriptionForm.append("file", new File([bytes], fileName, { type: mimeType }));
    transcriptionForm.append("model", "whisper-1");
    transcriptionForm.append("language", (body.language || "pt").slice(0, 2));
    transcriptionForm.append("response_format", "json");

    const transcriptionResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openAiKey}` },
      body: transcriptionForm,
    });

    if (!transcriptionResponse.ok) {
      const errorText = await transcriptionResponse.text();
      console.error("[ai-editorial-assistant] transcription error", transcriptionResponse.status, errorText);
      return responseJson({ success: false, error: "Não foi possível transcrever o vídeo. Tenta novamente." }, transcriptionResponse.status === 429 ? 429 : 500);
    }

    const transcriptionData = await transcriptionResponse.json();
    const rawTranscription = String(transcriptionData.text || "").trim();
    if (!rawTranscription) return responseJson({ success: false, error: "Não foi detetado áudio útil no vídeo." }, 422);

    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) {
      return responseJson({ success: true, result: buildFallbackResult(rawTranscription, networks), warning: "IA editorial indisponível; foi usada a transcrição." });
    }

    const systemPrompt = `És um assistente editorial para redes sociais. Escreve sempre em português de Portugal, Acordo Ortográfico de 1990, sem pt-BR. Não inventes métricas, scores nem promessas. Cria copy natural, útil e editável.`;
    const userPrompt = `Transcrição do vídeo:\n${rawTranscription}\n\nRedes selecionadas: ${networks.join(", ")}\n\nGera uma proposta editorial completa.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "create_editorial_assistant_result",
            description: "Devolve uma proposta editorial estruturada para preencher o formulário de publicação.",
            parameters: {
              type: "object",
              properties: {
                draft_title: { type: "string" },
                base_caption: { type: "string" },
                captions_per_network: { type: "object", additionalProperties: { type: "string" } },
                hashtags: {
                  type: "object",
                  properties: {
                    reach: { type: "array", items: { type: "string" } },
                    niche: { type: "array", items: { type: "string" } },
                    brand: { type: "array", items: { type: "string" } },
                  },
                  required: ["reach", "niche", "brand"],
                  additionalProperties: false,
                },
                first_comment: { type: "string" },
                alt_text: { type: "string", maxLength: 125 },
                key_quotes: { type: "array", items: { type: "string" } },
              },
              required: ["draft_title", "base_caption", "captions_per_network", "hashtags", "first_comment", "alt_text", "key_quotes"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "create_editorial_assistant_result" } },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[ai-editorial-assistant] gateway error", aiResponse.status, errorText);
      const message = aiResponse.status === 429
        ? "Limite de IA atingido. Tenta novamente daqui a pouco."
        : aiResponse.status === 402
          ? "Créditos de IA insuficientes."
          : "A IA editorial está indisponível. Podes preencher manualmente ou tentar de novo.";
      return responseJson({ success: false, error: message }, aiResponse.status === 402 || aiResponse.status === 429 ? aiResponse.status : 500);
    }

    const aiData = await aiResponse.json();
    const args = aiData.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = args ? JSON.parse(args) : buildFallbackResult(rawTranscription, networks);
    const result = { ...parsed, raw_transcription: rawTranscription };

    return responseJson({ success: true, result });
  } catch (error) {
    console.error("[ai-editorial-assistant] error", error);
    return responseJson({ success: false, error: error instanceof Error ? error.message : "Erro interno no assistente de IA." }, 500);
  }
});