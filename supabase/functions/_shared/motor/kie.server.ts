// Kie.ai Seedream 5 Flash adapter (server-only). One reservation row per human click;
// createTask is never repeated after an unknown outcome; results are copied into motor-assets
// (Kie media expires after 14 days). Seedream has no 4:5 ratio, so 3:4 is requested and the
// editor's image layer crops to the 1080×1350 page.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";
import { BUCKET_ASSETS, caminhoAsset, inspecionarImagem } from "./fontes.ts";
import { sha256Hex, type AssetRow } from "./fontes.server.ts";

export const KIE_BASE = "https://api.kie.ai/api/v1/jobs";
export const KIE_MODELO = "seedream/5-flash-text-to-image";
export const KIE_PROPORCAO = "3:4";
export const KIE_MAX_DIA = 10;
/** 2K output; JPEG keeps a 2K 3:4 image under the 6 MB asset limit (PNG at 2K can exceed it). */
export const KIE_TAMANHO = "2K";
export const KIE_FORMATO = "jpeg";
const SUFIXO = "No text, no letters, no captions, no logos, no brand marks, no watermarks. Clean background suitable for overlaying text later.";

export const chaveKie = () => Deno.env.get("KIE_API_KEY") ?? "";

export function corpoKie(prompt: string) {
  return { model: KIE_MODELO, input: { prompt: `${prompt.trim()}\n\n${SUFIXO}`, aspect_ratio: KIE_PROPORCAO, size: KIE_TAMANHO, output_format: KIE_FORMATO, nsfw_checker: true } };
}

export async function criarTarefaKie(sb: SupabaseClient, a: { projectId: string; userId: string; prompt: string }, f: typeof fetch = fetch) {
  const desde = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await sb.from("mc_kie_tarefas").select("id", { count: "exact", head: true }).eq("project_id", a.projectId).eq("modelo", KIE_MODELO).gte("criado_em", desde);
  if ((count ?? 0) >= KIE_MAX_DIA) return { status: 409, corpo: { error: `Limite de ${KIE_MAX_DIA} imagens Kie por dia neste projeto atingido.` } };
  // Reserve BEFORE the paid request.
  const { data: res, error } = await sb.from("mc_kie_tarefas").insert({ project_id: a.projectId, criado_por: a.userId, modelo: KIE_MODELO, prompt: a.prompt }).select("id").single();
  if (error || !res) return { status: 500, corpo: { error: "Não foi possível reservar o pedido." } };
  let r: Response;
  try {
    r = await f(`${KIE_BASE}/createTask`, { method: "POST", headers: { Authorization: `Bearer ${chaveKie()}`, "Content-Type": "application/json" }, body: JSON.stringify(corpoKie(a.prompt)) });
  } catch {
    await sb.from("mc_kie_tarefas").update({ estado: "desconhecido", erro: "Sem resposta da Kie.", actualizado_em: new Date().toISOString() }).eq("id", res.id);
    return { status: 502, corpo: { error: "A Kie não respondeu. O pedido pode ter sido aceite; não foi repetido.", tarefa: res.id, estado: "desconhecido" } };
  }
  const j = await r.json().catch(() => null) as { code?: number; msg?: string; data?: { taskId?: string } } | null;
  const taskId = j?.data?.taskId;
  if (!r.ok || j?.code !== 200 || !taskId) {
    const estado = r.status >= 500 ? "desconhecido" : "falhou";
    await sb.from("mc_kie_tarefas").update({ estado, erro: String(j?.msg ?? r.status).slice(0, 300), actualizado_em: new Date().toISOString() }).eq("id", res.id);
    return { status: r.status === 401 || r.status === 402 ? r.status : 502, corpo: { error: r.status === 402 ? "Sem saldo na Kie." : r.status === 401 ? "A Kie recusou a chave configurada." : `A Kie recusou o pedido (${j?.msg ?? r.status}).`, tarefa: res.id, estado } };
  }
  await sb.from("mc_kie_tarefas").update({ estado: "criada", task_id: taskId, actualizado_em: new Date().toISOString() }).eq("id", res.id);
  return { status: 200, corpo: { ok: true, tarefa: res.id, estado: "criada" } };
}

/** Polls one reserved task (resumable). On success imports the PNG into this project's assets. */
export async function estadoTarefaKie(sb: SupabaseClient, a: { projectId: string; tarefaId: string }, f: typeof fetch = fetch) {
  const { data: t } = await sb.from("mc_kie_tarefas").select("*").eq("id", a.tarefaId).eq("project_id", a.projectId).maybeSingle();
  if (!t) return { status: 404, corpo: { error: "Pedido inexistente neste projeto." } };
  if (t.estado !== "criada") return { status: 200, corpo: { ok: true, estado: t.estado, asset_id: t.asset_id, erro: t.erro } };
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
  const img = await f(url);
  if (!img.ok) return { status: 502, corpo: { error: "Não foi possível descarregar a imagem da Kie. Tenta de novo; o pedido não é repetido." } };
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
    const ins = await sb.from("mc_assets").insert({ project_id: a.projectId, media_id: null, origem: "kie", nome: `Kie · ${t.prompt.slice(0, 180)}`, bucket: BUCKET_ASSETS, storage_path: path, hash, mime: info.mime, largura: info.largura, altura: info.altura, bytes: bytes.length, criado_por: t.criado_por }).select("*").single();
    asset = ins.data as AssetRow | null;
    if (!asset) return { status: 500, corpo: { error: "Não foi possível registar a imagem." } };
  }
  await sb.from("mc_kie_tarefas").update({ estado: "concluida", asset_id: asset.id, actualizado_em: agora }).eq("id", t.id);
  return { status: 200, corpo: { ok: true, estado: "concluida", asset_id: asset.id } };
}

// ---- Vision: interpret a support image (chart/table) with Kie Gemini 3 Flash (OpenAI-compatible chat). ----
export const KIE_VISAO_URL = "https://api.kie.ai/gemini-3-flash/v1/chat/completions";
export const KIE_VISAO_MODELO = "gemini-3-flash:interpretar";
export const KIE_VISAO_MAX_DIA = 20;
const PROMPT_VISAO = "Descreve em português europeu (PT-PT) o que esta imagem mostra, para servir de fonte factual a um carrossel. Se for gráfico ou tabela: título, eixos/colunas, unidades, período e TODOS os valores legíveis, exatamente como aparecem. Depois, numa frase, a leitura principal que os dados permitem. Não inventes valores ilegíveis: escreve «ilegível». Máximo 1200 caracteres, texto simples sem markdown.";

export function corpoVisao(url: string) {
  return { model: "gemini-3-flash", stream: false, include_thoughts: false, reasoning_effort: "low", messages: [{ role: "user", content: [{ type: "text", text: PROMPT_VISAO }, { type: "image_url", image_url: { url } }] }] };
}

/** One reservation per click; never retried after an unknown outcome. Returns an editable description, never applied by itself. */
export async function interpretarImagemKie(sb: SupabaseClient, a: { projectId: string; userId: string; assetId: string }, f: typeof fetch = fetch) {
  const { data: asset } = await sb.from("mc_assets").select("id, bucket, storage_path").eq("project_id", a.projectId).eq("id", a.assetId).maybeSingle();
  if (!asset) return { status: 404, corpo: { error: "Imagem inexistente neste projeto." } };
  const desde = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await sb.from("mc_kie_tarefas").select("id", { count: "exact", head: true }).eq("project_id", a.projectId).eq("modelo", KIE_VISAO_MODELO).gte("criado_em", desde);
  if ((count ?? 0) >= KIE_VISAO_MAX_DIA) return { status: 409, corpo: { error: `Limite de ${KIE_VISAO_MAX_DIA} interpretações por dia neste projeto atingido.` } };
  const assinado = await sb.storage.from(asset.bucket).createSignedUrl(asset.storage_path, 600);
  if (assinado.error || !assinado.data?.signedUrl) return { status: 500, corpo: { error: "Não foi possível preparar a imagem." } };
  const { data: res, error } = await sb.from("mc_kie_tarefas").insert({ project_id: a.projectId, criado_por: a.userId, modelo: KIE_VISAO_MODELO, prompt: "interpretar imagem de apoio", asset_id: asset.id }).select("id").single();
  if (error || !res) return { status: 500, corpo: { error: "Não foi possível reservar o pedido." } };
  const agora = () => new Date().toISOString();
  let r: Response;
  try {
    r = await f(KIE_VISAO_URL, { method: "POST", headers: { Authorization: `Bearer ${chaveKie()}`, "Content-Type": "application/json" }, body: JSON.stringify(corpoVisao(assinado.data.signedUrl)) });
  } catch {
    await sb.from("mc_kie_tarefas").update({ estado: "desconhecido", erro: "Sem resposta da Kie.", actualizado_em: agora() }).eq("id", res.id);
    return { status: 502, corpo: { error: "A Kie não respondeu. O pedido pode ter sido cobrado; não foi repetido.", estado: "desconhecido" } };
  }
  const j = await r.json().catch(() => null) as { code?: number; choices?: { message?: { content?: unknown } }[]; msg?: string; error?: { message?: string } } | null;
  const c = j?.choices?.[0]?.message?.content;
  const texto = (typeof c === "string" ? c : Array.isArray(c) ? c.map((p) => (p as { text?: string }).text ?? "").join("") : "").trim().slice(0, 1500);
  // Kie may answer HTTP 200 with an error code in the body (e.g. 401/402): a definite refusal, not an unknown outcome.
  const codigo = r.ok && typeof j?.code === "number" && j.code >= 400 ? j.code : r.status;
  if (!r.ok || !texto) {
    const estado = codigo >= 400 && codigo < 500 ? "falhou" : "desconhecido";
    await sb.from("mc_kie_tarefas").update({ estado, erro: String(j?.error?.message ?? j?.msg ?? r.status).slice(0, 300), actualizado_em: agora() }).eq("id", res.id);
    return { status: codigo === 402 ? 402 : 502, corpo: { error: codigo === 402 ? "Sem saldo na Kie." : codigo === 401 ? "A Kie recusou a chave para a interpretação de imagens (o pedido foi recusado, não cobrado)." : "A Kie não devolveu uma descrição. O pedido não foi repetido.", estado } };
  }
  await sb.from("mc_kie_tarefas").update({ estado: "concluida", resultado: texto, actualizado_em: agora() }).eq("id", res.id);
  return { status: 200, corpo: { ok: true, descricao: texto } };
}
