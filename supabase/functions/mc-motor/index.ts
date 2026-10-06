import { traduzirFonte } from "../_shared/motor/traducao.server.ts";
import { normalizarBriefing } from "../_shared/motor/briefing.ts";
import { normalizarLeitura, normalizarPerfil, OBJETIVO_LEITURA } from "../_shared/motor/autor.ts";
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
import { atribuicao, validarMetaFonte, type MetaFonte } from "../_shared/motor/fontes.ts";
import { lerLink, registarImagem, resolverAssets } from "../_shared/motor/fontes.server.ts";
import { carregarImagem, guardarBytes } from "../_shared/motor/carregar.server.ts";
import { descarregarPexels, pesquisarPexelsMotor } from "../_shared/motor/pexels.server.ts";
import { creditoPexels, idDoUrl, urlPexelsValido } from "../_shared/motor/pexels.ts";
import { chaveKie, criarTarefaKie, estadoTarefaKie, interpretarImagemKie, KIE_MODELO, KIE_MAX_DIA, KIE_PROPORCAO } from "../_shared/motor/kie.server.ts";
import { obterFramework } from "../_shared/motor/frameworks.ts";
import { NOTA_MAX, obterModoRegen } from "../_shared/motor/regenerar.ts";
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

  if (acao === "traduzir") {
    const projectId = String(body.project_id ?? "");
    if (!UUID.test(projectId)) return json({ error: "Projeto inválido" }, 400);
    if (body.confirmar !== true) return json({ error: "A tradução é um pedido pago: confirma antes de continuar." }, 400);
    const { data: pode } = await user.rpc("mc_pode_escrever", { _project_id: projectId });
    if (!pode) return json({ error: "Sem acesso a este projeto." }, 403);
    const texto = typeof body.texto === "string" ? body.texto.slice(0, 60000) : "";
    const r = await traduzirFonte(admin(), projectId, u.user.id, texto, body.repetir === true);
    return r.ok ? json(r) : json({ error: r.error, estado: r.estado ?? null, traducao_id: r.traducao_id ?? null }, r.status);
  }

  if (acao === "criar") {
    const projectId = String(body.project_id ?? "");
    let texto = typeof body.texto === "string" ? body.texto : "";
    // PT-PT derived source: the server rebuilds the text from the stored valid translation (never trusts the client copy).
    let traducao: { id: string; hash_original: string; idioma_origem: string } | null = null;
    if (body.traducao_id != null) {
      if (!UUID.test(String(body.traducao_id)) || !UUID.test(projectId)) return json({ error: "Tradução inválida." }, 400);
      const { data: tr } = await user.from("mc_traducoes").select("id, project_id, estado, resultado, hash_original, idioma_origem").eq("id", String(body.traducao_id)).maybeSingle();
      if (!tr || tr.project_id !== projectId || tr.estado !== "valida") return json({ error: "A versão PT-PT já não é válida para esta fonte." }, 409);
      texto = (tr.resultado as string[]).join("\n\n");
      traducao = { id: tr.id, hash_original: tr.hash_original, idioma_origem: tr.idioma_origem };
    }
    const titulo = typeof body.titulo === "string" && body.titulo.trim() ? body.titulo.trim().slice(0, 300) : null;
    const objetivo = typeof body.objetivo === "string" ? body.objetivo.slice(0, 200) : "";
    const tom = typeof body.tom === "string" ? body.tom.slice(0, 80) : "";
    const slides = Number(body.slides);
    const framework = body.framework == null ? null : obterFramework(body.framework);
    if (body.framework != null && !framework) return json({ error: "Estrutura desconhecida." }, 400);
    const modo = body.modo === "demonstracao" ? "demonstracao" : body.modo === "ia" ? "ia" : "estruturacao";
    if (!UUID.test(projectId)) return json({ error: "Projeto inválido" }, 400);
    const fonte = normalizarFonte(texto);
    const av = avaliarFonte(fonte);
    if (!av.ok) return json({ error: av.motivo }, 400);
    if (!Number.isInteger(slides) || slides < 2 || slides > av.slidesMax) return json({ error: `Escolhe entre 2 e ${av.slidesMax} slides para este texto.` }, 400);
    const tipoFonte = body.fonte_tipo === "link" ? "link" : body.fonte_tipo === "pdf" ? "pdf" : "texto";
    let meta: MetaFonte | null = null;
    if (tipoFonte !== "texto") {
      if (modo === "demonstracao") return json({ error: "A demonstração só aceita texto." }, 400);
      try { meta = validarMetaFonte(body.metadados, tipoFonte, fonte.paragrafos.length); }
      catch (e) { return json({ error: (e as Error).message }, 400); }
    }
    const atrib = atribuicao(meta, titulo);
    const origemUrl = meta?.tipo === "link" ? (meta.url_final ?? meta.url).slice(0, 2000) : null;
    if (modo === "demonstracao" && !texto.startsWith(MARCADOR_FIXTURE)) return json({ error: "A demonstração só aceita a fixture sintética de testes." }, 400);
    if (framework && modo !== "ia") return json({ error: "As estruturas só funcionam com a IA." }, 400);
    if (modo === "ia") {
      // Refuse before queueing when the project's AI budget is zero (the reservation re-checks atomically).
      const { data: o } = await user.from("mc_orcamentos").select("max_chamadas_dia").eq("project_id", projectId).maybeSingle();
      if (!o || o.max_chamadas_dia < 1) return json({ error: "A IA está desligada neste projeto. Define um limite diário em «Limites da IA»." }, 409);
    }
    // Snapshot the project's author voice (base profile when none saved) so later edits never change this job.
    let briefingEd = normalizarBriefing(body.briefing as Record<string, unknown> | undefined);
    let autor: ReturnType<typeof normalizarPerfil> | null = null;
    let leituraTrabalho = normalizarLeitura(body.angulo, body.leitura_especifica);
    // Restructuring proposals reuse the origin job's snapshot (profile + angle), never the current profile.
    const origemId = framework && UUID.test(String(body.origem_trabalho ?? "")) ? String(body.origem_trabalho) : null;
    if (origemId) {
      const { data: orig } = await user.from("mc_trabalhos").select("brief").eq("id", origemId).eq("project_id", projectId).maybeSingle();
      const ob = (orig?.brief ?? null) as { autor?: Record<string, unknown>; leitura_trabalho?: { angulo?: unknown; especifica?: unknown } } | null;
      if (ob?.autor) { autor = normalizarPerfil(ob.autor); if ((ob as { briefing?: Record<string, unknown> }).briefing) briefingEd = normalizarBriefing((ob as { briefing?: Record<string, unknown> }).briefing); if (ob.leitura_trabalho) leituraTrabalho = normalizarLeitura(ob.leitura_trabalho.angulo, ob.leitura_trabalho.especifica); }
      const otr = (ob as { traducao?: { id: string; hash_original: string; idioma_origem: string } } | null)?.traducao;
      if (otr && !traducao) traducao = otr;
    }
    if (modo === "ia" && !autor) {
      const { data: pa } = await user.from("mc_perfis_autor").select("voz, notas, apresentacao, publico, teses, objetivo_cronica").eq("project_id", projectId).maybeSingle();
      autor = normalizarPerfil(pa);
    }
    const leitura = body.leitura === true || objetivo.startsWith(OBJETIVO_LEITURA);
    const comum = {
      _project_id: projectId, _texto: modo === "demonstracao" ? texto : fonte.texto,
      _brief: { objetivo, tom, slides, ...(autor ? { autor, leitura, leitura_trabalho: leituraTrabalho, briefing: briefingEd } : {}), idioma_saida: "pt-PT", ...(traducao ? { traducao } : {}), titulo: titulo ?? (meta ? atrib.titulo?.slice(0, 300) ?? null : null), ...(framework ? { framework: framework.id, base_versao: Number.isInteger(Number(body.base_versao)) ? Number(body.base_versao) : null, origem_trabalho: UUID.test(String(body.origem_trabalho ?? "")) ? String(body.origem_trabalho) : null } : {}) }, _prompt_versao: framework ? `r12-${framework.id}-intencao-v1` : modo === "ia" ? "r12-deepseek-intencao-v1" : "r3-v1",
      _modelo: modo === "demonstracao" ? MODELO_DEMO : modo === "ia" ? MODELO_IA : MODELO_ESTRUTURACAO, _parametros: { slides, ...(framework ? { framework: framework.id } : {}) }, _nova: body.nova === true || !!framework,
    };
    const { data, error } = meta
      ? await user.rpc("mc_criar_trabalho_fonte", { ...comum, _tipo: tipoFonte, _titulo: atrib.titulo?.slice(0, 300) ?? null, _origem_url: origemUrl, _metadados: meta as unknown as Record<string, unknown> })
      : await user.rpc("mc_criar_trabalho", { ...comum, _tipo: "texto", _titulo: titulo, _origem_url: null });
    if (error) return json({ error: error.code === "42501" ? "Sem acesso a este projeto." : "Não foi possível criar o trabalho." }, error.code === "42501" ? 403 : 500);
    const linha = (data as Array<{ trabalho_id: string; reutilizado: boolean }>)[0];
    emSegundoPlano(corridaWorker());
    return json({ ok: true, trabalho_id: linha.trabalho_id, reutilizado: linha.reutilizado });
  }

  if (acao === "regenerar_slide") {
    // One paid request for ONE slide of an existing carousel. Source, author snapshot and base narrative
    // are read server-side from the origin job (never trusted from the client).
    const projectId = String(body.project_id ?? "");
    const origemId = String(body.origem_trabalho ?? "");
    const baseVersao = Number(body.base_versao);
    const slideId = String(body.slide_id ?? "");
    const modoR = obterModoRegen(body.modo);
    const nota = typeof body.nota === "string" ? body.nota.trim().slice(0, NOTA_MAX) : "";
    if (!UUID.test(projectId) || !UUID.test(origemId) || !Number.isInteger(baseVersao) || baseVersao < 1 || !/^[\w-]{1,40}$/.test(slideId) || !modoR) return json({ error: "Pedido inválido." }, 400);
    if (body.confirmar !== true) return json({ error: "Regenerar um slide é um pedido pago: confirma antes de continuar." }, 400);
    const { data: orig } = await user.from("mc_trabalhos").select("id, project_id, fonte_id, brief, modelo").eq("id", origemId).eq("project_id", projectId).maybeSingle();
    if (!orig) return json({ error: "Carrossel inexistente ou sem acesso." }, 403);
    const ob = (orig.brief ?? {}) as Record<string, unknown>;
    if (ob.origem_trabalho) return json({ error: "Regenera a partir do carrossel principal, não de uma proposta." }, 400);
    const [{ data: f }, { data: p }] = await Promise.all([
      user.from("mc_fontes").select("tipo, titulo, origem_url, texto, metadados").eq("id", orig.fonte_id).single(),
      user.from("mc_propostas").select("id, versao_actual").eq("trabalho_id", origemId).single(),
    ]);
    if (!f || !p) return json({ error: "Carrossel incompleto." }, 409);
    if (p.versao_actual !== baseVersao) return json({ error: `O texto mudou (versão ${p.versao_actual}). Atualiza a página antes de regenerar.`, codigo: "conflito" }, 409);
    const { data: pv } = await user.from("mc_propostas_versoes").select("conteudo").eq("proposta_id", p.id).eq("versao", baseVersao).single();
    const base = pv?.conteudo as unknown as PropostaEditorial | undefined;
    const indice = base?.slides?.findIndex((s) => s.id === slideId) ?? -1;
    if (!base || indice < 0) return json({ error: "Slide inexistente nesta versão." }, 409);
    const demo = orig.modelo === MODELO_DEMO && f.texto.startsWith(MARCADOR_FIXTURE);
    if (!demo) {
      const { data: o } = await user.from("mc_orcamentos").select("max_chamadas_dia").eq("project_id", projectId).maybeSingle();
      if (!o || o.max_chamadas_dia < 1) return json({ error: "A IA está desligada neste projeto. Define um limite diário em «Limites da IA»." }, 409);
    }
    const brief = {
      objetivo: base.objetivo, tom: base.tom, slides: base.slides.length, titulo: (ob.titulo as string | null) ?? f.titulo,
      ...(ob.autor ? { autor: ob.autor, leitura: ob.leitura === true, leitura_trabalho: ob.leitura_trabalho ?? null, briefing: ob.briefing ?? null } : {}),
      idioma_saida: "pt-PT", ...(ob.traducao ? { traducao: ob.traducao } : {}),
      framework: null, base_versao: baseVersao, origem_trabalho: origemId,
      regen: { slide_id: slideId, indice, modo: modoR, nota, base },
    };
    const comum = {
      _project_id: projectId, _texto: f.texto, _brief: brief, _prompt_versao: `r12-slide-${modoR}`,
      _modelo: demo ? MODELO_DEMO : MODELO_IA, _parametros: { slides: base.slides.length, regen: slideId, modo: modoR }, _nova: true,
    };
    // Same tipo/url as the origin source so the frozen source row (and its hash) is reused.
    const { data, error } = f.tipo !== "texto"
      ? await user.rpc("mc_criar_trabalho_fonte", { ...comum, _tipo: f.tipo, _titulo: f.titulo, _origem_url: f.origem_url, _metadados: f.metadados })
      : await user.rpc("mc_criar_trabalho", { ...comum, _tipo: "texto", _titulo: f.titulo, _origem_url: f.origem_url });
    if (error) return json({ error: error.code === "42501" ? "Sem acesso a este projeto." : "Não foi possível pedir a regeneração." }, error.code === "42501" ? 403 : 500);
    const linha = (data as Array<{ trabalho_id: string }>)[0];
    emSegundoPlano(corridaWorker());
    return json({ ok: true, trabalho_id: linha.trabalho_id, simulado: demo });
  }

  if (acao === "pexels_pesquisar" || acao === "pexels_usar") {
    const projectId = String(body.project_id ?? "");
    if (!UUID.test(projectId)) return json({ error: "Projeto inválido" }, 400);
    const { data: pode } = await user.rpc(acao === "pexels_pesquisar" ? "mc_pode_ler" : "mc_pode_escrever", { _project_id: projectId });
    if (!pode) return json({ error: "Sem acesso a este projeto." }, 403);
    if (acao === "pexels_pesquisar") {
      const r = await pesquisarPexelsMotor(String(body.termo ?? ""), Number(body.pagina ?? 1));
      return r.ok ? json(r) : json({ error: r.erro }, r.estado);
    }
    const url = String(body.url ?? "");
    if (!urlPexelsValido(url)) return json({ error: "Endereço de imagem inválido." }, 400);
    const autor = String(body.autor ?? "").replace(/[\u0000-\u001f<>"`]/g, "").trim().slice(0, 120);
    try {
      const bytes = await descarregarPexels(url);
      const a = await guardarBytes(admin(), { projectId, userId: u.user.id, bytes, origem: "pexels", nome: `Pexels · ${autor || idDoUrl(url)}`, credito: creditoPexels(autor), origemUrl: url });
      return json({ ok: true, asset: { id: a.id, nome: a.nome, mime: a.mime, largura: a.largura, altura: a.altura, bytes: a.bytes, hash: a.hash }, credito: creditoPexels(autor) });
    } catch (e) {
      const m = (e as Error).message;
      return json({ error: /^armazenamento/.test(m) ? "Não foi possível guardar a foto. Tenta de novo." : m }, /^armazenamento/.test(m) ? 500 : 422);
    }
  }

  if (acao === "ler_link" || acao === "listar_imagens" || acao === "registar_imagem" || acao === "carregar_imagem" || acao === "ler_assets") {
    const projectId = String(body.project_id ?? "");
    if (!UUID.test(projectId)) return json({ error: "Projeto inválido" }, 400);
    const leitura = acao === "ler_assets";
    const { data: pode } = await user.rpc(leitura ? "mc_pode_ler" : "mc_pode_escrever", { _project_id: projectId });
    if (!pode) return json({ error: "Sem acesso a este projeto." }, 403);

    if (acao === "ler_link") {
      const r = await lerLink(String(body.url ?? ""));
      console.log("[mc-motor] ler_link", JSON.stringify({ ok: r.ok, motivo: r.ok ? null : r.motivo, bytes: r.ok ? r.bytes : null }));
      return json(r);
    }
    const sb = admin();
    if (acao === "listar_imagens") {
      // Only the caller's own library images (media_library has no project); plus assets already linked to this project.
      const [{ data: media }, { data: assets }] = await Promise.all([
        sb.from("media_library").select("id, file_name, file_url, thumbnail_url, width, height, file_size, source, created_at")
          .eq("user_id", u.user.id).eq("file_type", "image").order("created_at", { ascending: false }).limit(60),
        user.from("mc_assets").select("id, media_id, origem, nome, credito, largura, altura, bytes, mime, criado_em").eq("project_id", projectId).order("criado_em", { ascending: false }).limit(60),
      ]);
      return json({ ok: true, biblioteca: media ?? [], assets: assets ?? [] });
    }
    if (acao === "registar_imagem") {
      const mediaId = String(body.media_id ?? "");
      if (!UUID.test(mediaId)) return json({ error: "Imagem inválida" }, 400);
      try {
        const a = await registarImagem(sb, { projectId, userId: u.user.id, mediaId });
        return json({ ok: true, asset: { id: a.id, nome: a.nome, mime: a.mime, largura: a.largura, altura: a.altura, bytes: a.bytes, hash: a.hash } });
      } catch (e) {
        const m = (e as Error).message;
        return json({ error: m.replace(/^(acesso|origem|expirada|armazenamento): /, "") }, /^acesso/.test(m) ? 403 : /^armazenamento/.test(m) ? 500 : 422);
      }
    }
    if (acao === "carregar_imagem") {
      try {
        const a = await carregarImagem(sb, { projectId, userId: u.user.id, dados: String(body.dados ?? ""), nome: body.nome });
        return json({ ok: true, asset: { id: a.id, nome: a.nome, mime: a.mime, largura: a.largura, altura: a.altura, bytes: a.bytes, hash: a.hash } });
      } catch (e) {
        const m = (e as Error).message;
        return json({ error: /^armazenamento/.test(m) ? "Não foi possível guardar a imagem. Tenta de novo." : m }, /^armazenamento/.test(m) ? 500 : 422);
      }
    }
    // ler_assets: verified bytes for the editor (RLS-checked ids of this project only).
    const ids = Array.isArray(body.ids) ? body.ids.map(String).filter((x) => UUID.test(x)).slice(0, 20) : [];
    const { data: visiveis } = await user.from("mc_assets").select("id").eq("project_id", projectId).in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const ok = new Set((visiveis ?? []).map((r) => r.id as string));
    const assets: Record<string, unknown> = {};
    const falhas: string[] = [];
    for (const id of ids) {
      if (!ok.has(id)) { falhas.push(id); continue; }
      try { Object.assign(assets, await resolverAssets(sb, projectId, [id])); } catch { falhas.push(id); }
    }
    return json({ ok: true, assets, falhas });
  }

  if (acao === "kie_config" || acao === "kie_gerar" || acao === "kie_estado" || acao === "interpretar_imagem") {
    const projectId = String(body.project_id ?? "");
    if (!UUID.test(projectId)) return json({ error: "Projeto inválido" }, 400);
    const { data: pode } = await user.rpc(acao === "kie_config" ? "mc_pode_ler" : "mc_pode_escrever", { _project_id: projectId });
    if (!pode) return json({ error: "Sem acesso a este projeto." }, 403);
    const configurada = !!chaveKie() || !!Deno.env.get("FAL_KEY");
    if (acao === "kie_config" && body.verificar === true) {
      // Free checks only: Kie credit balance and a fal status lookup for a non-existent request (no generation).
      const kie = await fetch("https://api.kie.ai/api/v1/chat/credit", { headers: { Authorization: `Bearer ${chaveKie()}` } }).then(async (r) => ({ http: r.status, corpo: await r.json().catch(() => null) })).catch(() => ({ http: 0, corpo: null }));
      const fal = await fetch("https://queue.fal.run/fal-ai/flux/requests/00000000-0000-0000-0000-000000000000/status", { headers: { Authorization: `Key ${Deno.env.get("FAL_KEY") ?? ""}` } }).then((r) => r.status).catch(() => 0);
      const kc = (kie.corpo as { code?: number; data?: unknown } | null);
      return json({ ok: true, kie: { valida: kie.http === 200 && kc?.code === 200, codigo: kc?.code ?? kie.http, saldo: kc?.code === 200 ? kc.data : null }, fal: { valida: fal !== 401 && fal !== 403 && fal !== 0, http: fal } });
    }
    if (acao === "kie_config") return json({ ok: true, configurada, modelo: KIE_MODELO, proporcao: KIE_PROPORCAO, max_dia: KIE_MAX_DIA });
    if (!configurada) return json({ error: "Configuração necessária: falta a chave do serviço de imagens no servidor.", configuracao: true }, 503);
    if (acao === "interpretar_imagem") {
      if (body.confirmado !== true) return json({ error: "Confirma o pedido pago antes de interpretar." }, 400);
      const assetId = String(body.asset_id ?? "");
      if (!UUID.test(assetId)) return json({ error: "Imagem inválida" }, 400);
      const r = await interpretarImagemKie(admin(), { projectId, userId: u.user.id, assetId });
      return json(r.corpo, r.status);
    }
    if (acao === "kie_gerar") {
      if (body.confirmado !== true) return json({ error: "Confirma a geração antes de pedir." }, 400);
      const prompt = String(body.prompt ?? "").trim();
      if (prompt.length < 5 || prompt.length > 2000) return json({ error: "Descreve a imagem (5 a 2000 caracteres)." }, 400);
      const r = await criarTarefaKie(admin(), { projectId, userId: u.user.id, prompt });
      return json(r.corpo, r.status);
    }
    const tarefa = String(body.tarefa ?? "");
    if (!UUID.test(tarefa)) return json({ error: "Pedido inválido" }, 400);
    const r = await estadoTarefaKie(admin(), { projectId, tarefaId: tarefa });
    return json(r.corpo, r.status);
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
      // Pre-flight: a version that still shows the "Imagem por escolher" placeholder never becomes a final file.
      const { data: dv } = await user.from("mc_documentos_versoes").select("documento").eq("documento_id", docId).eq("versao", versao).maybeSingle();
      const { paginasComMarcador } = await import("../_shared/motor/modelos.ts");
      const marc = dv ? paginasComMarcador(dv.documento as never) : [];
      if (marc.length) return json({ error: `A página ${marc.join(", ")} ainda mostra «Imagem por escolher». Escolhe uma imagem ou muda de modelo antes de exportar.`, codigo: "imagem_por_escolher", paginas: marc }, 422);
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
    // Quality gate: text that does not fit blocks approval of THIS version (older drafts untouched).
    {
      const [{ data: dvx }, { data: pvx }] = await Promise.all([
        user.from("mc_documentos_versoes").select("documento").eq("documento_id", docId).eq("versao", versao).maybeSingle(),
        user.from("mc_propostas_versoes").select("conteudo").eq("proposta_id", doc.proposta_id).eq("versao", propostaVersao).maybeSingle(),
      ]);
      if (!dvx || !pvx) return json({ error: "A versão mudou entretanto. Revê a versão atual antes de preparar." }, 409);
      const { paginasComTransbordo } = await import("../_shared/motor/transbordo.server.ts");
      let pags: number[];
      try { pags = paginasComTransbordo(docId, pvx.conteudo as unknown as PropostaEditorial, dvx.documento as never); }
      catch { return json({ error: "Não foi possível verificar o texto desta versão." }, 503); }
      const { paginasComMarcador } = await import("../_shared/motor/modelos.ts");
      const marc = paginasComMarcador(dvx.documento as never);
      if (marc.length) return json({ error: `A página ${marc.join(", ")} ainda mostra «Imagem por escolher».`, codigo: "imagem_por_escolher", paginas: marc }, 422);
      if (pags.length) return json({ error: `O texto não cabe na página ${pags.join(", ")}. Encurta o texto na Narrativa ou ajusta as caixas na Composição antes de aprovar.`, codigo: "texto_nao_cabe", paginas: pags }, 422);
    }
    const { data: r, error: er } = await user.rpc("mc_preparar_social", { _documento_id: docId, _versao: versao, _proposta_versao: propostaVersao });
    if (er) {
      const st = er.code === "42501" ? 403 : er.code === "MC409" ? 409 : 400;
      return json({ error: er.code === "42501" ? "Sem permissão para preparar rascunhos neste projeto." : er.code === "MC409" ? "A versão mudou entretanto. Revê a versão atual antes de preparar." : er.message }, st);
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
