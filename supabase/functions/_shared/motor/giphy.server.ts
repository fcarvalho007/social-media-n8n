import { BUCKET_ASSETS } from "./fontes.ts";
import { guardarBytes, sha256Hex } from "./carregar.server.ts";

// deno-lint-ignore no-explicit-any
type SbMinimo = { from: (t: string) => any; storage: { from: (b: string) => any } };

export interface StickerGiphy { id: string; titulo: string; preview: string; still: string; mp4: string; largura: number; altura: number }

function urlGiphy(bruto: string): boolean {
  try { const u = new URL(bruto); return u.protocol === "https:" && (u.hostname === "media.giphy.com" || u.hostname.endsWith(".giphy.com")); } catch { return false; }
}

export async function pesquisarGiphy(termo: string, pagina: number): Promise<StickerGiphy[]> {
  const chave = Deno.env.get("GIPHY_KEY") ?? "";
  if (!chave) throw new Error("A pesquisa GIPHY ainda não está configurada.");
  const q = termo.trim().slice(0, 100);
  if (q.length < 2) return [];
  const u = new URL("https://api.giphy.com/v1/stickers/search");
  u.searchParams.set("api_key", chave); u.searchParams.set("q", q); u.searchParams.set("limit", "24"); u.searchParams.set("offset", String(Math.max(0, Math.min(450, (Math.max(1, pagina) - 1) * 24)))); u.searchParams.set("rating", "g"); u.searchParams.set("lang", "pt");
  const r = await fetch(u, { signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw new Error("A GIPHY não respondeu. Tenta novamente.");
  const j = await r.json() as { data?: Array<{ id?: string; title?: string; images?: Record<string, { url?: string; mp4?: string; width?: string; height?: string }> }> };
  return (j.data ?? []).flatMap((x) => {
    const p = x.images?.fixed_width, s = x.images?.fixed_width_still, m = x.images?.original_mp4 ?? x.images?.downsized_small;
    if (!x.id || !p?.url || !s?.url || !m?.mp4 || !urlGiphy(p.url) || !urlGiphy(s.url) || !urlGiphy(m.mp4)) return [];
    return [{ id: x.id, titulo: (x.title || "Sticker GIPHY").slice(0, 120), preview: p.url, still: s.url, mp4: m.mp4, largura: Number(p.width) || 200, altura: Number(p.height) || 200 }];
  });
}

export async function guardarStickerGiphy(sb: SbMinimo, a: { projectId: string; userId: string; providerId: string; mp4Url: string; capa: Uint8Array; duracaoMs: number }) {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(a.providerId) || !urlGiphy(a.mp4Url)) throw new Error("Sticker inválido.");
  const capa = await guardarBytes(sb, { projectId: a.projectId, userId: a.userId, bytes: a.capa, origem: "giphy", nome: "Sticker GIPHY", credito: "Powered by GIPHY", origemUrl: a.mp4Url });
  const resposta = await fetch(a.mp4Url, { signal: AbortSignal.timeout(15000), redirect: "error" });
  const tipo = resposta.headers.get("content-type") ?? "";
  const tamanho = Number(resposta.headers.get("content-length") ?? 0);
  if (!resposta.ok || !tipo.startsWith("video/mp4") || tamanho > 20 * 1024 * 1024) throw new Error("O sticker animado não pôde ser guardado.");
  const bytes = new Uint8Array(await resposta.arrayBuffer());
  if (bytes.length < 12 || bytes.length > 20 * 1024 * 1024 || String.fromCharCode(...bytes.slice(4, 8)) !== "ftyp") throw new Error("O vídeo do sticker é inválido ou demasiado grande.");
  const hash = await sha256Hex(bytes);
  const { data: existe } = await sb.from("mc_animacoes").select("*").eq("project_id", a.projectId).eq("hash", hash).maybeSingle();
  if (existe) return { capa, animacao: existe };
  const path = `${a.projectId}/${hash}.mp4`;
  const up = await sb.storage.from(BUCKET_ASSETS).upload(path, bytes, { contentType: "video/mp4", upsert: false });
  if (up.error && !/exist|duplicate|409/i.test(up.error.message)) throw new Error("Não foi possível guardar o sticker.");
  const { data: animacao, error } = await sb.from("mc_animacoes").insert({ project_id: a.projectId, cover_asset_id: capa.id, provider: "giphy", provider_id: a.providerId, bucket: BUCKET_ASSETS, storage_path: path, hash, mime: "video/mp4", largura: capa.largura, altura: capa.altura, duracao_ms: Math.min(60000, Math.max(500, Math.round(a.duracaoMs))), bytes: bytes.length, credito: "Powered by GIPHY", criado_por: a.userId }).select("*").single();
  if (error) throw new Error("Não foi possível registar o sticker.");
  return { capa, animacao };
}