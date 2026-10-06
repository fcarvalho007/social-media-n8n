// Direct user upload into the project's immutable engine assets (origem "upload"). Deno-free so it can be unit-tested.
import { BUCKET_ASSETS, caminhoAsset, inspecionarImagem, LIMITES_IMAGEM } from "./fontes.ts";

export interface AssetCarregado { id: string; project_id: string; storage_path: string; hash: string; mime: "image/png" | "image/jpeg"; largura: number; altura: number; bytes: number; nome: string | null }
// deno-lint-ignore no-explicit-any
type SbMinimo = { from: (t: string) => any; storage: { from: (b: string) => any } };

export async function sha256Hex(b: Uint8Array): Promise<string> {
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", b as Uint8Array<ArrayBuffer>));
  return Array.from(d, (x) => x.toString(16).padStart(2, "0")).join("");
}

/** Max base64 length accepted for a direct upload (6 MB of bytes after browser preparation). */
export const MAX_BASE64_UPLOAD = Math.ceil((LIMITES_IMAGEM.maxBytes * 4) / 3) + 4;

/** Display name for an uploaded file: control chars, path parts and markup removed; never interpreted. */
export function nomeCarregado(bruto: unknown): string {
  const base = String(bruto ?? "").split(/[\\/]/).pop() ?? "";
  const limpo = base.replace(/[\u0000-\u001f\u007f<>"`]/g, "").replace(/\s+/g, " ").trim().slice(0, 150);
  return `Carregada por ti · ${limpo || "imagem"}`;
}

/** Stores bytes uploaded by the user as an immutable project asset (origem "upload"); validated by header only. */
export async function carregarImagem(sb: SbMinimo, a: { projectId: string; userId: string; dados: string; nome: unknown }): Promise<AssetCarregado> {
  if (typeof a.dados !== "string" || !a.dados || a.dados.length > MAX_BASE64_UPLOAD || !/^[A-Za-z0-9+/]+={0,2}$/.test(a.dados)) throw new Error("A imagem está vazia, corrompida ou ultrapassa 6 MB.");
  let bytes: Uint8Array;
  try { bytes = Uint8Array.from(atob(a.dados), (c) => c.charCodeAt(0)); } catch { throw new Error("A imagem está corrompida."); }
  return guardarBytes(sb, { projectId: a.projectId, userId: a.userId, bytes, origem: "upload", nome: nomeCarregado(a.nome) });
}

/** Stores validated bytes as an immutable project asset, deduplicated by project + hash. */
export async function guardarBytes(sb: SbMinimo, a: { projectId: string; userId: string; bytes: Uint8Array; origem: "upload" | "pexels" | "unsplash" | "giphy"; nome: string; credito?: string | null; origemUrl?: string | null }): Promise<AssetCarregado> {
  const bytes = a.bytes;
  const info = inspecionarImagem(bytes);
  const hash = await sha256Hex(bytes);
  const { data: existe } = await sb.from("mc_assets").select("*").eq("project_id", a.projectId).eq("hash", hash).maybeSingle();
  if (existe) return existe as AssetCarregado;
  const path = caminhoAsset(a.projectId, hash, info.mime);
  const up = await sb.storage.from(BUCKET_ASSETS).upload(path, bytes, { contentType: info.mime, upsert: false });
  if (up.error && !/exist|duplicate|409/i.test(up.error.message)) throw new Error(`armazenamento: ${up.error.message}`);
  const { data: novo, error: ei } = await sb.from("mc_assets").insert({
    project_id: a.projectId, media_id: null, origem: a.origem, nome: a.nome, credito: a.credito ?? null, origem_url: a.origemUrl ?? null,
    bucket: BUCKET_ASSETS, storage_path: path, hash, mime: info.mime, largura: info.largura, altura: info.altura, bytes: bytes.length, criado_por: a.userId,
  }).select("*").single();
  if (ei) {
    const { data: outra } = await sb.from("mc_assets").select("*").eq("project_id", a.projectId).eq("hash", hash).maybeSingle();
    if (outra) return outra as AssetCarregado;
    throw new Error(`armazenamento: ${ei.message}`);
  }
  return novo as AssetCarregado;
}

