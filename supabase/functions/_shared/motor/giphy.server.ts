import { BUCKET_ASSETS } from "./fontes.ts";
import { guardarBytes, sha256Hex } from "./carregar.server.ts";

// deno-lint-ignore no-explicit-any
type SbMinimo = { from: (t: string) => any; storage: { from: (b: string) => any } };

export type TipoGiphy = "gifs" | "stickers" | "clips";
export interface ItemGiphy { id: string; tipo: TipoGiphy; titulo: string; preview: string; still: string; mp4: string; largura: number; altura: number; duracao_ms?: number }

function urlGiphy(bruto: string): boolean {
  try { const u = new URL(bruto); return u.protocol === "https:" && ["media.giphy.com", "i.giphy.com"].includes(u.hostname); } catch { return false; }
}

async function descarregar(url: string, tipoEsperado: "image" | "video", maxBytes: number): Promise<Uint8Array> {
  if (!urlGiphy(url)) throw new Error("Resultado GIPHY inválido.");
  const r = await fetch(url, { signal: AbortSignal.timeout(15000), redirect: "error" });
  const tipo = r.headers.get("content-type") ?? "";
  const tamanho = Number(r.headers.get("content-length") ?? 0);
  if (!r.ok || !tipo.startsWith(`${tipoEsperado}/`) || tamanho > maxBytes) throw new Error("O resultado GIPHY não pôde ser guardado.");
  const bytes = new Uint8Array(await r.arrayBuffer());
  if (!bytes.length || bytes.length > maxBytes) throw new Error("O resultado GIPHY é demasiado grande.");
  return bytes;
}

export async function pesquisarGiphy(termo: string, pagina: number, tipo: TipoGiphy = "stickers"): Promise<ItemGiphy[]> {
  const chave = Deno.env.get("GIPHY_KEY") ?? "";
  if (!chave) throw new Error("A pesquisa GIPHY ainda não está configurada.");
  const q = termo.trim().slice(0, 100);
  if (q.length < 2) return [];
  if (!["gifs", "stickers", "clips"].includes(tipo)) throw new Error("Tipo GIPHY inválido.");
  const u = new URL(`https://api.giphy.com/v1/${tipo}/search`);
  u.searchParams.set("api_key", chave); u.searchParams.set("q", q); u.searchParams.set("limit", "24"); u.searchParams.set("offset", String(Math.max(0, Math.min(450, (Math.max(1, pagina) - 1) * 24)))); u.searchParams.set("rating", "g"); u.searchParams.set("lang", "pt");
  const r = await fetch(u, { signal: AbortSignal.timeout(10000) });
  if (r.status === 401 || r.status === 403) throw new Error(tipo === "clips" ? "A ligação GIPHY atual não autoriza Clips." : "A ligação GIPHY foi recusada.");
  if (!r.ok) throw new Error("A GIPHY não respondeu. Tenta novamente.");
  const j = await r.json() as { data?: Array<{ id?: string; title?: string; duration?: number; images?: Record<string, { url?: string; mp4?: string; width?: string; height?: string }>; renditions?: Record<string, { url?: string; width?: number; height?: number }> }> };
  return (j.data ?? []).flatMap((x) => {
    const p = x.images?.fixed_width, s = x.images?.fixed_width_still, m = x.images?.original_mp4 ?? x.images?.downsized_small;
    const clip = x.renditions?.source ?? x.renditions?.hd ?? x.renditions?.fixed_width;
    const mp4 = m?.mp4 ?? clip?.url;
    if (!x.id || !p?.url || !s?.url || !mp4 || !urlGiphy(p.url) || !urlGiphy(s.url) || !urlGiphy(mp4)) return [];
    return [{ id: x.id, tipo, titulo: (x.title || "Resultado GIPHY").slice(0, 120), preview: p.url, still: s.url, mp4, largura: Number(p.width) || clip?.width || 200, altura: Number(p.height) || clip?.height || 200, duracao_ms: x.duration ? Math.round(x.duration * 1000) : undefined }];
  });
}

export async function guardarItemGiphy(sb: SbMinimo, a: { projectId: string; userId: string; providerId: string; tipo: TipoGiphy; mp4Url: string; stillUrl: string; duracaoMs: number }) {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(a.providerId)) throw new Error("Resultado GIPHY inválido.");
  const max = a.tipo === "clips" ? 25 * 1024 * 1024 : 10 * 1024 * 1024;
  const [capaBytes, bytes] = await Promise.all([descarregar(a.stillUrl, "image", 6 * 1024 * 1024), descarregar(a.mp4Url, "video", max)]);
  const nome = a.tipo === "stickers" ? "Sticker GIPHY" : a.tipo === "clips" ? "Clip GIPHY" : "GIF GIPHY";
  const capa = await guardarBytes(sb, { projectId: a.projectId, userId: a.userId, bytes: capaBytes, origem: "giphy", nome, credito: "Powered by GIPHY", origemUrl: a.stillUrl });
  if (bytes.length < 12 || String.fromCharCode(...bytes.slice(4, 8)) !== "ftyp") throw new Error("O vídeo do sticker é inválido.");
  const hash = await sha256Hex(bytes);
  const { data: existe } = await sb.from("mc_animacoes").select("*").eq("project_id", a.projectId).eq("hash", hash).maybeSingle();
  if (existe) return { capa, animacao: existe };
  const path = `${a.projectId}/${hash}.mp4`;
  const up = await sb.storage.from(BUCKET_ASSETS).upload(path, bytes, { contentType: "video/mp4", upsert: false });
  if (up.error && !/exist|duplicate|409/i.test(up.error.message)) throw new Error("Não foi possível guardar o sticker.");
  const { data: animacao, error } = await sb.from("mc_animacoes").insert({ project_id: a.projectId, cover_asset_id: capa.id, provider: "giphy", provider_id: a.providerId, bucket: BUCKET_ASSETS, storage_path: path, hash, mime: "video/mp4", largura: capa.largura, altura: capa.altura, duracao_ms: Math.min(60000, Math.max(500, Math.round(a.duracaoMs))), bytes: bytes.length, credito: "Powered by GIPHY", criado_por: a.userId }).select("*").single();
  if (error) throw new Error("Não foi possível registar o resultado GIPHY.");
  return { capa, animacao };
}