// Detecção de duplicados por URL normalizado.
//
// A coluna `noticias.url_norm` é preenchida por trigger na base de dados
// (`normalizar_url_sql`) e espelha `normalizarUrl` daqui. Todas as portas de
// entrada de notícias — RSS, emails, colagem manual, adição individual e
// recuperação no Arquivo — devem usar este módulo em vez de comparar o URL
// literal, senão um `?utm_source=...` diferente cria uma notícia repetida.

import { normalizarUrl } from "./ia-limpeza.ts";

// deno-lint-ignore no-explicit-any
type Admin = any;

export type NoticiaGemea = {
  id: string;
  titulo: string;
  estado: string;
  url: string | null;
  edicao_numero: number | null;
};

/**
 * Devolve um mapa `url normalizado → notícia já existente` para os URLs dados.
 * Consulta em lotes para não estourar o tamanho do pedido.
 */
export async function procurarDuplicadosUrl(
  admin: Admin,
  urls: Array<string | null | undefined>,
): Promise<Map<string, NoticiaGemea>> {
  const mapa = new Map<string, NoticiaGemea>();
  const chaves = Array.from(
    new Set(urls.filter((u): u is string => !!u && u.trim() !== "").map((u) => normalizarUrl(u))),
  );
  if (chaves.length === 0) return mapa;

  const LOTE = 100;
  for (let i = 0; i < chaves.length; i += LOTE) {
    const fatia = chaves.slice(i, i + LOTE);
    const { data } = await admin
      .from("nl_noticias")
      .select("id, titulo, estado, url, url_norm, edicao:edicoes(numero)")
      .in("url_norm", fatia);
    for (const r of data ?? []) {
      const k = r.url_norm ?? (r.url ? normalizarUrl(r.url) : null);
      if (!k || mapa.has(k)) continue;
      mapa.set(k, {
        id: r.id,
        titulo: r.titulo ?? "",
        estado: r.estado ?? "",
        url: r.url ?? null,
        edicao_numero: r.edicao?.numero ?? null,
      });
    }
  }
  return mapa;
}

/** Texto curto e legível para explicar de onde vem o duplicado. */
export function descreverGemea(g: NoticiaGemea): string {
  const estado = g.estado === "enviada"
    ? (g.edicao_numero ? `já enviada na edição #${g.edicao_numero}` : "já enviada")
    : g.estado === "aprovada"
      ? "já aprovada nesta edição"
      : g.estado === "rejeitada"
        ? "já rejeitada"
        : "já em pendentes";
  return `«${g.titulo}» — ${estado}`;
}
