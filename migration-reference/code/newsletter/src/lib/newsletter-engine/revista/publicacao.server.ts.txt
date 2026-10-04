// Camada web pública do Sistema Revista.
//
// Não decide nada de editorial: a estrutura vem sempre de
// `composeRevistaEdition()` / do snapshot bloqueado. Aqui só se responde a
// quatro perguntas: que edições são públicas, qual corresponde a um número,
// quais são as vizinhas e que Briefs estão ligados a cada peça.
//
// REGRA DE PUBLICAÇÃO (única, avaliada no servidor):
//   template_version = 'revista'
//   + existe `revista_snapshot` (preparado ou bloqueado)
//   + destinos.web.estado = 'publica'
//       (compatibilidade: edições antigas com estado 'enviada' e snapshot
//        bloqueado continuam públicas mesmo sem o destino escrito)
//
// A publicação web é independente do envio de email: uma edição pode estar
// pública alguns instantes antes de sair o email. Só depois de efectivamente
// enviada (estado 'enviada' + snapshot bloqueado) é que fica indexável.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { CATEGORIAS } from "../design-tokens.server";
import { lerEnvelope, type EdicaoRevista, type AtualidadeRevista } from "./compose.server";
import type { TipoBrief } from "./brief/tipos";
import { avaliarPublicacao } from "./regras-publicacao";

function admin(): SupabaseClient {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

export interface ResumoEdicaoPublica {
  numero: number;
  data: string | null;
  titulo: string;
  lede: string;
  /** Edição efectivamente enviada — só aí é indexável. */
  enviada: boolean;
}

export interface GrupoAtualidades {
  categoria: string;
  rotulo: string;
  itens: AtualidadeRevista[];
}

export interface VizinhaPublica {
  numero: number;
  titulo: string;
}

/** Ligação de uma peça ao seu Brief público, por notícia. */
export interface LigacaoBriefPublica {
  slug: string;
  tipo: TipoBrief;
  /** Só é incluído na pré-visualização interna. */
  estado?: string;
}

export interface PaginaEdicaoPublica {
  estrutura: EdicaoRevista;
  grupos: GrupoAtualidades[];
  anterior: VizinhaPublica | null;
  seguinte: VizinhaPublica | null;
  /** `false` enquanto a edição ainda não saiu por email: página `noindex`. */
  enviada: boolean;
  /** Briefs desta edição: congelados no snapshot quando já foi enviada. */
  briefs: Record<string, LigacaoBriefPublica>;
}

interface LinhaEdicao {
  numero: number;
  data_envio_prevista: string | null;
  revista_snapshot: unknown;
  estado: string;
  destinos: unknown;
}

const SELECT = "numero, data_envio_prevista, revista_snapshot, estado, destinos";

interface EdicaoPublicaInterna {
  numero: number;
  estrutura: EdicaoRevista;
  data: string | null;
  enviada: boolean;
}

function destinoWeb(v: unknown): string {
  const d = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const web = (d.web && typeof d.web === "object" ? d.web : {}) as Record<string, unknown>;
  return typeof web.estado === "string" ? web.estado : "";
}

/** Todas as edições Revista públicas, da mais recente para a mais antiga. */
async function carregarPublicadas(): Promise<EdicaoPublicaInterna[]> {
  const sb = admin();
  const { data, error } = await sb
    .from("edicoes")
    .select(SELECT)
    .eq("template_version", "revista")
    .not("revista_snapshot", "is", null)
    .order("numero", { ascending: false });
  if (error) throw new Error(error.message);

  const out: EdicaoPublicaInterna[] = [];
  for (const linha of (data ?? []) as LinhaEdicao[]) {
    const env = lerEnvelope(linha.revista_snapshot);
    if (!env) continue;
    const { publica, enviada } = avaliarPublicacao({
      estado: linha.estado,
      snapshotEstado: env.estado,
      temSnapshot: true,
      destinoWeb: destinoWeb(linha.destinos),
    });
    if (!publica) continue;
    out.push({ numero: linha.numero, estrutura: env.edicao, data: linha.data_envio_prevista, enviada });
  }
  return out;
}

function resumo(e: EdicaoRevista, numero: number, data: string | null, enviada: boolean): ResumoEdicaoPublica {
  return {
    numero,
    data: e.edicao.data_envio_prevista ?? data,
    titulo: e.cronica.titulo || `Edição ${numero}`,
    lede: e.cronica.lede || e.preheader || "",
    enviada,
  };
}

/** Arquivo público: só edições Revista já enviadas, mais recente primeiro. */
export async function listarEdicoesPublicas(): Promise<ResumoEdicaoPublica[]> {
  const lista = await carregarPublicadas();
  return lista.filter((l) => l.enviada).map((l) => resumo(l.estrutura, l.numero, l.data, l.enviada));
}

/** Agrupa as atualidades pela ordem da taxonomia existente. */
export function agruparAtualidades(itens: AtualidadeRevista[]): GrupoAtualidades[] {
  const ordem = new Map(CATEGORIAS.map((c, i) => [c.id, i]));
  const mapa = new Map<string, GrupoAtualidades>();
  for (const n of itens) {
    const g = mapa.get(n.categoria) ?? { categoria: n.categoria, rotulo: n.categoriaRotulo || n.categoria, itens: [] };
    g.itens.push(n);
    mapa.set(n.categoria, g);
  }
  return [...mapa.values()].sort(
    (a, b) => (ordem.get(a.categoria) ?? 999) - (ordem.get(b.categoria) ?? 999),
  );
}

/**
 * Ligações congeladas no snapshot. É esta a fonte histórica de uma edição já
 * enviada: uma associação criada depois do envio não altera a edição antiga.
 * Snapshots anteriores a esta fase não trazem o bloco e devolvem `{}`.
 */
export function briefsDoSnapshot(e: EdicaoRevista): Record<string, LigacaoBriefPublica> {
  const out: Record<string, LigacaoBriefPublica> = {};
  for (const d of e.destaques ?? []) {
    if (d.brief?.slug) out[d.noticiaId] = { slug: d.brief.slug, tipo: "destaque" };
  }
  for (const r of e.radar ?? []) {
    if (r.brief?.slug) out[r.noticiaId] = { slug: r.brief.slug, tipo: "radar" };
  }
  return out;
}

/**
 * Página pública de uma edição. Devolve `null` quando o número não existe ou
 * a edição não é pública — a rota traduz isso num 404.
 */
export async function obterPaginaEdicaoPublica(numero: number): Promise<PaginaEdicaoPublica | null> {
  const lista = await carregarPublicadas();
  const i = lista.findIndex((l) => l.numero === numero);
  if (i === -1) return null;

  const alvo = lista[i];
  const enviadas = lista.filter((l) => l.enviada);
  const j = enviadas.findIndex((l) => l.numero === numero);
  // A lista vem por número descendente: o índice seguinte é a edição anterior.
  const maisAntiga = j === -1 ? undefined : enviadas[j + 1];
  const maisRecente = j === -1 ? undefined : enviadas[j - 1];

  // Edição enviada → composição histórica congelada. Ainda não enviada →
  // estado editorial corrente, que é o que faz sentido pré-visualizar.
  let briefs = briefsDoSnapshot(alvo.estrutura);
  if (!alvo.enviada) {
    const { mapaBriefsDaEdicao } = await import("./brief/publico.server");
    briefs = await mapaBriefsDaEdicao(numero);
  }

  return {
    estrutura: alvo.estrutura,
    grupos: agruparAtualidades(alvo.estrutura.atualidades ?? []),
    enviada: alvo.enviada,
    briefs,
    anterior: maisAntiga
      ? { numero: maisAntiga.numero, titulo: maisAntiga.estrutura.cronica.titulo || `Edição ${maisAntiga.numero}` }
      : null,
    seguinte: maisRecente
      ? { numero: maisRecente.numero, titulo: maisRecente.estrutura.cronica.titulo || `Edição ${maisRecente.numero}` }
      : null,
  };
}
