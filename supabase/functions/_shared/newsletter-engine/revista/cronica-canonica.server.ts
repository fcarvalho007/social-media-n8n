// Leitura canónica da crónica de uma edição.
//
// FONTE ÚNICA de dados para o artigo externo: título, segunda linha e lede
// (`revista_edicao`) e corpo (`cronicas`), sempre lidos com o MESMO
// `edicao_id`. Não existe qualquer fallback para outra edição: quando a
// crónica não existe, o corpo vem vazio e a escrita é bloqueada a jusante.

import type { SupabaseClient } from "@supabase/supabase-js";

import type { DadosArtigoCronica } from "./artigo-cronica";
import { urlCanonicaEdicao } from "./destinos.server";

export interface CronicaCanonica extends DadosArtigoCronica {
  /** `destinos.cronica.external_id` guardado nesta edição. */
  externalId: string | number | null;
}

/**
 * Lê a crónica canónica da edição.
 *
 * Todas as consultas são filtradas por `edicao_id`; `cronicas.edicao_id` tem
 * índice único, pelo que existe no máximo uma crónica por edição.
 */
export async function lerCronicaCanonica(
  sb: SupabaseClient,
  edicaoId: string,
): Promise<CronicaCanonica> {
  const alvo = (edicaoId ?? "").trim();
  if (!alvo) throw new Error("Integridade: edição não identificada.");

  const [{ data: ed }, { data: rev }, { data: cro }] = await Promise.all([
    sb.from("edicoes").select("id, numero, destinos").eq("id", alvo).maybeSingle(),
    sb
      .from("revista_edicao")
      .select("edicao_id, cronica_titulo, cronica_subtitulo, cronica_lede")
      .eq("edicao_id", alvo)
      .maybeSingle(),
    sb
      .from("cronicas")
      .select("id, edicao_id, titulo, conteudo_html, conteudo")
      .eq("edicao_id", alvo)
      .maybeSingle(),
  ]);

  const linha = (ed ?? {}) as { id?: string; numero?: number; destinos?: Record<string, unknown> };
  if (!linha.id) throw new Error("Integridade: edição não encontrada.");
  if (linha.id !== alvo) throw new Error("Integridade: a edição lida não é a pedida.");

  const r = (rev ?? {}) as {
    edicao_id?: string;
    cronica_titulo?: string;
    cronica_subtitulo?: string;
    cronica_lede?: string;
  };
  const c = (cro ?? {}) as {
    id?: string;
    edicao_id?: string;
    titulo?: string | null;
    conteudo_html?: string | null;
    conteudo?: string | null;
  };

  // Cinto e suspensórios: a proveniência é verificada aqui e outra vez ao
  // construir o payload.
  if (r.edicao_id && r.edicao_id !== alvo) {
    throw new Error("Integridade: campos editoriais de outra edição.");
  }
  if (c.edicao_id && c.edicao_id !== alvo) {
    throw new Error("Integridade: crónica de outra edição.");
  }

  const destinoCronica = (linha.destinos?.["cronica"] ?? {}) as { external_id?: string | number | null };

  return {
    edicaoId: alvo,
    cronicaId: c.id ?? null,
    cronicaEdicaoId: c.edicao_id ?? null,
    configEdicaoId: r.edicao_id ?? null,
    numeroEdicao: linha.numero ?? 0,
    // Apresentação vazia (ex.: após «Recomeçar edição») → título da própria crónica.
    titulo: (r.cronica_titulo ?? "").trim() || (c.titulo ?? "").trim(),
    subtitulo: (r.cronica_subtitulo ?? "").trim(),
    lede: (r.cronica_lede ?? "").trim(),
    corpoHtml: (c.conteudo_html ?? c.conteudo ?? "").trim(),
    urlEdicao: await urlCanonicaEdicao(linha.numero ?? 0, sb),
    externalId: destinoCronica.external_id ?? null,
  };
}
