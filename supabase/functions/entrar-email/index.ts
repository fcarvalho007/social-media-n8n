// Entrada só com email: sem código, sem magic link, sem password.
// Verifica no servidor que o email é autorizado e a conta já existe;
// gera uma sessão real via API de administração e devolve os tokens.
// Nunca cria utilizadores nem envia emails.
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const EMAILS_AUTORIZADOS = [
  "comunicacao@fredericocarvalho.pt",
  "fredericodigital@gmail.com",
];

// Limite de tentativas em memória (por instância da função): 5 por 10 min por email+IP.
const TENTATIVAS = new Map<string, { n: number; desde: number }>();
const JANELA_MS = 10 * 60 * 1000;
const MAX_TENTATIVAS = 5;

function limitado(chave: string): boolean {
  const agora = Date.now();
  const reg = TENTATIVAS.get(chave);
  if (!reg || agora - reg.desde > JANELA_MS) {
    TENTATIVAS.set(chave, { n: 1, desde: agora });
    return false;
  }
  reg.n += 1;
  return reg.n > MAX_TENTATIVAS;
}

function resposta(corpo: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizar(email: unknown): string {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return resposta({ erro: "Método inválido" }, 405);

  let email = "";
  try {
    const corpo = await req.json();
    email = normalizar(corpo?.email);
  } catch {
    return resposta({ erro: "Pedido inválido" }, 400);
  }
  if (!email || !email.includes("@")) return resposta({ erro: "Pedido inválido" }, 400);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "desconhecido";
  if (limitado(`${email}|${ip}`)) {
    return resposta({ erro: "Demasiadas tentativas. Tenta novamente dentro de alguns minutos." }, 429);
  }

  // Resposta genérica: não revela se a conta existe.
  const semAcesso = () => resposta({ erro: "Este email não tem acesso." }, 401);

  if (!EMAILS_AUTORIZADOS.includes(email)) return semAcesso();

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !serviceKey || !anonKey) {
    console.error("[entrar-email] configuração em falta");
    return resposta({ erro: "Entrada temporariamente indisponível." }, 500);
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // A conta tem de existir já — nunca é criada aqui.
  let userId: string | null = null;
  for (let pagina = 1; pagina <= 10; pagina += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page: pagina, perPage: 200 });
    if (error) {
      console.error("[entrar-email] listUsers:", error.message);
      return resposta({ erro: "Entrada temporariamente indisponível." }, 500);
    }
    const encontrado = data.users.find((u) => normalizar(u.email) === email);
    if (encontrado) { userId = encontrado.id; break; }
    if (data.users.length < 200) break;
  }
  if (!userId) return semAcesso();

  // Gera uma ligação interna (sem enviar email) e verifica o token no servidor,
  // obtendo uma sessão real sem password nem código.
  const { data: link, error: erroLink } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (erroLink || !link?.properties?.hashed_token) {
    console.error("[entrar-email] generateLink:", erroLink?.message ?? "sem token");
    return resposta({ erro: "Não foi possível abrir a sessão. Tenta de novo." }, 500);
  }

  const publico = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: sessao, error: erroSessao } = await publico.auth.verifyOtp({
    type: "magiclink",
    token_hash: link.properties.hashed_token,
  });
  if (erroSessao || !sessao.session) {
    console.error("[entrar-email] verifyOtp:", erroSessao?.message ?? "sessão vazia");
    return resposta({ erro: "Não foi possível abrir a sessão. Tenta de novo." }, 500);
  }

  return resposta({
    ok: true,
    access_token: sessao.session.access_token,
    refresh_token: sessao.session.refresh_token,
  }, 200);
});
