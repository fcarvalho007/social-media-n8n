// Email-only sign-in for two allowlisted existing accounts (owner's explicit decision).
// Mitigations: server-side allowlist, existing accounts only, rate limit, audit log.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const PERMITIDOS = ['fredericodigital@gmail.com', 'comunicacao@fredericocarvalho.pt'];
const JANELA_MIN = 15;
const MAX_FALHAS_IP = 10;
const MAX_ENTRADAS_EMAIL = 20;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

  let email = '';
  try {
    const body: unknown = await req.json();
    if (body && typeof body === 'object' && typeof (body as { email?: unknown }).email === 'string') {
      email = (body as { email: string }).email.trim().toLowerCase();
    }
  } catch { /* invalid body */ }
  if (!email || email.length > 254) return json({ error: 'Email inválido' }, 400);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || null;
  const navegador = (req.headers.get('user-agent') ?? '').slice(0, 300) || null;
  const desde = new Date(Date.now() - JANELA_MIN * 60_000).toISOString();

  if (ip) {
    const { count } = await admin.from('auth_entradas').select('id', { count: 'exact', head: true })
      .eq('ip', ip).eq('sucesso', false).gte('criado_em', desde);
    if ((count ?? 0) >= MAX_FALHAS_IP) return json({ error: 'Demasiadas tentativas. Tenta daqui a 15 minutos.' }, 429);
  }
  const registar = (sucesso: boolean) =>
    admin.from('auth_entradas').insert({ email: email.slice(0, 254), ip, navegador, sucesso });

  if (!PERMITIDOS.includes(email)) {
    await registar(false);
    return json({ error: 'Este email não tem acesso.' }, 403);
  }
  const { count: entradas } = await admin.from('auth_entradas').select('id', { count: 'exact', head: true })
    .eq('email', email).gte('criado_em', desde);
  if ((entradas ?? 0) >= MAX_ENTRADAS_EMAIL) return json({ error: 'Demasiadas tentativas. Tenta daqui a 15 minutos.' }, 429);

  // generateLink does not send an email; it only returns a one-time token used right here.
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  const hash = link?.properties?.hashed_token;
  if (linkErr || !hash) {
    await registar(false);
    return json({ error: 'Este email não tem acesso.' }, 403); // account does not exist: never created here
  }
  const anon = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: v, error: vErr } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: hash });
  if (vErr || !v.session) {
    await registar(false);
    return json({ error: 'Não foi possível entrar. Tenta de novo.' }, 500);
  }
  await registar(true);
  return json({ access_token: v.session.access_token, refresh_token: v.session.refresh_token });
});
