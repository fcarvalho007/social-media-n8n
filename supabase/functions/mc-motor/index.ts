// Content engine entrypoint.
// - acao "criar": authenticated user; project access is validated in the database RPC (never trusts project_id).
// - acao "retomar": authenticated user; explicit retry of a job in "erro".
// - acao "processar": scheduler (x-mc-worker key from nl_worker_estado 'motor') or service-role bearer.
// Generation always runs server-side; the browser only polls persisted state.
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { admin, processarLote } from "../_shared/motor/worker.server.ts";
import { processarExportacoes, urlPublico } from "../_shared/motor/exportacao.server.ts";
import { linhaRascunho, nomePagina } from "../_shared/motor/exportacao.ts";
import type { PropostaEditorial } from "../_shared/motor/proposta.ts";
import { avaliarFonte, MARCADOR_FIXTURE, MODELO_DEMO, MODELO_ESTRUTURACAO, MODELO_IA, normalizarFonte } from "../_shared/motor/proposta.ts";

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

async function corridaExport(): Promise<unknown> {
  // Per-job leases (mc_reservar_exportacoes) make this single-flight per export; no global lock needed.
  return await processarExportacoes(admin(), 2);
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
    const resultado = await corridaWorker();
    const exportacoes = await corridaExport().catch((e) => ({ erro: (e as Error).message }));
    return json({ ok: true, resultado, exportacoes });
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
    const modo = body.modo === "demonstracao" ? "demonstracao" : body.modo === "ia" ? "ia" : "estruturacao";
    if (!UUID.test(projectId)) return json({ error: "Projeto inválido" }, 400);
    const fonte = normalizarFonte(texto);
    const av = avaliarFonte(fonte);
    if (!av.ok) return json({ error: av.motivo }, 400);
    if (!Number.isInteger(slides) || slides < 2 || slides > av.slidesMax) return json({ error: `Escolhe entre 2 e ${av.slidesMax} slides para este texto.` }, 400);
    if (modo === "demonstracao" && !texto.startsWith(MARCADOR_FIXTURE)) return json({ error: "A demonstração só aceita a fixture sintética de testes." }, 400);
    if (modo === "ia") {
      // Refuse before queueing when the project's AI budget is zero (the reservation re-checks atomically).
      const { data: o } = await user.from("mc_orcamentos").select("max_chamadas_dia").eq("project_id", projectId).maybeSingle();
      if (!o || o.max_chamadas_dia < 1) return json({ error: "A IA está desligada neste projeto. Define um limite diário em «Limites da IA»." }, 409);
    }
    const { data, error } = await user.rpc("mc_criar_trabalho", {
      _project_id: projectId, _tipo: "texto", _texto: modo === "demonstracao" ? texto : fonte.texto, _titulo: titulo, _origem_url: null,
      _brief: { objetivo, tom, slides, titulo }, _prompt_versao: modo === "ia" ? "r4-v1" : "r3-v1",
      _modelo: modo === "demonstracao" ? MODELO_DEMO : modo === "ia" ? MODELO_IA : MODELO_ESTRUTURACAO, _parametros: { slides }, _nova: body.nova === true,
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

  if (acao === "exportar" || acao === "estado_exportacao" || acao === "preparar_social") {
    const docId = String(body.documento_id ?? "");
    const versao = Number(body.versao);
    if (!UUID.test(docId) || !Number.isInteger(versao) || versao < 1) return json({ error: "Pedido inválido" }, 400);
    // Project access is checked through RLS / RPCs with the caller's own session.
    const { data: doc } = await user.from("mc_documentos").select("id, project_id, proposta_id, variante, versao_actual, aprovada_versao").eq("id", docId).maybeSingle();
    if (!doc) return json({ error: "Sem acesso a este carrossel." }, 403);

    if (acao === "exportar") {
      const { data, error } = await user.rpc("mc_pedir_exportacao", { _documento_id: docId, _versao: versao });
      if (error) return json({ error: error.code === "42501" ? "Sem permissão para exportar neste projeto." : error.code === "P0002" ? "Versão inexistente." : "Não foi possível pedir a exportação." }, error.code === "42501" ? 403 : 400);
      emSegundoPlano(corridaExport());
      return json({ ok: true, ...(data as Array<{ exportacao_id: string; estado: string }>)[0] });
    }

    const [{ data: job }, { data: fich }, { data: lig }] = await Promise.all([
      user.from("mc_export_trabalhos").select("id, estado, erro, erro_classe, paginas, progresso, manifesto, concluido_em, lease_ate").eq("documento_id", docId).eq("documento_versao", versao).maybeSingle(),
      user.from("mc_exportacoes").select("formato, pagina, storage_path, hash, bytes").eq("documento_id", docId).eq("documento_versao", versao),
      user.from("mc_ligacoes_sociais").select("documento_versao, destino, draft_id, draft_previsto, proposta_versao").eq("documento_id", docId).order("documento_versao", { ascending: false }),
    ]);
    const ficheiros = (fich ?? []).sort((a, b) => a.formato.localeCompare(b.formato) || (a.pagina ?? 0) - (b.pagina ?? 0))
      .map((f) => ({ formato: f.formato, pagina: f.pagina, url: urlPublico(f.storage_path), hash: f.hash, bytes: f.bytes,
        nome: f.formato === "png" ? nomePagina((f.pagina ?? 1) - 1) : f.formato === "pdf" ? "linkedin.pdf" : "instagram.zip" }));

    if (acao === "estado_exportacao") {
      if (job && (job.estado === "pendente" || (job.estado === "a_processar" && job.lease_ate && new Date(job.lease_ate) < new Date()))) emSegundoPlano(corridaExport());
      const rascunhos = (lig ?? []).filter((l) => l.destino === "instagram" && l.draft_id).map((l) => ({ versao: l.documento_versao, draft_id: l.draft_id, proposta_versao: l.proposta_versao }));
      return json({ ok: true, exportacao: job ?? null, ficheiros: job?.estado === "concluido" ? ficheiros : ficheiros.filter((f) => f.formato === "png"), rascunhos,
        versao_actual: doc.versao_actual, aprovada_versao: doc.aprovada_versao });
    }

    // preparar_social: explicit review of the current versions; approval + reservation are atomic in the RPC.
    const propostaVersao = Number(body.proposta_versao);
    if (body.revisto !== true || !Number.isInteger(propostaVersao)) return json({ error: "Confirma que reviste esta versão." }, 400);
    const { data: r, error: er } = await user.rpc("mc_preparar_social", { _documento_id: docId, _versao: versao, _proposta_versao: propostaVersao });
    if (er) {
      const st = er.code === "42501" ? 403 : er.code === "40001" ? 409 : 400;
      return json({ error: er.code === "42501" ? "Sem permissão para preparar rascunhos neste projeto." : er.code === "40001" ? "A versão mudou entretanto. Revê a versão atual antes de preparar." : er.message }, st);
    }
    const res = (r as Array<{ draft_previsto: string; draft_id: string | null; project_id: string }>)[0];
    const sb = admin();
    const { data: existe } = await sb.from("posts_drafts").select("id").eq("id", res.draft_previsto).maybeSingle();
    if (!existe) {
      const pngs = ficheiros.filter((f) => f.formato === "png").map((f) => f.url);
      const pdf = ficheiros.find((f) => f.formato === "pdf")?.url;
      if (!pdf || pngs.length < 1 || pngs.length > 20) return json({ error: "A exportação desta versão não está completa." }, 409);
      const { data: pr } = await sb.from("mc_propostas").select("trabalho_id").eq("id", doc.proposta_id).single();
      const { data: pv } = await sb.from("mc_propostas_versoes").select("conteudo").eq("proposta_id", doc.proposta_id).eq("versao", propostaVersao).single();
      if (!pr || !pv) return json({ error: "Proposta inexistente." }, 409);
      const linha = linhaRascunho({ id: res.draft_previsto, userId: u.user.id, projectId: res.project_id, proposta: pv.conteudo as unknown as PropostaEditorial,
        pngs, pdf, trabalhoId: pr.trabalho_id, documentoId: docId, variante: doc.variante as "A" | "B", versao, propostaVersao });
      const { error: ei } = await sb.from("posts_drafts").insert(linha);
      // 23505 = a concurrent preparation already created this exact reserved id → reuse it
      if (ei && ei.code !== "23505") return json({ error: "Não foi possível criar o rascunho social." }, 500);
    }
    await sb.rpc("mc_confirmar_draft", { _documento_id: docId, _versao: versao, _draft: res.draft_previsto });
    return json({ ok: true, draft_id: res.draft_previsto, existente: !!existe });
  }

  return json({ error: "Ação desconhecida" }, 400);
});
