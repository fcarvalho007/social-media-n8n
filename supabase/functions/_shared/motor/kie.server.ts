// Kie.ai Seedream 5 Flash adapter (server-only). One reservation row per human click;
// createTask is never repeated after an unknown outcome; results are copied into motor-assets
// (Kie media expires after 14 days). Seedream has no 4:5 ratio, so 3:4 is requested and the
// editor's image layer crops to the 1080×1350 page.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";
import { BUCKET_ASSETS, caminhoAsset, inspecionarImagem } from "./fontes.ts";
import { sha256Hex, type AssetRow } from "./fontes.server.ts";

export const KIE_BASE = "https://api.kie.ai/api/v1/jobs";
import { recusaAntesDeCobrar, registosVisao, resolverModeloVisao, VISAO_KIE, type ModeloVisao } from "./visaoModelo.server.ts";
import { FAL_IMAGEM_EUR, modelosImagem, resolverFornecedorImagem, resolverModeloImagem, type QualidadeImagem } from "./imagemModelo.server.ts";
/** Default model (informative); the actual model comes from resolverModeloImagem at call time. */
export const KIE_MODELO = resolverModeloImagem("fast").modelo;
export const KIE_PROPORCAO = "3:4";
export const KIE_MAX_DIA = 10;
/** 2K output; JPEG keeps a 2K 3:4 image under the 6 MB asset limit (PNG at 2K can exceed it). */
export const KIE_TAMANHO = "2K";
export const KIE_FORMATO = "jpeg";
const SUFIXO = "No text, no letters, no captions, no logos, no brand marks, no watermarks. Clean background suitable for overlaying text later.";

export const chaveKie = () => Deno.env.get("KIE_API_KEY") ?? "";

export function corpoKie(prompt: string, modelo: string = KIE_MODELO) {
  return { model: modelo, input: { prompt: `${prompt.trim()}\n\n${SUFIXO}`, aspect_ratio: KIE_PROPORCAO, size: KIE_TAMANHO, output_format: KIE_FORMATO, nsfw_checker: true } };
}

/** True when Kie rejected the request because the model itself is unavailable (known outcome, no task created). */
export const modeloIndisponivel = (status: number, msg: unknown) =>
  status >= 400 && status < 500 && status !== 401 && status !== 402 && /model|modelo|not (found|support)|unavailable/i.test(String(msg ?? ""));

export async function criarTarefaKie(sb: SupabaseClient, a: { projectId: string; userId: string; prompt: string; qualidade?: QualidadeImagem }, f: typeof fetch = fetch) {
  const desde = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await sb.from("mc_kie_tarefas").select("id", { count: "exact", head: true }).eq("project_id", a.projectId).in("modelo", modelosImagem()).gte("criado_em", desde);
  if ((count ?? 0) >= KIE_MAX_DIA) return { status: 409, corpo: { error: `Limite de ${KIE_MAX_DIA} imagens IA por dia neste projeto atingido.` } };
  const forn = resolverFornecedorImagem((k) => Deno.env.get(k) ?? undefined);
  if (forn.principal === "fal") {
    const p = await tentarFal(sb, a, forn.falModelo, f);
    // Kie only when fal refused BEFORE charging; never after an unknown outcome.
    if (!p.recusado || !forn.fallback) return p.r;
  }
  const { modelo, fallback } = resolverModeloImagem(a.qualidade ?? "fast");
  const primeira = await tentarModelo(sb, a, modelo, f);
  // Fallback only when the primary model was refused BEFORE a task existed; never after an unknown outcome.
  if (fallback && primeira.indisponivel) return (await tentarModelo(sb, a, fallback, f)).r;
  return primeira.r;
}

export const FAL_FILA = "https://queue.fal.run";
export function corpoFal(prompt: string) {
  return { prompt: `${prompt.trim()}\n\n${SUFIXO}`, image_size: { width: 1088, height: 1360 }, num_images: 1, output_format: "jpeg", enable_safety_checker: true };
}

async function tentarFal(sb: SupabaseClient, a: { projectId: string; userId: string; prompt: string }, modelo: string, f: typeof fetch) {
  const registo = `fal:${modelo}`;
  const { data: res, error } = await sb.from("mc_kie_tarefas").insert({ project_id: a.projectId, criado_por: a.userId, modelo: registo, prompt: a.prompt }).select("id").single();
  if (error || !res) return { recusado: false, r: { status: 500, corpo: { error: "Não foi possível reservar o pedido." } as Record<string, unknown> } };
  const upd = (v: Record<string, unknown>) => sb.from("mc_kie_tarefas").update({ ...v, actualizado_em: new Date().toISOString() }).eq("id", res.id);
  let r: Response;
  try {
    r = await f(`${FAL_FILA}/${modelo}`, { method: "POST", headers: { Authorization: `Key ${Deno.env.get("FAL_KEY") ?? ""}`, "Content-Type": "application/json" }, body: JSON.stringify(corpoFal(a.prompt)) });
  } catch {
    await upd({ estado: "desconhecido", erro: "Sem resposta da fal.ai." });
    return { recusado: false, r: { status: 502, corpo: { error: "A fal.ai não respondeu. O pedido pode ter sido aceite; não foi repetido.", tarefa: res.id, estado: "desconhecido" } as Record<string, unknown> } };
  }
  const j = await r.json().catch(() => null) as { request_id?: string; response_url?: string; detail?: unknown } | null;
  if (!r.ok || !j?.response_url) {
    const recusado = recusaAntesDeCobrar(r.status);
    await upd({ estado: r.status >= 500 ? "desconhecido" : "falhou", erro: String(JSON.stringify(j?.detail ?? r.status)).slice(0, 300) });
    const msg = r.status === 401 || r.status === 403 ? "Serviço de imagens IA (fal.ai) recusou a chave. Nada foi cobrado." : `O serviço de imagens recusou o pedido (${r.status}). Nada foi repetido.`;
    return { recusado, r: { status: r.status === 401 || r.status === 403 ? 503 : 502, corpo: { error: msg, codigo: r.status === 401 || r.status === 403 ? "chave_invalida" : "recusado", tarefa: res.id } as Record<string, unknown> } };
  }
  await upd({ estado: "criada", task_id: j.response_url });
  return { recusado: false, r: { status: 200, corpo: { ok: true, tarefa: res.id, estado: "criada", modelo: registo } as Record<string, unknown> } };
}

async function tentarModelo(sb: SupabaseClient, a: { projectId: string; userId: string; prompt: string }, modelo: string, f: typeof fetch) {
  // Reserve BEFORE the paid request.
  const { data: res, error } = await sb.from("mc_kie_tarefas").insert({ project_id: a.projectId, criado_por: a.userId, modelo, prompt: a.prompt }).select("id").single();
  if (error || !res) return { indisponivel: false, r: { status: 500, corpo: { error: "Não foi possível reservar o pedido." } as Record<string, unknown> } };
  let r: Response;
  try {
    r = await f(`${KIE_BASE}/createTask`, { method: "POST", headers: { Authorization: `Bearer ${chaveKie()}`, "Content-Type": "application/json" }, body: JSON.stringify(corpoKie(a.prompt, modelo)) });
  } catch {
    await sb.from("mc_kie_tarefas").update({ estado: "desconhecido", erro: "Sem resposta da Kie.", actualizado_em: new Date().toISOString() }).eq("id", res.id);
    return { indisponivel: false, r: { status: 502, corpo: { error: "A Kie não respondeu. O pedido pode ter sido aceite; não foi repetido.", tarefa: res.id, estado: "desconhecido" } as Record<string, unknown> } };
  }
  const j = await r.json().catch(() => null) as { code?: number; msg?: string; data?: { taskId?: string } } | null;
  const taskId = j?.data?.taskId;
  if (!r.ok || j?.code !== 200 || !taskId) {
    const estado = r.status >= 500 ? "desconhecido" : "falhou";
    await sb.from("mc_kie_tarefas").update({ estado, erro: String(j?.msg ?? r.status).slice(0, 300), actualizado_em: new Date().toISOString() }).eq("id", res.id);
    // Kie reports auth/credit errors either as HTTP status or as `code` inside a 200 body.
    const cod = r.status === 401 || j?.code === 401 || /unauthori[sz]ed|authentication failed/i.test(String(j?.msg ?? "")) ? 401 : r.status === 402 || j?.code === 402 ? 402 : 0;
    const indisponivel = estado === "falhou" && !cod && modeloIndisponivel(r.ok ? 400 : r.status, j?.msg);
    const msg = cod === 401 ? "Serviço de imagens IA indisponível: a chave do servidor foi recusada. Nada foi cobrado." : cod === 402 ? "Serviço de imagens IA sem saldo. Nada foi cobrado." : `O serviço de imagens recusou o pedido (${j?.msg ?? r.status}). Nada foi repetido.`;
    return { indisponivel, r: { status: cod === 402 ? 402 : cod === 401 ? 503 : 502, corpo: { error: msg, codigo: cod === 401 ? "chave_invalida" : cod === 402 ? "sem_saldo" : "recusado", tarefa: res.id, estado } as Record<string, unknown> } };
  }
  await sb.from("mc_kie_tarefas").update({ estado: "criada", task_id: taskId, actualizado_em: new Date().toISOString() }).eq("id", res.id);
  return { indisponivel: false, r: { status: 200, corpo: { ok: true, tarefa: res.id, estado: "criada", modelo } as Record<string, unknown> } };
}

/** Polls one reserved task (resumable). On success imports the PNG into this project's assets. */
export async function estadoTarefaKie(sb: SupabaseClient, a: { projectId: string; tarefaId: string }, f: typeof fetch = fetch) {
  const { data: t } = await sb.from("mc_kie_tarefas").select("*").eq("id", a.tarefaId).eq("project_id", a.projectId).maybeSingle();
  if (!t) return { status: 404, corpo: { error: "Pedido inexistente neste projeto." } };
  if (t.estado !== "criada") return { status: 200, corpo: { ok: true, estado: t.estado, asset_id: t.asset_id, erro: t.erro } };
  if (String(t.modelo).startsWith("fal:")) return await estadoFal(sb, a.projectId, t, f);
  const r = await f(`${KIE_BASE}/recordInfo?taskId=${encodeURIComponent(t.task_id)}`, { headers: { Authorization: `Bearer ${chaveKie()}` } }).catch(() => null);
  const j = r ? await r.json().catch(() => null) as { data?: { state?: string; resultJson?: string; failMsg?: string } } | null : null;
  const st = j?.data?.state;
  if (!st || st === "waiting" || st === "queuing" || st === "generating") return { status: 200, corpo: { ok: true, estado: "criada" } };
  const agora = new Date().toISOString();
  if (st !== "success") {
    await sb.from("mc_kie_tarefas").update({ estado: "falhou", erro: String(j?.data?.failMsg ?? st).slice(0, 300), actualizado_em: agora }).eq("id", t.id);
    return { status: 200, corpo: { ok: true, estado: "falhou", erro: j?.data?.failMsg ?? st } };
  }
  let url: string | undefined;
  try { url = (JSON.parse(j!.data!.resultJson ?? "{}") as { resultUrls?: string[] }).resultUrls?.[0]; } catch { /* tratado abaixo */ }
  if (!url) return { status: 200, corpo: { ok: true, estado: "criada", aviso: "Resultado ainda sem ficheiro." } };
  return await importarResultado(sb, a.projectId, t, url, f);
}

// deno-lint-ignore no-explicit-any
type Tarefa = Record<string, any>;
async function estadoFal(sb: SupabaseClient, projectId: string, t: Tarefa, f: typeof fetch) {
  const h = { Authorization: `Key ${Deno.env.get("FAL_KEY") ?? ""}` };
  const s = await f(`${t.task_id}/status`, { headers: h }).catch(() => null);
  const sj = s ? await s.json().catch(() => null) as { status?: string } | null : null;
  if (!sj?.status || sj.status === "IN_QUEUE" || sj.status === "IN_PROGRESS") return { status: 200, corpo: { ok: true, estado: "criada" } };
  const r = await f(String(t.task_id), { headers: h }).catch(() => null);
  const j = r ? await r.json().catch(() => null) as { images?: { url?: string }[]; detail?: unknown } | null : null;
  const url = j?.images?.[0]?.url;
  if (!r?.ok || !url) {
    if (r && r.status >= 400 && r.status < 500) {
      await sb.from("mc_kie_tarefas").update({ estado: "falhou", erro: String(JSON.stringify(j?.detail ?? r.status)).slice(0, 300), actualizado_em: new Date().toISOString() }).eq("id", t.id);
      return { status: 200, corpo: { ok: true, estado: "falhou", erro: "A fal.ai não conseguiu gerar esta imagem." } };
    }
    return { status: 200, corpo: { ok: true, estado: "criada" } };
  }
  const out = await importarResultado(sb, projectId, t, url, f);
  if (out.corpo && (out.corpo as { estado?: string }).estado === "concluida") {
    await sb.from("custos_ia").insert({ fornecedor: "fal", modelo: String(t.modelo).slice(4), acao: "gerar imagem", estado: "concluido", origem_id: `kie:${t.id}`, project_id: projectId, unidades: { imagens: 1 }, custo_eur: FAL_IMAGEM_EUR, custo_origem: "estimado" });
  }
  return out;
}

async function importarResultado(sb: SupabaseClient, projectId: string, t: Tarefa, url: string, f: typeof fetch) {
  const a = { projectId };
  const agora = new Date().toISOString();
  const img = await f(url);
  if (!img.ok) return { status: 502, corpo: { error: "Não foi possível descarregar a imagem gerada. Tenta de novo; o pedido não é repetido." } };
  const bytes = new Uint8Array(await img.arrayBuffer());
  let info: ReturnType<typeof inspecionarImagem>;
  try { info = inspecionarImagem(bytes); }
  catch (e) { return { status: 502, corpo: { error: `A imagem da Kie não pôde ser aceite: ${(e as Error).message} O pedido não é repetido.` } }; }
  const hash = await sha256Hex(bytes);
  let asset: AssetRow | null = (await sb.from("mc_assets").select("*").eq("project_id", a.projectId).eq("hash", hash).maybeSingle()).data as AssetRow | null;
  if (!asset) {
    const path = caminhoAsset(a.projectId, hash, info.mime);
    const up = await sb.storage.from(BUCKET_ASSETS).upload(path, bytes, { contentType: info.mime, upsert: false });
    if (up.error && !/exist|duplicate|409/i.test(up.error.message)) return { status: 500, corpo: { error: "Não foi possível guardar a imagem." } };
    const ins = await sb.from("mc_assets").insert({ project_id: a.projectId, media_id: null, origem: "kie", nome: `${String(t.modelo).startsWith("fal:") ? "fal.ai" : "Kie"} · ${t.prompt.slice(0, 180)}`, bucket: BUCKET_ASSETS, storage_path: path, hash, mime: info.mime, largura: info.largura, altura: info.altura, bytes: bytes.length, criado_por: t.criado_por }).select("*").single();
    asset = ins.data as AssetRow | null;
    if (!asset) return { status: 500, corpo: { error: "Não foi possível registar a imagem." } };
  }
  await sb.from("mc_kie_tarefas").update({ estado: "concluida", asset_id: asset.id, actualizado_em: agora }).eq("id", t.id);
  return { status: 200, corpo: { ok: true, estado: "concluida", asset_id: asset.id } };
}

// ---- Vision: interpret a support image (chart/table). Provider chosen in visaoModelo.server.ts. ----
export const KIE_VISAO_URL = "https://api.kie.ai/gemini-3-flash/v1/chat/completions";
export const FAL_VISAO_URL = "https://fal.run/openrouter/router/vision";
export const KIE_VISAO_MODELO = VISAO_KIE.registo;
export const KIE_VISAO_MAX_DIA = 20;
/** Same fixed rate as public.custos_taxa_usd_eur(). */
const USD_EUR = 0.86;
const PROMPT_VISAO = "Descreve em português europeu (PT-PT) o que esta imagem mostra, para servir de fonte factual a um carrossel. Se for gráfico ou tabela: título, eixos/colunas, unidades, período e TODOS os valores legíveis, exatamente como aparecem. Depois, numa frase, a leitura principal que os dados permitem. Não inventes valores ilegíveis: escreve «ilegível». Máximo 1200 caracteres, texto simples sem markdown.";

export function corpoVisao(url: string) {
  return { model: "gemini-3-flash", stream: false, include_thoughts: false, reasoning_effort: "low", messages: [{ role: "user", content: [{ type: "text", text: PROMPT_VISAO }, { type: "image_url", image_url: { url } }] }] };
}
export function corpoVisaoFal(url: string, modelo: string) {
  return { image_urls: [url], prompt: PROMPT_VISAO, model: modelo, max_tokens: 700, temperature: 0 };
}

type Tentativa = { tipo: "ok"; texto: string; custoUsd: number | null; tokens: Record<string, number> } | { tipo: "recusa"; codigo: number; msg: string } | { tipo: "desconhecido"; msg: string };

async function pedirVisao(m: ModeloVisao, url: string, f: typeof fetch): Promise<Tentativa> {
  const chave = m.fornecedor === "fal" ? Deno.env.get("FAL_KEY") ?? "" : chaveKie();
  if (!chave) return { tipo: "recusa", codigo: 401, msg: "Chave em falta." };
  let r: Response;
  try {
    r = m.fornecedor === "fal"
      ? await f(FAL_VISAO_URL, { method: "POST", headers: { Authorization: `Key ${chave}`, "Content-Type": "application/json" }, body: JSON.stringify(corpoVisaoFal(url, m.modelo)) })
      : await f(KIE_VISAO_URL, { method: "POST", headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" }, body: JSON.stringify(corpoVisao(url)) });
  } catch { return { tipo: "desconhecido", msg: "Sem resposta." }; }
  const j = await r.json().catch(() => null) as { code?: number; output?: string; choices?: { message?: { content?: unknown } }[]; msg?: string; detail?: unknown; error?: { message?: string }; usage?: { prompt_tokens?: number; completion_tokens?: number; cost?: number } } | null;
  const c = m.fornecedor === "fal" ? j?.output : j?.choices?.[0]?.message?.content;
  const texto = (typeof c === "string" ? c : Array.isArray(c) ? c.map((p) => (p as { text?: string }).text ?? "").join("") : "").trim().slice(0, 1500);
  // Kie may answer HTTP 200 with an error code in the body: a definite refusal, not an unknown outcome.
  const codigo = r.ok && typeof j?.code === "number" && j.code >= 400 ? j.code : r.status;
  const msg = String(j?.error?.message ?? j?.msg ?? (typeof j?.detail === "string" ? j.detail : "") ?? r.status).slice(0, 300) || String(codigo);
  if (codigo < 400 && texto) return { tipo: "ok", texto, custoUsd: typeof j?.usage?.cost === "number" ? j.usage.cost : null, tokens: { entrada: j?.usage?.prompt_tokens ?? 0, saida: j?.usage?.completion_tokens ?? 0 } };
  if (codigo >= 400 && codigo < 500) return { tipo: "recusa", codigo, msg };
  return { tipo: "desconhecido", msg };
}

/** One reservation per click; the fallback runs only after a definite refusal before charging; never retried after an unknown outcome. */
export async function interpretarImagemKie(sb: SupabaseClient, a: { projectId: string; userId: string; assetId: string }, f: typeof fetch = fetch) {
  const { data: asset } = await sb.from("mc_assets").select("id, bucket, storage_path").eq("project_id", a.projectId).eq("id", a.assetId).maybeSingle();
  if (!asset) return { status: 404, corpo: { error: "Imagem inexistente neste projeto." } };
  const desde = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await sb.from("mc_kie_tarefas").select("id", { count: "exact", head: true }).eq("project_id", a.projectId).in("modelo", registosVisao()).gte("criado_em", desde);
  if ((count ?? 0) >= KIE_VISAO_MAX_DIA) return { status: 409, corpo: { error: `Limite de ${KIE_VISAO_MAX_DIA} interpretações por dia neste projeto atingido.` } };
  const assinado = await sb.storage.from(asset.bucket).createSignedUrl(asset.storage_path, 600);
  if (assinado.error || !assinado.data?.signedUrl) return { status: 500, corpo: { error: "Não foi possível preparar a imagem." } };
  const { principal, fallback } = resolverModeloVisao();
  const agora = () => new Date().toISOString();
  let ultima: { codigo: number } | null = null;
  for (const m of fallback ? [principal, fallback] : [principal]) {
    const { data: res, error } = await sb.from("mc_kie_tarefas").insert({ project_id: a.projectId, criado_por: a.userId, modelo: m.registo, prompt: "interpretar imagem de apoio", asset_id: asset.id }).select("id").single();
    if (error || !res) return { status: 500, corpo: { error: "Não foi possível reservar o pedido." } };
    const t = await pedirVisao(m, assinado.data.signedUrl, f);
    if (t.tipo === "ok") {
      await sb.from("mc_kie_tarefas").update({ estado: "concluida", resultado: t.texto, actualizado_em: agora() }).eq("id", res.id);
      // Cost ledger: provider-reported cost when present, otherwise the published-price estimate.
      await sb.from("custos_ia").insert({ fornecedor: m.fornecedor, modelo: m.modelo, acao: "ler imagem", estado: "concluido", origem_id: `kie:${res.id}`, project_id: a.projectId, unidades: t.tokens,
        custo_eur: t.custoUsd != null ? Math.round(t.custoUsd * USD_EUR * 1e6) / 1e6 : (m.fornecedor === "fal" ? 0.001 : 0.005), custo_origem: t.custoUsd != null ? "confirmado" : "estimado" });
      return { status: 200, corpo: { ok: true, descricao: t.texto, fornecedor: m.fornecedor } };
    }
    if (t.tipo === "desconhecido") {
      await sb.from("mc_kie_tarefas").update({ estado: "desconhecido", erro: t.msg, actualizado_em: agora() }).eq("id", res.id);
      return { status: 502, corpo: { error: "O serviço de leitura não devolveu uma descrição. O pedido pode ter sido cobrado; não foi repetido.", estado: "desconhecido" } };
    }
    await sb.from("mc_kie_tarefas").update({ estado: "falhou", erro: t.msg, actualizado_em: agora() }).eq("id", res.id);
    ultima = { codigo: t.codigo };
    if (!recusaAntesDeCobrar(t.codigo)) break;
  }
  const cod = ultima?.codigo ?? 0;
  return { status: cod === 402 ? 402 : 503, corpo: { error: cod === 402 ? "Sem saldo no serviço de leitura de imagens. Nada foi cobrado." : "Serviço de leitura de imagens indisponível: o pedido foi recusado. Nada foi cobrado.", estado: "falhou" } };
}
