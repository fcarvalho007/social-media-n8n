// Content engine entrypoint.
// - acao "criar": authenticated user; project access is validated in the database RPC (never trusts project_id).
// - acao "retomar": authenticated user; explicit retry of a job in "erro".
// - acao "processar": scheduler (x-mc-worker key from nl_worker_estado 'motor') or service-role bearer.
// Generation always runs server-side; the browser only polls persisted state.
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { admin, processarLote } from "../_shared/motor/worker.server.ts";
import { avaliarFonte, MARCADOR_FIXTURE, MODELO_DEMO, MODELO_ESTRUTURACAO, normalizarFonte } from "../_shared/motor/proposta.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-mc-worker",
  "Cache-Control": "no-store",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function igual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined;
function emSegundoPlano(p: Promise<unknown>) {
  const seguro = p.catch((e) => console.error("[mc-motor] lote", (e as Error).message));
  if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(seguro);
}

async function corridaWorker(): Promise<unknown> {
  const sb = admin();
  const { data: token } = await sb.rpc("nl_worker_reservar", { _nome: "motor", _segundos: 150 });
  if (!token) return { ocupado: true };
  let resultado: unknown = null;
  try {
    resultado = await processarLote(sb, 3);
    return resultado;
  } finally {
    await sb.rpc("nl_worker_libertar", { _nome: "motor", _token: token, _resultado: { lote: resultado } });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Pedido inválido" }, 400); }
  const acao = body.acao;

  if (acao === "processar") {
    const sb = admin();
    const { data: est } = await sb.from("nl_worker_estado").select("chave, pausa_motivo").eq("nome", "motor").maybeSingle();
    const bearer = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const ok = est && (igual(req.headers.get("x-mc-worker") ?? "", est.chave) || igual(bearer, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""));
    if (!ok) return json({ error: "Não autorizado" }, 401);
    if (est.pausa_motivo) return json({ ok: true, pausado: est.pausa_motivo });
    return json({ ok: true, resultado: await corridaWorker() });
  }

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ error: "Sessão em falta" }, 401);
  const user = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } }, auth: { persistSession: false },
  });
  const { data: u, error: eu } = await user.auth.getUser(auth.slice(7));
  if (eu || !u?.user) return json({ error: "Sessão inválida" }, 401);

  if (acao === "criar") {
    const projectId = String(body.project_id ?? "");
    const texto = typeof body.texto === "string" ? body.texto : "";
    const titulo = typeof body.titulo === "string" && body.titulo.trim() ? body.titulo.trim().slice(0, 300) : null;
    const objetivo = typeof body.objetivo === "string" ? body.objetivo.slice(0, 200) : "";
    const tom = typeof body.tom === "string" ? body.tom.slice(0, 80) : "";
    const slides = Number(body.slides);
    const modo = body.modo === "demonstracao" ? "demonstracao" : "estruturacao";
    if (!UUID.test(projectId)) return json({ error: "Projeto inválido" }, 400);
    const fonte = normalizarFonte(texto);
    const av = avaliarFonte(fonte);
    if (!av.ok) return json({ error: av.motivo }, 400);
    if (!Number.isInteger(slides) || slides < 2 || slides > av.slidesMax) return json({ error: `Escolhe entre 2 e ${av.slidesMax} slides para este texto.` }, 400);
    if (modo === "demonstracao" && !texto.startsWith(MARCADOR_FIXTURE)) return json({ error: "A demonstração só aceita a fixture sintética de testes." }, 400);
    const { data, error } = await user.rpc("mc_criar_trabalho", {
      _project_id: projectId, _tipo: "texto", _texto: modo === "demonstracao" ? texto : fonte.texto, _titulo: titulo, _origem_url: null,
      _brief: { objetivo, tom, slides, titulo }, _prompt_versao: "r3-v1",
      _modelo: modo === "demonstracao" ? MODELO_DEMO : MODELO_ESTRUTURACAO, _parametros: { slides }, _nova: body.nova === true,
    });
    if (error) return json({ error: error.code === "42501" ? "Sem acesso a este projeto." : "Não foi possível criar o trabalho." }, error.code === "42501" ? 403 : 500);
    const linha = (data as Array<{ trabalho_id: string; reutilizado: boolean }>)[0];
    emSegundoPlano(corridaWorker());
    return json({ ok: true, trabalho_id: linha.trabalho_id, reutilizado: linha.reutilizado });
  }

  if (acao === "retomar") {
    const id = String(body.trabalho_id ?? "");
    if (!UUID.test(id)) return json({ error: "Trabalho inválido" }, 400);
    const { data, error } = await user.rpc("mc_retomar_trabalho", { _trabalho_id: id });
    if (error) return json({ error: error.code === "42501" ? "Sem acesso a este projeto." : "Não foi possível retomar." }, error.code === "42501" ? 403 : 500);
    if (data) emSegundoPlano(corridaWorker());
    return json({ ok: true, retomado: data });
  }

  if (acao === "acordar") {
    // Nudges the queue for the caller (no job data involved); single-flight lease guards it.
    emSegundoPlano(corridaWorker());
    return json({ ok: true });
  }

  return json({ error: "Ação desconhecida" }, 400);
});
