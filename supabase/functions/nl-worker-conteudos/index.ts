// Scheduled worker for derived content ONLY: reconciles E-goi delivery of campaigns already
// accepted (read-only status queries) and processes chronicle-carousel jobs. It never sends
// newsletters, never publishes posts/WordPress and never creates social drafts.
// Auth: x-nl-worker key stored in nl_worker_estado (readable only by the service role) or a
// service-role bearer. Single-flight lease, bounded work per run, idempotent job keys.
import { admin, edicoesPorConfirmar, processarJobs, reconciliarEdicoesSemJob } from "../_shared/conteudos/jobs.server.ts";

const NOME = "conteudos";
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

function igual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ ok: false, mensagem: "Método não permitido" }, 405);
  const sb = admin();
  const { data: est } = await sb.from("nl_worker_estado").select("chave, pausa_motivo").eq("nome", NOME).maybeSingle();
  const estado = est as { chave: string; pausa_motivo: string | null } | null;
  const chave = req.headers.get("x-nl-worker") ?? "";
  const bearer = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!estado || !(igual(chave, estado.chave) || igual(bearer, service))) return json({ ok: false, mensagem: "Não autorizado" }, 401);
  if (estado.pausa_motivo) return json({ ok: true, pausado: estado.pausa_motivo });

  // Token-based lease: only this run's token can release it (an old run past expiry cannot free a newer lease).
  const { data: token, error: eL } = await sb.rpc("nl_worker_reservar", { _nome: NOME, _segundos: 300 });
  if (eL) return json({ ok: false, mensagem: "Lease indisponível" }, 500);
  if (!token) return json({ ok: true, ocupado: true });

  const resultado: Record<string, unknown> = {};
  try {
    // 1) Delivery reconciliation for accepted campaigns (GET status only; closes editions an
    //    admin already asked to close once E-goi reports "sent").
    const { reconciliarEdicao } = await import("../_shared/newsletter-engine/envio.server.ts");
    const reconciliadas: Array<{ edicao_id: string; por_confirmar?: number; fechada?: boolean; erro?: string }> = [];
    for (const id of await edicoesPorConfirmar(5)) {
      try {
        const r = await reconciliarEdicao(id);
        reconciliadas.push({ edicao_id: id, por_confirmar: r.por_confirmar, fechada: r.fechada });
      } catch (e) {
        reconciliadas.push({ edicao_id: id, erro: ((e as Error).message ?? "erro").slice(0, 200) });
      }
    }
    resultado.reconciliadas = reconciliadas;
    // 2) Enqueue missing jobs (post-activation campaigns only) and 3) process a bounded batch.
    Object.assign(resultado, await reconciliarEdicoesSemJob(5));
    Object.assign(resultado, await processarJobs(3));
    return json({ ok: true, ...resultado });
  } catch (e) {
    resultado.erro = ((e as Error).message ?? "erro").slice(0, 300);
    console.error("[nl-worker-conteudos]", resultado.erro);
    return json({ ok: false, mensagem: "Falha na execução" }, 500);
  } finally {
    const { data: libertado } = await sb.rpc("nl_worker_libertar", { _nome: NOME, _token: token, _resultado: resultado });
    if (!libertado) console.warn("[nl-worker-conteudos] lease expirado ou reatribuído; resultado não gravado");
  }
});
