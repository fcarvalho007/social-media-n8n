import process from "node:process";
// Camada pública dos Briefs (Fase 3A).
//
// Responde a três perguntas, sempre do lado do servidor:
//   1. este slug pode ser visto por um leitor anónimo?
//   2. que Briefs se relacionam com ele?
//   3. que Briefs entram no mapa do site?
//
// REGRA DE VISIBILIDADE (única):
//   brief.estado ∈ {aprovado, publicado}
//   + Destaque: leitura_aprovada não vazia
//   + a edição associada é pública (revista + enviada + snapshot bloqueado)
//
// Nada aqui devolve leitura sugerida, factos, verificação ou custos: o DTO é
// construído campo a campo.

import { createClient, type SupabaseClient } from "npm:npm:@supabase/supabase-js@2.57.4@2.57.4";

import { CATEGORIAS } from "../../design-tokens.server.ts";
import type { ImplicacaoBrief, ParagrafoBrief, TipoBrief } from "./tipos.ts";
import { avaliarPublicacao, briefIndexavel } from "../regras-publicacao.ts";

function admin(): SupabaseClient {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

export interface RelacionadoPublico {
  slug: string;
  titulo: string;
  categoria: string;
  tempo: string;
  tipo: TipoBrief;
}

export interface BriefPublico {
  slug: string;
  tipo: TipoBrief;
  indexavel: boolean;
  /** Edição de origem já enviada por email. */
  enviada: boolean;
  titulo: string;
  /** Tese editorial curta, usada como descrição quando existe. */
  tese: string;
  categoria: string;
  categoriaId: string;
  dataISO: string;
  actualizadoISO: string;
  tempo: string;
  fonte: string;
  fonteUrl: string;
  resumo: string[];
  implicacoes: Array<{ titulo: string; texto: string }>;
  leitura: string;
  edicaoNumero: number;
  relacionados: RelacionadoPublico[];
}

/* ─────────── leitura crua ─────────── */

interface LinhaEdicaoLeve {
  id: string;
  numero: number;
  data_envio_prevista: string | null;
  estado: string;
  template_version: string;
  destinos: unknown;
  snap_estado: string | null;
  tem_snap: boolean;
  /** Edição efectivamente enviada por email — só aí há indexação. */
  enviada: boolean;
}

interface LinhaBrief {
  id: string;
  slug: string;
  tipo: TipoBrief;
  estado: string;
  indexavel: boolean;
  noticia_id: string | null;
  titulo_editorial: string | null;
  tese_editorial: string | null;
  em_30_segundos: ParagrafoBrief[] | null;
  porque_interessa: ImplicacaoBrief[] | null;
  leitura_aprovada: string | null;
  fonte_url: string | null;
  fonte_publisher: string | null;
  fonte_data: string | null;
  publicado_em: string | null;
  updated_at: string;
}

const CAMPOS_BRIEF =
  "id, slug, tipo, estado, indexavel, noticia_id, titulo_editorial, tese_editorial, em_30_segundos, porque_interessa, leitura_aprovada, fonte_url, fonte_publisher, fonte_data, publicado_em, updated_at";

function destinoWeb(v: unknown): string {
  const d = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const web = (d.web && typeof d.web === "object" ? d.web : {}) as Record<string, unknown>;
  return typeof web.estado === "string" ? web.estado : "";
}

/**
 * Edições cuja página web já é servida publicamente, em consulta leve.
 * A publicação web é independente do envio: `enviada` distingue os dois.
 * Em pré-visualização interna entram todas as edições Revista com snapshot.
 */
async function edicoesPublicas(
  sb: SupabaseClient,
  preview = false,
): Promise<Map<string, LinhaEdicaoLeve>> {
  let consulta = sb
    .from("nl_edicoes")
    .select(
      "id, numero, data_envio_prevista, estado, template_version, destinos, snap_estado:revista_snapshot->>estado, tem_snap:revista_snapshot",
    )
    .eq("template_version", "revista");
  if (!preview) consulta = consulta.not("revista_snapshot", "is", null);
  const { data, error } = await consulta;
  if (error) throw new Error(error.message);

  const mapa = new Map<string, LinhaEdicaoLeve>();
  for (const l of (data ?? []) as unknown as LinhaEdicaoLeve[]) {
    // Envelopes antigos não têm `estado` e valem como bloqueados (ver `lerEnvelope`).
    const { publica, enviada } = avaliarPublicacao({
      estado: l.estado,
      snapshotEstado: l.snap_estado,
      temSnapshot: true,
      destinoWeb: destinoWeb(l.destinos),
    });
    if (!publica && !preview) continue;
    mapa.set(l.id, { ...l, enviada });
  }
  return mapa;
}

function categoriaRotulo(id: string | null): string {
  if (!id) return "Notícia";
  return CATEGORIAS.find((c) => c.id === id)?.nome ?? id;
}

function tempoLeitura(paragrafos: string[], implicacoes: Array<{ texto: string }>, leitura: string): string {
  const palavras = [...paragrafos, ...implicacoes.map((i) => i.texto), leitura]
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
  return `${Math.max(1, Math.round(palavras / 220))} min`;
}

function dominio(url: string | null): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** Um Brief só é público com conteúdo próprio e, nos Destaques, leitura aprovada. */
function visivel(b: LinhaBrief, preview = false): boolean {
  if (preview) return true;
  if (b.estado !== "aprovado" && b.estado !== "publicado") return false;
  if (!(b.em_30_segundos ?? []).length) return false;
  if (b.tipo === "destaque" && !(b.leitura_aprovada ?? "").trim()) return false;
  return true;
}

interface Candidato {
  brief: LinhaBrief;
  edicaoId: string;
  numero: number;
  dataEdicao: string | null;
  categoria: string | null;
  /** Título canónico da página: identidade editorial do próprio Brief. */
  titulo: string;
  /** Edição já enviada por email. */
  enviada: boolean;
}

/**
 * Índice de tudo o que está publicamente visível: Brief + edição pública +
 * categoria e título da notícia. Uma consulta por tabela, sem N+1.
 */
async function indicePublico(sb: SupabaseClient, preview = false): Promise<Candidato[]> {
  const publicas = await edicoesPublicas(sb, preview);
  if (!publicas.size) return [];

  const { data: assoc, error: eAssoc } = await sb
    .from("nl_brief_edicoes")
    .select("brief_id, edicao_id, ordem, titulo_apresentado")
    .in("edicao_id", [...publicas.keys()]);
  if (eAssoc) throw new Error(eAssoc.message);

  const linhas = (assoc ?? []) as Array<{
    brief_id: string;
    edicao_id: string;
    ordem: number;
    titulo_apresentado: string | null;
  }>;
  if (!linhas.length) return [];

  const { data: briefs, error: eBriefs } = await sb
    .from("nl_briefs")
    .select(CAMPOS_BRIEF)
    .in("id", [...new Set(linhas.map((l) => l.brief_id))]);
  if (eBriefs) throw new Error(eBriefs.message);

  const porId = new Map<string, LinhaBrief>();
  for (const b of (briefs ?? []) as unknown as LinhaBrief[]) if (visivel(b, preview)) porId.set(b.id, b);
  if (!porId.size) return [];

  const noticiaIds = [...new Set([...porId.values()].map((b) => b.noticia_id).filter(Boolean))] as string[];
  const noticias = new Map<string, { categoria: string | null; titulo: string }>();
  if (noticiaIds.length) {
    const { data: ns } = await sb.from("nl_noticias").select("id, categoria, titulo").in("id", noticiaIds);
    for (const n of (ns ?? []) as Array<{ id: string; categoria: string | null; titulo: string }>) {
      noticias.set(n.id, { categoria: n.categoria, titulo: n.titulo });
    }
  }

  const out: Candidato[] = [];
  for (const l of linhas) {
    const brief = porId.get(l.brief_id);
    const edicao = publicas.get(l.edicao_id);
    if (!brief || !edicao) continue;
    const n = brief.noticia_id ? noticias.get(brief.noticia_id) : undefined;
    out.push({
      brief,
      edicaoId: l.edicao_id,
      numero: edicao.numero,
      dataEdicao: edicao.data_envio_prevista,
      categoria: n?.categoria ?? null,
      // A página canónica usa o título editorial do Brief. O título
      // apresentado numa edição é contexto daquela edição, não identidade.
      titulo:
        (brief.titulo_editorial ?? "").trim() ||
        (l.titulo_apresentado || n?.titulo || "").trim() ||
        "Brief",
      enviada: edicao.enviada,
    });
  }
  return out;
}

function tempoDe(c: Candidato): string {
  return tempoLeitura(
    (c.brief.em_30_segundos ?? []).map((p) => p.texto),
    c.brief.porque_interessa ?? [],
    c.brief.leitura_aprovada ?? "",
  );
}

/**
 * Relacionados por prioridade: mesma edição + categoria → mesma categoria
 * noutras edições → mesma edição → mais recentes. Sem repetidos.
 */
export function escolherRelacionados(alvo: Candidato, todos: Candidato[], limite = 3): RelacionadoPublico[] {
  const outros = todos.filter((c) => c.brief.slug !== alvo.brief.slug);
  const recentes = [...outros].sort((a, b) => b.numero - a.numero);

  const camadas: Candidato[][] = [
    recentes.filter((c) => c.edicaoId === alvo.edicaoId && c.categoria === alvo.categoria),
    recentes.filter((c) => c.edicaoId !== alvo.edicaoId && c.categoria === alvo.categoria),
    recentes.filter((c) => c.edicaoId === alvo.edicaoId),
    recentes,
  ];

  const vistos = new Set<string>();
  const out: RelacionadoPublico[] = [];
  for (const camada of camadas) {
    for (const c of camada) {
      if (out.length >= limite) return out;
      if (vistos.has(c.brief.slug)) continue;
      vistos.add(c.brief.slug);
      out.push({
        slug: c.brief.slug,
        titulo: c.titulo,
        categoria: categoriaRotulo(c.categoria),
        tempo: tempoDe(c),
        tipo: c.brief.tipo,
      });
    }
  }
  return out;
}

/* ─────────── API pública ─────────── */

/**
 * Página pública de um Brief. `null` quando o slug não existe ou não é
 * público. `preview` só é usado por rotas autenticadas — nunca pelo leitor.
 */
export async function obterBriefPublico(
  slug: string,
  opcoes?: { preview?: boolean },
): Promise<BriefPublico | null> {
  const limpo = (slug || "").trim().toLowerCase();
  if (!limpo) return null;

  const preview = opcoes?.preview === true;
  const sb = admin();
  const todos = await indicePublico(sb, preview);
  const alvo = todos.find((c) => c.brief.slug === limpo);
  if (!alvo) return null;

  const b = alvo.brief;
  const resumo = (b.em_30_segundos ?? []).map((p) => p.texto).filter(Boolean);
  const implicacoes = (b.porque_interessa ?? [])
    .slice()
    .sort((x, y) => (x.ordem ?? 0) - (y.ordem ?? 0))
    .map((i) => ({ titulo: i.rotulo, texto: i.texto }))
    .filter((i) => i.texto);

  return {
    slug: b.slug,
    tipo: b.tipo,
    // Antes do envio da edição a página responde, mas fica fora dos motores
    // de busca: confirmar endereços não pode indexar uma edição por lançar.
    indexavel: briefIndexavel({ tipo: b.tipo, indexavel: b.indexavel, enviada: alvo.enviada, preview }),
    enviada: alvo.enviada,
    titulo: alvo.titulo,
    tese: (b.tese_editorial ?? "").trim(),
    categoria: categoriaRotulo(alvo.categoria),
    categoriaId: alvo.categoria ?? "",
    dataISO: b.fonte_data || b.publicado_em || alvo.dataEdicao || b.updated_at,
    actualizadoISO: b.updated_at,
    tempo: tempoDe(alvo),
    fonte: b.fonte_publisher || dominio(b.fonte_url) || "Fonte original",
    fonteUrl: b.fonte_url ?? "",
    resumo,
    implicacoes,
    leitura: b.tipo === "destaque" ? (b.leitura_aprovada ?? "").trim() : "",
    edicaoNumero: alvo.numero,
    relacionados: escolherRelacionados(alvo, todos),
  };
}

/** Slugs de Destaque indexáveis, para o mapa do site. */
export async function listarBriefsIndexaveis(): Promise<Array<{ slug: string; lastmod: string }>> {
  const sb = admin();
  const todos = await indicePublico(sb);
  return todos
    .filter((c) => briefIndexavel({ tipo: c.brief.tipo, indexavel: c.brief.indexavel, enviada: c.enviada }))
    .map((c) => ({ slug: c.brief.slug, lastmod: c.brief.updated_at }));
}

/** Mapa `noticiaId → Brief público` de uma edição, para as ligações do hub. */
export async function mapaBriefsDaEdicao(
  edicaoNumero: number,
  opcoes?: { preview?: boolean },
): Promise<Record<string, { slug: string; tipo: TipoBrief; estado?: string }>> {
  const sb = admin();
  const todos = await indicePublico(sb, opcoes?.preview === true);
  const out: Record<string, { slug: string; tipo: TipoBrief; estado?: string }> = {};
  for (const c of todos) {
    if (c.numero !== edicaoNumero) continue;
    if (!c.brief.noticia_id) continue;
    out[c.brief.noticia_id] = {
      slug: c.brief.slug,
      tipo: c.brief.tipo,
      ...(opcoes?.preview === true ? { estado: c.brief.estado } : {}),
    };
  }
  return out;
}
