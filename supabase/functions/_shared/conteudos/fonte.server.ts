// Builds the editorial source of a chronicle carousel from the frozen edition snapshot.
// Old editions without the full chronicle in the snapshot fall back to the stored chronicle
// of the SAME edition and require explicit human source review (origem = historico_actual).
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";
import { paragrafosDoHtml } from "../newsletter-engine/revista/apresentacao-heuristica.ts";
import { CURSO_IA_URL, paragrafoDestaque, type DestaqueFonte, type FonteCronica } from "./carrossel.ts";
import { destaquesDaEdicao, type EdicaoLida } from "./destaques.ts";
export { destaquesDaEdicao } from "./destaques.ts";
import { paraBaseDestino } from "../nl-destino-urls.ts";
import { basePublica } from "../nl-publico-config.ts";

export class ErroFonte extends Error {
  constructor(msg: string, readonly codigo: "inelegivel" | "parcial" | "sem_texto" | "sem_url" = "inelegivel") {
    super(msg);
  }
}

interface SnapshotLido {
  estado?: string;
  url_web?: string;
  cronica_integral?: { titulo?: string; corpoHtml?: string; url?: string };
  edicao?: EdicaoLida;
}

/** Appends highlights as citable paragraphs and the edition/course links. */
function comDestaques<T extends { paragrafos: string[] }>(base: T, destaques: DestaqueFonte[], edicaoUrl: string) {
  return {
    ...base,
    paragrafos: [...base.paragrafos, ...destaques.map(paragrafoDestaque)],
    destaques,
    ...(edicaoUrl ? { edicaoUrl } : {}),
    cursoUrl: CURSO_IA_URL,
  };
}

export async function hashFonteCompleta(f: Omit<FonteCronica, "hash" | "numero">): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify({
    edicaoId: f.edicaoId, titulo: f.titulo, paragrafos: f.paragrafos, url: f.url, origem: f.origem,
    destaques: f.destaques ?? null, edicaoUrl: f.edicaoUrl ?? null, teste: f.teste ?? false,
  }));
  const d = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(d)).map((n) => n.toString(16).padStart(2, "0")).join("");
}

export async function hashFonte(f: Omit<FonteCronica, "hash" | "numero">): Promise<string> {
  const bytes = new TextEncoder().encode(
    JSON.stringify({ edicaoId: f.edicaoId, titulo: f.titulo, paragrafos: f.paragrafos, url: f.url, origem: f.origem }),
  );
  const d = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(d)).map((n) => n.toString(16).padStart(2, "0")).join("");
}

export async function carregarFonteCronica(sb: SupabaseClient, edicaoId: string): Promise<FonteCronica> {
  const { data, error } = await sb
    .from("nl_edicoes")
    .select("id, numero, estado, template_version, snapshot_envio, revista_snapshot")
    .eq("id", edicaoId)
    .maybeSingle();
  if (error || !data) throw new ErroFonte("Não foi possível ler esta edição.");
  const ed = data as { numero: number; estado: string; template_version: string | null; snapshot_envio: unknown; revista_snapshot: unknown };
  if (ed.estado !== "enviada" || (ed.template_version ?? "revista") !== "revista") {
    throw new ErroFonte("Escolhe uma edição Revista já enviada.");
  }
  const envio = ed.snapshot_envio as { egoi?: unknown[]; egoi_falhas?: unknown[] } | null;
  if (!envio?.egoi?.length) throw new ErroFonte("O envio desta edição não tem campanhas registadas.");
  if (envio.egoi_falhas?.length) {
    throw new ErroFonte("O envio desta edição foi parcial. Resolve as listas em falta antes de criar conteúdos.", "parcial");
  }
  const snap = ed.revista_snapshot as SnapshotLido | null;
  // Legacy snapshots without envelope are treated as locked by the engine.
  if (snap && snap.estado && snap.estado !== "bloqueado") throw new ErroFonte("Esta edição ainda não tem uma fotografia definitiva.");

  let titulo = snap?.cronica_integral?.titulo || snap?.edicao?.cronica?.titulo || "";
  let corpo = snap?.cronica_integral?.corpoHtml || "";
  // Historical snapshots may point to an older public host; carousels always link to the destination.
  const urlSnap = snap?.cronica_integral?.url || snap?.edicao?.cronica?.url || "";
  const destino = basePublica();
  const url = destino ? paraBaseDestino(urlSnap, destino) : urlSnap;
  const origem = corpo ? ("snapshot" as const) : ("historico_actual" as const);
  if (!corpo) {
    const { data: cro, error: e2 } = await sb
      .from("nl_cronicas")
      .select("titulo, conteudo_html, conteudo")
      .eq("edicao_id", edicaoId)
      .maybeSingle();
    if (e2) throw new ErroFonte("Não foi possível ler a crónica integral.");
    const c = cro as { titulo: string | null; conteudo_html: string | null; conteudo: string | null } | null;
    corpo = c?.conteudo_html?.trim() || c?.conteudo?.trim() || "";
    titulo = titulo || c?.titulo || "";
  }
  const paragrafos = paragrafosDoHtml(corpo);
  const total = paragrafos.join(" ").length;
  if (!titulo || total < 200) throw new ErroFonte("A crónica desta edição não tem texto suficiente para um carrossel.", "sem_texto");
  if (total > 40000) throw new ErroFonte("A crónica ultrapassa o limite de 40 000 caracteres. Prepara uma seleção editorial antes de gerar.", "sem_texto");
  if (!/^https:\/\//i.test(url) || snap?.edicao?.cronica?.urlProvisoria) {
    throw new ErroFonte("A edição não tem um endereço publicado para a crónica.", "sem_url");
  }
  const destaques = destaquesDaEdicao(snap?.edicao, destino);
  const urlEd = snap?.url_web || snap?.edicao?.urlPagina || "";
  const edicaoUrl = destino && urlEd ? paraBaseDestino(urlEd, destino) : urlEd;
  const base = comDestaques({ edicaoId, titulo, paragrafos, url, origem }, destaques, edicaoUrl);
  return { ...base, numero: ed.numero, hash: await hashFonteCompleta(base) };
}

/**
 * Explicit pre-send TEST source: current composition (not a send snapshot). Stored under its own
 * type, so it never collides with — nor blocks — the carousel of the version actually sent.
 */
export async function carregarFonteTeste(sb: SupabaseClient, edicaoId: string): Promise<FonteCronica> {
  const { data, error } = await sb.from("nl_edicoes").select("id, numero, estado, template_version").eq("id", edicaoId).maybeSingle();
  if (error || !data) throw new ErroFonte("Não foi possível ler esta edição.");
  const ed = data as { numero: number; estado: string; template_version: string | null };
  if ((ed.template_version ?? "revista") !== "revista") throw new ErroFonte("O rascunho de teste só existe para edições Revista.");
  if (ed.estado === "enviada") throw new ErroFonte("Esta edição já foi enviada: usa o carrossel da versão enviada.");
  const { composeRevistaEdition } = await import("../newsletter-engine/revista/compose.server.ts");
  const comp = await composeRevistaEdition(edicaoId, { ignorarSnapshot: true }) as unknown as EdicaoLida & { cronica?: { titulo?: string; url?: string; urlProvisoria?: boolean } };
  const { data: cro } = await sb.from("nl_cronicas").select("titulo, conteudo_html, conteudo").eq("edicao_id", edicaoId).maybeSingle();
  const c = cro as { titulo: string | null; conteudo_html: string | null; conteudo: string | null } | null;
  const corpo = c?.conteudo_html?.trim() || c?.conteudo?.trim() || "";
  const titulo = comp?.cronica?.titulo || c?.titulo || "";
  const paragrafos = paragrafosDoHtml(corpo);
  if (!titulo || paragrafos.join(" ").length < 200) throw new ErroFonte("A crónica desta edição não tem texto suficiente para um carrossel.", "sem_texto");
  const destino = basePublica();
  const urlCro = comp?.cronica?.url || "";
  const url = destino && urlCro ? paraBaseDestino(urlCro, destino) : urlCro;
  if (!/^https:\/\//i.test(url)) throw new ErroFonte("A edição não tem um endereço publicado para a crónica.", "sem_url");
  const urlEd = comp?.urlPagina || "";
  const edicaoUrl = destino && urlEd ? paraBaseDestino(urlEd, destino) : urlEd;
  const base = { ...comDestaques({ edicaoId, titulo, paragrafos, url, origem: "snapshot" as const }, destaquesDaEdicao(comp, destino), edicaoUrl), teste: true };
  return { ...base, numero: ed.numero, hash: await hashFonteCompleta(base) };
}
