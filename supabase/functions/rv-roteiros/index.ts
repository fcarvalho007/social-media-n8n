import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { chaveDeepSeek, MODELO_DEEPSEEK } from '../_shared/deepseek-direto.ts';
import { chamarGateway } from '../_shared/motor/gateway.server.ts';
import { gerarRoteiro } from '../_shared/roteiros/gerar.ts';
import type { Roteiro, GeracaoRoteiro } from '../_shared/roteiros/modelo.ts';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Cache-Control': 'no-store' };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined;
Deno.serve(async req => {
 if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
 if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);
 try {
  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return json({ error: 'Sessão em falta' }, 401);
  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: u, error: eu } = await client.auth.getUser(auth.slice(7));
  if (eu || !u.user) return json({ error: 'Sessão inválida' }, 401);
  const b = await req.json();
  if (!uuid.test(b.id ?? '') || !uuid.test(b.roteiro_id ?? '') || !Number.isInteger(b.revisao) || b.confirmar !== true) return json({ error: 'Confirma a geração antes de continuar.' }, 400);
  const { data: r, error: er } = await client.from('rv_roteiros').select('*').eq('id', b.roteiro_id).single();
  if (er || !r) return json({ error: 'Roteiro inacessível' }, 403);
  if (!chaveDeepSeek()) return json({ error: 'Configura DEEPSEEK_API_KEY no servidor. Podes continuar a escrever manualmente.' }, 503);
  const { data: reserva, error } = await client.rpc('rv_reservar_contexto', { _id: b.id, _roteiro_id: b.roteiro_id, _revisao: b.revisao, _modo: b.pedido?.modo ?? 'roteiro', _variante_id: b.pedido?.variante_id ?? null, _cena_id: b.pedido?.cena_id ?? null, _estilo: b.pedido?.estilo ?? 'alternativa' });
  if (error) return json({ error: error.message }, error.code === '42501' ? 403 : error.code === 'P0003' ? 429 : 409);
  const g = reserva.geracao as GeracaoRoteiro;
  if (!reserva.nova) return json(g);
  // Snapshot from the locked reservation is authoritative; source is immutable.
  const executar = async () => {
   const resultado = await gerarRoteiro((r as Roteiro).fonte, g.brief, (s, t) => chamarGateway(MODELO_DEEPSEEK, s, t), g.contexto);
   const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
   const { error: erro } = await admin.rpc('rv_concluir', { _id: g.id, _estado: resultado.estado, _resultado: resultado.resultado, _erro: resultado.erro, _modelo: MODELO_DEEPSEEK, _entrada: resultado.entrada, _saida: resultado.saida });
   if (erro) console.error('[rv-roteiros] Não foi possível persistir o resultado', erro.code);
  };
  if (typeof EdgeRuntime !== 'undefined') EdgeRuntime.waitUntil(executar().catch(() => console.error('[rv-roteiros] Resultado desconhecido')));
  else await executar();
  return json(g, 202);
 } catch { return json({ error: 'Não foi possível iniciar a geração. Consulta o estado antes de tentar novamente.' }, 500); }
});
