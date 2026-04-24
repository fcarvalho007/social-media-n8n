import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.83.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const COSTS = {
  transcription_per_minute: 1,
  text_generation_fast: 1,
  text_generation_smart: 3,
  vision_analysis: 2,
} as const;

const MODEL_MAP = {
  fast: "google/gemini-3-flash-preview",
  smart: "openai/gpt-5-mini",
} as const;

type AIAction = "transcription" | "text_generation" | "vision" | "hashtag_generation" | "first_comment_generation" | "video_chapters" | "video_quotes";
type RequestBody = {
  action?: AIAction;
  fileUrl?: string;
  imageUrl?: string;
  prompt?: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  responseFormat?: "text" | "json";
  model?: "fast" | "smart";
  feature?: string;
  creditCostOverride?: number;
  options?: { language?: string; includeSegments?: boolean };
  caption?: string;
  transcription?: string;
  networks?: string[];
  brandHashtags?: string[];
};

const responseJson = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function safeErrorMessage(status: number, fallback = "A IA está temporariamente indisponível.") {
  if (status === 402) return { code: "insufficient_credits", error: "Não tens créditos suficientes. Vê planos." };
  if (status === 429) return { code: "rate_limit", error: "A IA está ocupada. Tenta novamente em alguns segundos." };
  if (status === 408) return { code: "timeout", error: "A IA demorou demasiado. Tenta novamente." };
  return { code: "generic", error: fallback };
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 60_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function retry<T>(fn: () => Promise<T>, attempts = 3) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 300 * 2 ** (attempt - 1)));
    }
  }
  throw lastError;
}

function estimateTranscriptionCredits(metadata?: { durationSeconds?: number }) {
  const minutes = Math.max(1, Math.ceil((metadata?.durationSeconds || 60) / 60));
  return minutes * COSTS.transcription_per_minute;
}

function resolveCost(body: RequestBody) {
  if (Number.isFinite(body.creditCostOverride) && body.creditCostOverride! >= 0 && body.creditCostOverride! <= 20) {
    return Math.round(body.creditCostOverride!);
  }
  if (body.action === "transcription") return estimateTranscriptionCredits();
  if (body.action === "vision") return COSTS.vision_analysis;
  return body.model === "smart" ? COSTS.text_generation_smart : COSTS.text_generation_fast;
}

function validateBody(body: RequestBody) {
  if (!body.action || !["transcription", "text_generation", "vision", "hashtag_generation", "first_comment_generation", "video_chapters", "video_quotes"].includes(body.action)) {
    return "Tipo de ação de IA inválido.";
  }
  if (body.action === "transcription" && (!body.fileUrl || typeof body.fileUrl !== "string")) {
    return "Ficheiro para transcrição em falta.";
  }
  if (body.action === "vision" && (!body.imageUrl || !body.prompt)) {
    return "Imagem e instrução são obrigatórias para análise visual.";
  }
  if (body.action === "text_generation" && (!body.prompt || typeof body.prompt !== "string" || body.prompt.trim().length < 2)) {
    return "Instrução de geração de texto em falta.";
  }
  if (body.action === "hashtag_generation" && (!body.caption || typeof body.caption !== "string" || body.caption.trim().length < 2)) {
    return "Legenda em falta para gerar hashtags.";
  }
  if (body.action === "first_comment_generation" && (!body.caption || typeof body.caption !== "string" || body.caption.trim().length < 2)) return "Legenda em falta para gerar primeiro comentário.";
  if ((body.action === "video_chapters" || body.action === "video_quotes") && (!body.transcription || typeof body.transcription !== "string" || body.transcription.trim().length < 20)) return "Transcrição em falta para ferramentas de vídeo.";
  return null;
}

async function logUsage(serviceClient: ReturnType<typeof createClient>, params: {
  userId: string;
  action: AIAction;
  feature?: string;
  credits: number;
  tokens?: number | null;
  provider: string;
  model: string;
  success: boolean;
  error?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const { error } = await serviceClient.rpc("log_ai_usage" as never, {
    _user_id: params.userId,
    _action_type: params.action,
    _feature: params.feature || "shared_ai_service",
    _credits_consumed: params.credits,
    _tokens_used: params.tokens ?? null,
    _provider: params.provider,
    _model: params.model,
    _success: params.success,
    _error_message: params.error ?? null,
    _metadata: params.metadata || {},
  } as never);
  if (error) console.error("[ai-core] usage log failed", error);
}

async function generateText(body: RequestBody, lovableKey: string) {
  const modelAlias = body.model === "smart" ? "smart" : "fast";
  const model = MODEL_MAP[modelAlias];
  const messages = [
    { role: "system", content: body.systemPrompt || "Responde sempre em português de Portugal, com clareza e sem inventar factos." },
    { role: "user", content: body.prompt || "" },
  ];

  const aiResponse = await retry(() => fetchWithTimeout("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: body.maxTokens,
      temperature: body.temperature,
      response_format: body.responseFormat === "json" ? { type: "json_object" } : undefined,
    }),
  }));

  if (!aiResponse.ok) throw new Response(await aiResponse.text(), { status: aiResponse.status });
  const data = await aiResponse.json();
  const text = String(data.choices?.[0]?.message?.content || "").trim();
  return { result: body.responseFormat === "json" ? JSON.parse(text) : text, tokens: data.usage?.total_tokens ?? null, model, provider: "lovable_ai" };
}

async function generateHashtags(body: RequestBody, lovableKey: string) {
  const prompt = `Legenda:\n${body.caption}\n\nTranscrição opcional:\n${body.transcription || ""}\n\nRedes: ${(body.networks || []).join(", ") || "instagram"}\nHashtags de marca: ${(body.brandHashtags || []).join(", ") || "nenhuma"}\n\nDevolve APENAS JSON válido com esta estrutura: {"hashtags":[{"tag":"#exemplo","group":"reach|niche|brand","status":"neutral|risk","reason":"razão curta","riskReason":"só se houver risco","source":"ai_editorial|brand"}],"selectedTags":["#exemplo"]}. Não atribuas scores, volume, tendência, saturação, popularidade nem desempenho de mercado. Usa português de Portugal e evita spam.`;
  const output = await generateText({ ...body, prompt, responseFormat: "json", model: "fast" }, lovableKey);
  return { ...output, result: { ...(output.result as Record<string, unknown>), generated_at: new Date().toISOString() } };
}

async function generateFirstComments(body: RequestBody, lovableKey: string) {
  const prompt = `Legenda do post:\n${body.caption}\n\nRede social: ${(body.networks || [])[0] || "instagram"}\n\nDevolve JSON com 3 opções de primeiro comentário, cada uma com abordagem diferente: {"options":[{"approach":"pergunta","text":"pergunta que convida ao debate, máx 300 chars"},{"approach":"cta_link","text":"CTA claro com link para aprofundar, máx 300 chars"},{"approach":"complemento","text":"continuação que aprofunda a ideia do post, máx 300 chars"}]}`;
  return generateText({ ...body, prompt, systemPrompt: "És um especialista em engagement para redes sociais. Geras primeiros comentários que aumentam interação. Em PT-PT, tom natural, nunca corporativo.", responseFormat: "json", model: "fast" }, lovableKey);
}

async function generateVideoTool(body: RequestBody, lovableKey: string, kind: "chapters" | "quotes") {
  const prompt = kind === "chapters"
    ? `Transcrição:\n${body.transcription}\n\nSegmentos com timestamps:\n${JSON.stringify((body as Record<string, unknown>).segments || [])}\n\nDevolve JSON com capítulos YouTube: {"chapters":[{"time":"00:00","title":"Título curto"}]}. O primeiro capítulo deve começar em 00:00.`
    : `Transcrição:\n${body.transcription}\n\nSegmentos com timestamps:\n${JSON.stringify((body as Record<string, unknown>).segments || [])}\n\nDevolve JSON com 3 a 5 frases citáveis: {"quotes":[{"time":"00:45","text":"frase dita"}]}. Usa frases fiéis à transcrição.`;
  return generateText({ ...body, prompt, systemPrompt: "És um editor de vídeo. Respondes apenas com JSON válido em português de Portugal e nunca inventas frases ou timestamps.", responseFormat: "json", model: "fast" }, lovableKey);
}

async function analyzeImage(body: RequestBody, lovableKey: string) {
  const model = MODEL_MAP.smart;
  const aiResponse = await retry(() => fetchWithTimeout("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "Analisa imagens com rigor. Responde em português de Portugal e não inventes detalhes que não estejam visíveis." },
        { role: "user", content: [{ type: "text", text: body.prompt }, { type: "image_url", image_url: { url: body.imageUrl } }] },
      ],
    }),
  }));

  if (!aiResponse.ok) throw new Response(await aiResponse.text(), { status: aiResponse.status });
  const data = await aiResponse.json();
  return { result: String(data.choices?.[0]?.message?.content || "").trim(), tokens: data.usage?.total_tokens ?? null, model, provider: "lovable_ai" };
}

async function transcribeMedia(body: RequestBody, openAiKey: string) {
  const fileResponse = await fetchWithTimeout(body.fileUrl!, {}, 60_000);
  if (!fileResponse.ok) throw new Response("media_fetch_failed", { status: 400 });

  const blob = await fileResponse.blob();
  const form = new FormData();
  form.append("file", new File([blob], "media", { type: blob.type || "audio/mpeg" }));
  form.append("model", "whisper-1");
  form.append("language", (body.options?.language || "pt").slice(0, 2));
  form.append("response_format", body.options?.includeSegments ? "verbose_json" : "json");
  if (body.options?.includeSegments) form.append("timestamp_granularities[]", "segment");

  const transcriptionResponse = await retry(() => fetchWithTimeout("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${openAiKey}` },
    body: form,
  }));

  if (!transcriptionResponse.ok) throw new Response(await transcriptionResponse.text(), { status: transcriptionResponse.status });
  const data = await transcriptionResponse.json();
  const text = String(data.text || "").trim();
  if (body.options?.includeSegments) {
    return { result: { text, segments: Array.isArray(data.segments) ? data.segments.map((s: Record<string, unknown>) => ({ id: s.id, start: s.start, end: s.end, text: String(s.text || "").trim() })) : [] }, tokens: null, model: "whisper-1", provider: "openai" };
  }
  return { result: text, tokens: null, model: "whisper-1", provider: "openai" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return responseJson({ success: false, code: "generic", error: "Tens de iniciar sessão para usar IA." }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY") ?? "";
  const serviceClient = createClient(supabaseUrl, serviceRoleKey);

  let userId = "";
  let body: RequestBody = {};
  let credits = 0;
  let provider = "lovable_ai";
  let model = MODEL_MAP.fast;

  try {
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    userId = String(claimsData?.claims?.sub || "");
    if (claimsError || !userId) return responseJson({ success: false, code: "generic", error: "Sessão inválida. Inicia sessão novamente." }, 401);

    body = await req.json();
    const validationError = validateBody(body);
    if (validationError) return responseJson({ success: false, code: "generic", error: validationError }, 400);

    credits = resolveCost(body);
    const { data: hasCredits, error: creditError } = await serviceClient.rpc("consume_ai_credits" as never, { _user_id: userId, _credits: credits } as never);
    if (creditError) throw creditError;
    if (!hasCredits) {
      await logUsage(serviceClient, { userId, action: body.action!, feature: body.feature, credits, provider, model, success: false, error: "insufficient_credits" });
      return responseJson({ success: false, code: "insufficient_credits", error: "Não tens créditos suficientes. Vê planos." }, 402);
    }

    let output: { result: unknown; tokens: number | null; provider: string; model: string };
    if (body.action === "transcription") {
      const openAiKey = Deno.env.get("OPENAI_API_KEY");
      if (!openAiKey) throw new Response("missing_openai_key", { status: 500 });
      output = await transcribeMedia(body, openAiKey);
    } else if (body.action === "vision") {
      const lovableKey = Deno.env.get("LOVABLE_API_KEY");
      if (!lovableKey) throw new Response("missing_lovable_key", { status: 500 });
      output = await analyzeImage(body, lovableKey);
    } else if (body.action === "hashtag_generation") {
      const lovableKey = Deno.env.get("LOVABLE_API_KEY");
      if (!lovableKey) throw new Response("missing_lovable_key", { status: 500 });
      output = await generateHashtags(body, lovableKey);
    } else if (body.action === "first_comment_generation") {
      const lovableKey = Deno.env.get("LOVABLE_API_KEY");
      if (!lovableKey) throw new Response("missing_lovable_key", { status: 500 });
      output = await generateFirstComments(body, lovableKey);
    } else if (body.action === "video_chapters" || body.action === "video_quotes") {
      const lovableKey = Deno.env.get("LOVABLE_API_KEY");
      if (!lovableKey) throw new Response("missing_lovable_key", { status: 500 });
      output = await generateVideoTool(body, lovableKey, body.action === "video_chapters" ? "chapters" : "quotes");
    } else {
      const lovableKey = Deno.env.get("LOVABLE_API_KEY");
      if (!lovableKey) throw new Response("missing_lovable_key", { status: 500 });
      output = await generateText(body, lovableKey);
    }

    provider = output.provider;
    model = output.model;
    await logUsage(serviceClient, { userId, action: body.action!, feature: body.feature, credits, tokens: output.tokens, provider, model, success: true });
    return responseJson({ success: true, result: output.result });
  } catch (error) {
    const status = error instanceof Response ? error.status : error instanceof DOMException && error.name === "AbortError" ? 408 : 500;
    const technicalMessage = error instanceof Error ? error.message : error instanceof Response ? await error.text() : "unknown_error";
    console.error("[ai-core] error", status, technicalMessage);

    if (userId && body.action) {
      await logUsage(serviceClient, { userId, action: body.action, feature: body.feature, credits, provider, model, success: false, error: technicalMessage.slice(0, 500) });
    }

    const safe = safeErrorMessage(status);
    return responseJson({ success: false, ...safe }, status === 408 || status === 402 || status === 429 ? status : 500);
  }
});
