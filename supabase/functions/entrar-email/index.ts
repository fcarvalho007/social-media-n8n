// Email-only sign-in for two allowlisted existing accounts (owner's explicit decision).
// Mitigations: server-side allowlist, explicit existence check (never creates users), rate limit, audit log.
// Pinned to the same SDK version as the nl-* functions that respond normally (was a floating @2).
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { classificarFalha, entrar } from './logica.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Fixed diagnostic line: no email, IP, key, hash, token or free-text message.
const log = (etapa: string, resultado: string, ms: number) =>
  console.log(`[entrar-email] etapa=${etapa} resultado=${resultado} ms=${ms}`);

/** Logs only the backend service (rest/auth/outro), start and HTTP status: no URL query, body or headers. */
const servico = (u: string) => {
  const p = new URL(u).pathname;
  return p.startsWith('/rest/v1/rpc/') ? 'rest_rpc' : p.startsWith('/rest/') ? 'rest' : p.startsWith('/auth/') ? 'auth' : 'outro';
};
const fetchDiag: typeof fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const s = servico(url);
  const t0 = Date.now();
  log(`fetch_${s}`, 'inicio', 0);
  try {
    const r = await fetch(input, init);
    log(`fetch_${s}`, `http_${r.status}`, Date.now() - t0);
    return r;
  } catch (e) {
    log(`fetch_${s}`, classificarFalha(e), Date.now() - t0);
    throw e;
  }
};

const JANELA_MIN = 15;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { ...corsHeaders, 'Cache-Control': 'no-store' } });
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

  let email: unknown = '';
  try {
    const body: unknown = await req.json();
    if (body && typeof body === 'object') email = (body as { email?: unknown }).email;
  } catch { /* invalid body */ }

  const url = Deno.env.get('SUPABASE_URL')!;
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || null;
  const navegador = (req.headers.get('user-agent') ?? '').slice(0, 300) || null;
  const desde = () => new Date(Date.now() - JANELA_MIN * 60_000).toISOString();
  const emailNorm = typeof email === 'string' ? email.trim().toLowerCase().slice(0, 254) : '';

  const r = await entrar(email, ip, {
    async contarFalhasIp(ip) {
      const { count, error } = await admin.from('auth_entradas').select('id', { count: 'exact', head: true })
        .eq('ip', ip).eq('sucesso', false).gte('criado_em', desde());
      if (error) throw error;
      return count ?? 0;
    },
    async contarEntradasEmail(e) {
      const { count, error } = await admin.from('auth_entradas').select('id', { count: 'exact', head: true })
        .eq('email', e).gte('criado_em', desde());
      if (error) throw error;
      return count ?? 0;
    },
    async registar(sucesso) {
      const { error } = await admin.from('auth_entradas').insert({ email: emailNorm, ip, navegador, sucesso });
      if (error) throw error;
    },
    async contaExiste(e) {
      const { data, error } = await admin.rpc('auth_conta_existe', { _email: e });
      if (error) throw error;
      return data === true;
    },
    async emitirSessao(e) {
      // generateLink sends no email; the one-time hash is consumed right here.
      let t0 = Date.now();
      const { data: link, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email: e });
      const hash = link?.properties?.hashed_token;
      log('auth_generate_link', error ? classificarFalha(error) : hash ? 'ok' : 'sem_hash', Date.now() - t0);
      if (error || !hash) return null;
      const anon = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
      t0 = Date.now();
      const { data: v, error: vErr } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: hash });
      log('auth_verify_otp', vErr ? classificarFalha(vErr) : v.session ? 'ok' : 'sem_sessao', Date.now() - t0);
      if (vErr || !v.session) return null;
      return { access_token: v.session.access_token, refresh_token: v.session.refresh_token };
    },
  }, undefined, log);
  log('fim', `status_${r.status}`, 0);
  if (r.causa) console.error('[entrar-email] indisponível em', r.causa);
  return json(r.body, r.status);
});
