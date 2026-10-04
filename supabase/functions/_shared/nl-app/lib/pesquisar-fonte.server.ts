// Preparação da consulta de pesquisa da fonte original. Server-only.
//
// Problema que resolve: as notícias entram já traduzidas para pt-PT, mas o
// artigo original está quase sempre em inglês. Pesquisar o título traduzido
// não devolve nada de útil. Aqui reconstruímos o provável título original e
// montamos uma cascata de queries, começando pelo site do editor.

import { editorDeUrl, type Editor } from "./link-rastreio.ts";

export type ConsultaPreparada = {
  tituloEn: string;
  keywords: string[];
  editor: Editor | null;
  queries: string[];
  queryGoogle: string;
};

const PROMPT = `Recebes o título e a descrição de uma notícia traduzidos para português europeu. Devolve APENAS JSON válido:
{"titulo_en":"", "keywords":[]}

- titulo_en: o provável título ORIGINAL em inglês do artigo (como estaria no site do editor). Sem aspas, sem emojis, máx. 110 caracteres. Se a notícia for originalmente portuguesa, repete o título em português.
- keywords: 3 a 6 termos curtos em inglês — marcas, produtos, nomes próprios, números relevantes. Sem stopwords.`;

function limpar(s: string): string {
  return s.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}]/gu, "").replace(/\s+/g, " ").trim();
}

/** Palavras irrelevantes para a comparação de títulos (PT + EN). */
const STOP = new Set([
  "a", "o", "os", "as", "um", "uma", "de", "do", "da", "dos", "das", "e", "em", "no", "na",
  "para", "por", "com", "que", "se", "ao", "aos", "à", "às", "mais", "menos", "sobre",
  "the", "of", "in", "on", "for", "to", "and", "is", "are", "with", "its", "it", "as", "at", "by",
]);

function tokens(s: string): Set<string> {
  return new Set(
    s.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w)),
  );
}

function trigramas(s: string): Set<string> {
  const t = s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  const out = new Set<string>();
  for (let i = 0; i < t.length - 2; i++) out.add(t.slice(i, i + 3));
  return out;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const v of a) if (b.has(v)) inter++;
  return inter / (a.size + b.size - inter);
}

/**
 * Semelhança 0-1 entre dois títulos, combinando sobreposição de palavras
 * e de trigramas. Funciona razoavelmente entre línguas por causa das
 * entidades próprias (marcas, números) que se mantêm iguais.
 */
export function semelhancaTitulo(a: string, b: string): number {
  const jt = jaccard(tokens(a), tokens(b));
  const jg = jaccard(trigramas(a), trigramas(b));
  return Math.max(jt, jt * 0.6 + jg * 0.4);
}

/** Melhor semelhança contra vários textos de referência (pt + en). */
export function melhorSemelhanca(candidato: string, referencias: string[]): number {
  return referencias.reduce((m, r) => Math.max(m, semelhancaTitulo(candidato, r)), 0);
}

function frase(titulo: string, palavras = 7): string {
  return titulo.split(/\s+/).slice(0, palavras).join(" ");
}

/**
 * Constrói a cascata de queries. A IA é opcional: se falhar, usamos o título
 * em pt-PT como estava antes (comportamento actual, degradado mas funcional).
 */
export async function prepararConsulta(
  titulo: string,
  descricao: string | null,
  urlActual: string | null,
): Promise<ConsultaPreparada> {
  const tituloPt = limpar(titulo);
  const editor = editorDeUrl(urlActual);

  let tituloEn = tituloPt;
  let keywords: string[] = [];

  try {
    const { chamarDeepSeek, parseJsonTolerante, MODELO_DEEPSEEK_PADRAO } = await import("./deepseek.server.ts");
    const { custoUsd } = await import("../edge-shared/custos-ia.ts");
    const r = await chamarDeepSeek(
      PROMPT,
      `Título: ${tituloPt}\nDescrição: ${limpar(descricao ?? "") || "(sem descrição)"}${editor ? `\nEditor: ${editor.nome}` : ""}`,
      { modelo: MODELO_DEEPSEEK_PADRAO, responseJson: true },
    );
    const parsed = parseJsonTolerante<{ titulo_en?: string; keywords?: string[] }>(r.conteudo);
    if (parsed?.titulo_en && parsed.titulo_en.trim().length >= 8) tituloEn = limpar(parsed.titulo_en);
    if (Array.isArray(parsed?.keywords)) {
      keywords = parsed.keywords.filter((k): k is string => typeof k === "string").map(limpar).filter(Boolean).slice(0, 6);
    }
    try {
      const { supabaseAdmin } = await import("../_shim/admin.ts");
      await supabaseAdmin.from("nl_ia_uso").insert({
        modelo: r.modelo,
        tokens_entrada_cache_hit: r.usage.cacheHit,
        tokens_entrada_cache_miss: r.usage.cacheMiss,
        tokens_saida: r.usage.saida,
        custo_usd: custoUsd(r.modelo, r.usage.cacheHit, r.usage.cacheMiss, r.usage.saida),
        origem: "preparar_consulta_fonte",
        edicao_id: null,
      });
    } catch { /* registo de custo é best-effort */ }
  } catch (e) {
    console.error("[pesquisar-fonte] preparação IA falhou:", (e as Error).message);
  }

  const kw = keywords.join(" ");
  const queries: string[] = [];
  if (editor) {
    queries.push(`site:${editor.dominio} "${frase(tituloEn, 8)}"`);
    queries.push(`site:${editor.dominio} ${tituloEn}`);
    queries.push(`"${frase(tituloEn, 8)}" ${editor.nome}`);
  }
  queries.push(`"${frase(tituloEn, 8)}"`);
  queries.push(`${tituloEn} ${kw}`.trim());
  if (tituloPt !== tituloEn) queries.push(`${tituloPt} ${kw}`.trim());

  const queryGoogle = editor ? `${tituloEn} ${editor.nome}` : `${tituloEn} ${kw}`.trim();

  return { tituloEn, keywords, editor, queries: [...new Set(queries.filter(Boolean))], queryGoogle };
}
