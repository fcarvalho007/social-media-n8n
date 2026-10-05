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
const SUFIXO = "No text, no letters, no captions, no logos, no brand marks, no watermarks. Clean background suitable for overlaying text later.";

export const chaveKie = () => Deno.env.get("KIE_API_KEY") ?? "";

export function corpoKie(prompt: string) {
  return { model: KIE_MODELO, input: { prompt: `${prompt.trim()}\n\n${SUFIXO}`, aspect_ratio: KIE_PROPORCAO, size: "1K", output_format: "png", nsfw_checker: true } };
}

export async function criarTarefaKie(sb: SupabaseClient, a: { projectId: string; userId: string; prompt: string }, f: typeof fetch = fetch) {
  const desde = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await sb.from("mc_kie_tarefas").select("id", { count: "exact", head: true }).eq("project_id", a.projectId).gte("criado_em", desde);
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
  const info = inspecionarImagem(bytes);
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
