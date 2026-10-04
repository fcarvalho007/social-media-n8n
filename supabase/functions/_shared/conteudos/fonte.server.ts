// Builds the editorial source of a chronicle carousel from the frozen edition snapshot.
// Old editions without the full chronicle in the snapshot fall back to the stored chronicle
// of the SAME edition and require explicit human source review (origem = historico_actual).
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";
import { paragrafosDoHtml } from "../newsletter-engine/revista/apresentacao-heuristica.ts";
import type { FonteCronica } from "./carrossel.ts";

export class ErroFonte extends Error {
  constructor(msg: string, readonly codigo: "inelegivel" | "parcial" | "sem_texto" | "sem_url" = "inelegivel") {
    super(msg);
  }
}

interface SnapshotLido {
  estado?: string;
  cronica_integral?: { titulo?: string; corpoHtml?: string; url?: string };
  edicao?: { cronica?: { titulo?: string; url?: string; urlProvisoria?: boolean } };
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
  const url = snap?.cronica_integral?.url || snap?.edicao?.cronica?.url || "";
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
  const base = { edicaoId, titulo, paragrafos, url, origem };
  return { ...base, numero: ed.numero, hash: await hashFonte(base) };
}
