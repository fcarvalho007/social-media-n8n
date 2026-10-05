// Server-only source and asset adapters for the content engine.
// Link: fixed-origin allowlist (exact hostnames), manual redirects re-validated each hop, DNS answers checked,
// 10 s budget, 2 MB cap read from the stream, HTML/text only. Reuses the newsletter article extractor.
// Images: bytes always come from this project's own storage API (never an arbitrary URL), header-validated,
// hashed and copied once into the private engine bucket; documents reference the immutable mc_assets row.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";
import { extrairCorpoArtigo, MAX_CORPO } from "../newsletter-engine/ler-artigo.server.ts";
import {
  BUCKET_ASSETS, caminhoAsset, inspecionarImagem, ipBloqueado, LIMITES_IMAGEM, LIMITES_LINK, localBiblioteca, tituloHtml, validarUrlLink,
  type LinkFalhado, type LinkLido,
} from "./fontes.ts";
import type { Asset } from "../documento-grafico/nucleo.ts";

const UA = "DigitalSprintEstudio/1.0 (+leitura-de-fonte)";

/**
 * Defence in depth only: the exact-host allowlist is the actual guarantee (fetch resolves again on its own).
 * Returns false when the host resolves to a blocked address; when the runtime has no DNS API, it reports
 * "indisponivel" and the allowlist alone applies (stated in the UI/report, never claimed as rebinding-proof).
 */
async function dnsSeguro(host: string): Promise<boolean> {
  const tentar = async (t: "A" | "AAAA") => { try { return { ok: true, ips: await Deno.resolveDns(host, t) }; } catch (e) { return { ok: false, ips: [] as string[], e: (e as Error).name }; } };
  const [a, b] = await Promise.all([tentar("A"), tentar("AAAA")]);
  if (!a.ok && !b.ok) { console.log("[mc-motor] dns indisponivel", a.e, b.e); return true; }
  const todos = [...a.ips, ...b.ips];
  const bloqueado = todos.some(ipBloqueado);
  if (bloqueado || !todos.length) console.log("[mc-motor] dns", JSON.stringify({ n: todos.length, bloqueado }));
  return !bloqueado;
}

async function lerLimitado(resp: Response, max: number): Promise<{ bytes: Uint8Array; excedeu: boolean }> {
  const reader = resp.body?.getReader();
  if (!reader) return { bytes: new Uint8Array(), excedeu: false };
  const partes: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > max) { await reader.cancel().catch(() => undefined); return { bytes: new Uint8Array(), excedeu: true }; }
    partes.push(value);
  }
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of partes) { out.set(p, o); o += p.length; }
  return { bytes: out, excedeu: false };
}

const falhou = (motivo: string, mensagem: string): LinkFalhado => ({ ok: false, motivo, mensagem });

export async function lerLink(bruto: string): Promise<LinkLido | LinkFalhado> {
  const v = validarUrlLink(bruto);
  if (!v.ok) return falhou(v.motivo, v.mensagem);
  const ctl = new AbortController();
  const relogio = setTimeout(() => ctl.abort(), LIMITES_LINK.timeoutMs);
  try {
    let atual = v.url;
    for (let saltos = 0; saltos <= LIMITES_LINK.maxRedirects; saltos++) {
      if (!(await dnsSeguro(atual.hostname))) return falhou("dns", "O endereço do site não resolve para um destino público.");
      const resp = await fetch(atual.toString(), {
        redirect: "manual", signal: ctl.signal,
        headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,text/plain", "Accept-Language": "pt-PT,pt;q=0.9,en;q=0.8" },
      });
      if (resp.status >= 300 && resp.status < 400) {
        const loc = resp.headers.get("location");
        await resp.body?.cancel().catch(() => undefined);
        if (!loc) return falhou("redirect", "O site redirecionou sem indicar destino.");
        let prox: URL;
        try { prox = new URL(loc, atual); } catch { return falhou("redirect", "O site redirecionou para um endereço inválido."); }
        const pv = validarUrlLink(prox.toString());
        if (!pv.ok) return falhou("redirect_fora", `O site redirecionou para fora das origens permitidas (${prox.hostname}).`);
        atual = pv.url;
        continue;
      }
      if (resp.status === 401 || resp.status === 402 || resp.status === 403) {
        await resp.body?.cancel().catch(() => undefined);
        return falhou("acesso", "A página exige assinatura ou bloqueia leitura automática. Copia o texto e cola-o.");
      }
      if (!resp.ok) { await resp.body?.cancel().catch(() => undefined); return falhou("http", `O site respondeu com erro (HTTP ${resp.status}).`); }
      const tipo = resp.headers.get("content-type") ?? "";
      if (!/text\/html|application\/xhtml|text\/plain/i.test(tipo)) { await resp.body?.cancel().catch(() => undefined); return falhou("tipo", "O endereço não é uma página de texto."); }
      const declarado = Number(resp.headers.get("content-length") ?? "0");
      if (declarado > LIMITES_LINK.maxBytes) { await resp.body?.cancel().catch(() => undefined); return falhou("tamanho", "A página ultrapassa 2 MB."); }
      const { bytes, excedeu } = await lerLimitado(resp, LIMITES_LINK.maxBytes);
      if (excedeu) return falhou("tamanho", "A página ultrapassa 2 MB.");
      const html = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
      const texto = /text\/plain/i.test(tipo) ? html.trim().slice(0, MAX_CORPO) : extrairCorpoArtigo(html);
      if (!texto || texto.length < 200) return falhou("sem_corpo", "Não foi possível encontrar o texto do artigo (a página pode depender de JavaScript ou ter acesso pago). Copia o texto e cola-o.");
      return { ok: true, titulo: tituloHtml(html), texto, url_final: atual.toString(), bytes: bytes.length, truncado: texto.length >= MAX_CORPO, redirecionamentos: saltos };
    }
    return falhou("redirects", "Demasiados redirecionamentos (máx. 5).");
  } catch (e) {
    return (e as Error).name === "AbortError" ? falhou("tempo", "A página demorou mais de 10 segundos a responder.") : falhou("rede", "Não foi possível contactar o site.");
  } finally {
    clearTimeout(relogio);
  }
}

// ---------------- images ----------------

export async function sha256Hex(b: Uint8Array): Promise<string> {
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", b as Uint8Array<ArrayBuffer>));
  return Array.from(d, (x) => x.toString(16).padStart(2, "0")).join("");
}

function base64(u: Uint8Array): string {
  let s = "";
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
}

export interface AssetRow { id: string; project_id: string; storage_path: string; hash: string; mime: "image/png" | "image/jpeg"; largura: number; altura: number; bytes: number; nome: string | null }

/** Copies one media-library image of the caller into the project's immutable engine assets (idempotent by hash). */
export async function registarImagem(sb: SupabaseClient, a: { projectId: string; userId: string; mediaId: string }): Promise<AssetRow> {
  const { data: m } = await sb.from("media_library").select("id, user_id, file_url, file_type, file_name").eq("id", a.mediaId).maybeSingle();
  if (!m || m.user_id !== a.userId || m.file_type !== "image") throw new Error("acesso: imagem inexistente ou de outro utilizador.");
  const loc = localBiblioteca(m.file_url, Deno.env.get("SUPABASE_URL")!);
  if (!loc) throw new Error("origem: a imagem não está guardada no armazenamento deste Hub.");
  const { data: blob, error } = await sb.storage.from(loc.bucket).download(loc.path);
  if (error || !blob) throw new Error("expirada: o ficheiro original já não está disponível no armazenamento.");
  if (blob.size > LIMITES_IMAGEM.maxBytes) throw new Error("A imagem ultrapassa 6 MB.");
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const info = inspecionarImagem(bytes);
  const hash = await sha256Hex(bytes);
  const { data: existe } = await sb.from("mc_assets").select("*").eq("project_id", a.projectId).eq("hash", hash).maybeSingle();
  if (existe) return existe as AssetRow;
  const path = caminhoAsset(a.projectId, hash, info.mime);
  const up = await sb.storage.from(BUCKET_ASSETS).upload(path, bytes, { contentType: info.mime, upsert: false });
  if (up.error && !/exist|duplicate|409/i.test(up.error.message)) throw new Error(`armazenamento: ${up.error.message}`);
  const { data: novo, error: ei } = await sb.from("mc_assets").insert({
    project_id: a.projectId, media_id: m.id, origem: "biblioteca", nome: String(m.file_name ?? "").slice(0, 200) || null,
    bucket: BUCKET_ASSETS, storage_path: path, hash, mime: info.mime, largura: info.largura, altura: info.altura, bytes: bytes.length, criado_por: a.userId,
  }).select("*").single();
  if (ei) {
    const { data: outra } = await sb.from("mc_assets").select("*").eq("project_id", a.projectId).eq("hash", hash).maybeSingle();
    if (outra) return outra as AssetRow;
    throw new Error(`armazenamento: ${ei.message}`);
  }
  return novo as AssetRow;
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
export async function carregarImagem(sb: SupabaseClient, a: { projectId: string; userId: string; dados: string; nome: unknown }): Promise<AssetRow> {
  if (typeof a.dados !== "string" || !a.dados || a.dados.length > MAX_BASE64_UPLOAD || !/^[A-Za-z0-9+/]+={0,2}$/.test(a.dados)) throw new Error("A imagem está vazia, corrompida ou ultrapassa 6 MB.");
  let bytes: Uint8Array;
  try { bytes = Uint8Array.from(atob(a.dados), (c) => c.charCodeAt(0)); } catch { throw new Error("A imagem está corrompida."); }
  const info = inspecionarImagem(bytes);
  const hash = await sha256Hex(bytes);
  const { data: existe } = await sb.from("mc_assets").select("*").eq("project_id", a.projectId).eq("hash", hash).maybeSingle();
  if (existe) return existe as AssetRow;
  const path = caminhoAsset(a.projectId, hash, info.mime);
  const up = await sb.storage.from(BUCKET_ASSETS).upload(path, bytes, { contentType: info.mime, upsert: false });
  if (up.error && !/exist|duplicate|409/i.test(up.error.message)) throw new Error(`armazenamento: ${up.error.message}`);
  const { data: novo, error: ei } = await sb.from("mc_assets").insert({
    project_id: a.projectId, media_id: null, origem: "upload", nome: nomeCarregado(a.nome),
    bucket: BUCKET_ASSETS, storage_path: path, hash, mime: info.mime, largura: info.largura, altura: info.altura, bytes: bytes.length, criado_por: a.userId,
  }).select("*").single();
  if (ei) {
    const { data: outra } = await sb.from("mc_assets").select("*").eq("project_id", a.projectId).eq("hash", hash).maybeSingle();
    if (outra) return outra as AssetRow;
    throw new Error(`armazenamento: ${ei.message}`);
  }
  return novo as AssetRow;
}

/**
 * Resolves asset ids of one project to verified bytes. Missing rows, other-project ids,
 * expired files or checksum mismatches are errors naming the asset ("recurso"), never silently dropped.
 */
export async function resolverAssets(sb: SupabaseClient, projectId: string, ids: string[]): Promise<Record<string, Asset>> {
  const out: Record<string, Asset> = {};
  if (!ids.length) return out;
  const { data, error } = await sb.from("mc_assets").select("*").eq("project_id", projectId).in("id", ids);
  if (error) throw new Error(`storage: leitura de recursos falhou (${error.message})`);
  const rows = new Map((data ?? []).map((r) => [r.id as string, r as AssetRow]));
  for (const id of ids) {
    const r = rows.get(id);
    if (!r) throw new Error(`recurso ${id.slice(0, 8)} indisponível: a imagem não pertence a este projeto ou foi removida.`);
    const { data: blob, error: e } = await sb.storage.from(BUCKET_ASSETS).download(r.storage_path);
    if (e || !blob) throw new Error(`recurso ${id.slice(0, 8)} indisponível: ficheiro em falta no armazenamento. Substitui a imagem no design.`);
    const b = new Uint8Array(await blob.arrayBuffer());
    if ((await sha256Hex(b)) !== r.hash) throw new Error(`recurso ${id.slice(0, 8)} inválido: impressão digital não confere.`);
    out[id] = { id, mime: r.mime, largura: r.largura, altura: r.altura, dados: base64(b) };
  }
  return out;
}
