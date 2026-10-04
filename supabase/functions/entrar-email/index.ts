// Email-only sign-in for two allowlisted existing accounts (owner's explicit decision).
// Mitigations: server-side allowlist, explicit existence check (never creates users), rate limit, audit log.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { entrar } from './logica.ts';

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
      const { data: link, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email: e });
      const hash = link?.properties?.hashed_token;
      if (error || !hash) return null;
      const anon = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data: v, error: vErr } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: hash });
      if (vErr || !v.session) return null;
      return { access_token: v.session.access_token, refresh_token: v.session.refresh_token };
    },
  });
  return json(r.body, r.status);
});
