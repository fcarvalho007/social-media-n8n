import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.83.0";
import { chaveDeepSeek, ErroDeepSeek, limparJson, textoDeepSeek } from "../_shared/deepseek-direto.ts";

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

    if (!chaveDeepSeek()) {
      return responseJson({ success: true, result: buildFallbackResult(rawTranscription, networks), warning: "A DeepSeek não está configurada no servidor; foi usada só a transcrição." });
    }

    const systemPrompt = `És um assistente editorial para redes sociais. Escreve sempre em português de Portugal, Acordo Ortográfico de 1990, sem pt-BR. Não inventes métricas, scores nem promessas. Cria copy natural, útil e editável.`;
    const userPrompt = `Transcrição do vídeo:\n${rawTranscription}\n\nRedes selecionadas: ${networks.join(", ")}\n\nGera uma proposta editorial completa.`;

    const formato = 'Responde só com JSON: {"draft_title":string,"base_caption":string,"captions_per_network":{"<rede>":string},"hashtags":{"reach":string[],"niche":string[],"brand":string[]},"first_comment":string,"alt_text":string (máx. 125 caracteres),"key_quotes":string[]}.';
    let parsed: Record<string, unknown>;
    try {
      const r = await textoDeepSeek({ sistema: `${systemPrompt}\n${formato}`, utilizador: userPrompt, json: true });
      try { parsed = JSON.parse(limparJson(r.texto)); } catch { parsed = buildFallbackResult(rawTranscription, networks); }
    } catch (e) {
      if (e instanceof ErroDeepSeek) return responseJson({ success: false, error: e.message }, [402, 429, 503].includes(e.status) ? e.status : 500);
      throw e;
    }
    const result = { ...parsed, raw_transcription: rawTranscription };

    return responseJson({ success: true, result });
  } catch (error) {
    console.error("[ai-editorial-assistant] error", error);
    return responseJson({ success: false, error: error instanceof Error ? error.message : "Erro interno no assistente de IA." }, 500);
  }
});