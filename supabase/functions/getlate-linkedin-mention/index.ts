// Edge function: getlate-linkedin-mention
// ----------------------------------------
// Resolve uma URL de perfil LinkedIn em URN oficial via Getlate, devolvendo
// um `mentionFormat` (ex.: `@[Frederico](urn:li:person:xxxx)`) que deve ser
// inserido directamente na legenda. O array `linkedin.mentions` no draft
// é apenas referência interna — não é enviado ao publish-to-getlate.
//
// Cache persistente em `linkedin_mention_cache` (TTL 30 dias) reduz chamadas
// repetidas à Getlate. Rate limit em memória de 20 chamadas/min/utilizador
// como protecção mínima contra abuso até existirem primitivas próprias.
//
// CORS, validação de input, JWT obrigatório e mensagens em pt-PT.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const GETLATE_LINKEDIN_ACCOUNT_ID = '68fb951d8bbca9c10cbfef93';
const GETLATE_BASE_URL = 'https://getlate.dev/api/v1';
const CACHE_TTL_DAYS = 30;
const RATE_LIMIT_PER_MINUTE = 20;

// In-memory rate limit (best-effort; single edge instance scope)
type RateBucket = { count: number; resetAt: number };
const rateBuckets = new Map<string, RateBucket>();

function checkRateLimit(userId: string): { ok: boolean; retryAfter?: number } {
  const now = Date.now();
  const bucket = rateBuckets.get(userId);
  if (!bucket || bucket.resetAt < now) {
    rateBuckets.set(userId, { count: 1, resetAt: now + 60_000 });
    return { ok: true };
  }
  if (bucket.count >= RATE_LIMIT_PER_MINUTE) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  bucket.count += 1;
  return { ok: true };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

interface RequestBody {
  profileUrl?: unknown;
  displayName?: unknown;
}

function normalizeProfileUrl(raw: string): string {
  // Trim + lowercase host. Mantém path como vem para evitar ambiguidade.
  const trimmed = raw.trim();
  try {
    const url = new URL(trimmed);
    return `${url.protocol}//${url.host.toLowerCase()}${url.pathname.replace(
      /\/$/,
      '',
    )}`;
  } catch {
    return trimmed.toLowerCase().replace(/\/$/, '');
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método não suportado.' }, 405);
  }

  // Auth: validar JWT do utilizador (anon key + Authorization header)
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return jsonResponse(
      { error: 'Sessão inválida. Inicia sessão e tenta novamente.' },
      401,
    );
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') ??
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const GETLATE_API_TOKEN = Deno.env.get('GETLATE_API_TOKEN') ?? '';

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE_KEY) {
    return jsonResponse(
      { error: 'Configuração interna em falta. Contacta o suporte.' },
      500,
    );
  }
  if (!GETLATE_API_TOKEN) {
    return jsonResponse(
      { error: 'Integração Getlate não configurada.' },
      500,
    );
  }

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData?.user) {
    return jsonResponse(
      { error: 'Sessão inválida. Inicia sessão e tenta novamente.' },
      401,
    );
  }

  const userId = userData.user.id;

  // Rate limit por utilizador
  const rate = checkRateLimit(userId);
  if (!rate.ok) {
    return jsonResponse(
      {
        error: `Demasiados pedidos. Tenta novamente em ${rate.retryAfter}s.`,
      },
      429,
    );
  }

  // Validate body
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return jsonResponse({ error: 'Pedido inválido.' }, 400);
  }

  const profileUrlRaw =
    typeof body.profileUrl === 'string' ? body.profileUrl : '';
  const displayName =
    typeof body.displayName === 'string' ? body.displayName.trim() : '';

  if (!profileUrlRaw.trim() || !displayName) {
    return jsonResponse(
      {
        error:
          'Indica o perfil LinkedIn e o nome a apresentar antes de inserir.',
      },
      400,
    );
  }

  const profileUrl = normalizeProfileUrl(profileUrlRaw);

  // Service role para cache (RLS escreve só com service_role)
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // 1. Cache hit?
  const { data: cached } = await adminClient
    .from('linkedin_mention_cache')
    .select('urn, mention_format, display_name_hint, expires_at')
    .eq('profile_url', profileUrl)
    .maybeSingle();

  if (cached && new Date(cached.expires_at).getTime() > Date.now()) {
    // Reescreve mentionFormat com displayName actual (mantém URN da cache)
    const mentionFormat = `@[${displayName}](${cached.urn})`;
    return jsonResponse({
      urn: cached.urn,
      mentionFormat,
      cached: true,
    });
  }

  // 2. Cache miss → chamar Getlate
  const url = new URL(
    `${GETLATE_BASE_URL}/accounts/${GETLATE_LINKEDIN_ACCOUNT_ID}/linkedin-mentions`,
  );
  url.searchParams.set('url', profileUrl);
  url.searchParams.set('displayName', displayName);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${GETLATE_API_TOKEN}`,
        Accept: 'application/json',
      },
    });
  } catch (error) {
    console.error('[getlate-linkedin-mention] network error', error);
    return jsonResponse(
      {
        error:
          'Não foi possível contactar o Getlate. Verifica a ligação e tenta de novo.',
      },
      502,
    );
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    console.error(
      '[getlate-linkedin-mention] getlate error',
      response.status,
      text,
    );
    if (response.status === 404) {
      return jsonResponse(
        {
          error:
            'Perfil LinkedIn não encontrado. Verifica o URL e tenta novamente.',
        },
        404,
      );
    }
    if (response.status === 401 || response.status === 403) {
      return jsonResponse(
        {
          error:
            'Sem permissão para resolver menções LinkedIn. Verifica a ligação Getlate.',
        },
        403,
      );
    }
    return jsonResponse(
      {
        error:
          'O Getlate não conseguiu resolver esta menção. Tenta noutro perfil.',
      },
      502,
    );
  }

  let payload: { mentionFormat?: string; urn?: string } | null = null;
  try {
    payload = await response.json();
  } catch {
    return jsonResponse(
      { error: 'Resposta inesperada do Getlate.' },
      502,
    );
  }

  const urn = payload?.urn?.toString().trim();
  const rawMentionFormat = payload?.mentionFormat?.toString().trim();
  if (!urn || !rawMentionFormat) {
    return jsonResponse(
      { error: 'O Getlate devolveu uma menção incompleta.' },
      502,
    );
  }

  // Normaliza mentionFormat com displayName que o utilizador escolheu
  const mentionFormat = `@[${displayName}](${urn})`;

  // 3. Guardar na cache (upsert) — não bloqueia resposta se falhar
  const expiresAt = new Date(
    Date.now() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  await adminClient
    .from('linkedin_mention_cache')
    .upsert(
      {
        profile_url: profileUrl,
        urn,
        mention_format: rawMentionFormat,
        display_name_hint: displayName,
        resolved_at: new Date().toISOString(),
        expires_at: expiresAt,
      },
      { onConflict: 'profile_url' },
    )
    .then(({ error }) => {
      if (error) {
        console.warn('[getlate-linkedin-mention] cache write failed', error);
      }
    });

  return jsonResponse({ urn, mentionFormat, cached: false });
});
