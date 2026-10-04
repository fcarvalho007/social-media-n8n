import process from "node:process";
// Domínio do Brief — CRUD e ciclo de vida. Server-only.
//
// Fase 2A: sem IA. Este módulo prova a relação notícia → Brief → edição e é
// o único sítio onde se escreve nas tabelas `briefs`, `brief_edicoes` e
// `brief_versoes`. Nada aqui toca no email, no envio, no snapshot ou no hub.

import { createHash } from "node:crypto";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";

import { calcularFingerprint } from "./fingerprint.ts";
import { derivarSlug, slugUnico } from "./slug.ts";
import { garantirTransicao } from "./estados.ts";
import {
  LIMITES_BRIEF_PADRAO,
  type Brief,
  type BriefDaEdicao,
  type EstadoBrief,
  type ImplicacaoBrief,
  type LimitesBrief,
  type ParagrafoBrief,
  type TipoBrief,
} from "./tipos.ts";

function admin(): SupabaseClient {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

/** Cliente privilegiado partilhado pelos módulos do motor do Brief. */
export function clienteBrief(sb?: SupabaseClient): SupabaseClient {
  return sb ?? admin();
}

const COLUNAS = "*";

/* ─────────── conteúdo e impressão digital ─────────── */

export interface ConteudoBrief {
  em_30_segundos: ParagrafoBrief[];
  porque_interessa: ImplicacaoBrief[];
  leitura_aprovada: string;
  fonte_url: string | null;
  fonte_primaria_url: string | null;
}

/** Impressão do conteúdo publicável — base do «alterado depois de publicado». */
export function hashConteudo(b: ConteudoBrief): string {
  const canonico = JSON.stringify({
    em: b.em_30_segundos.map((p) => p.texto.trim()),
    pq: b.porque_interessa.map((i) => [i.ordem, i.rotulo.trim(), i.texto.trim()]),
    leitura: (b.leitura_aprovada ?? "").trim(),
    fonte: (b.fonte_url ?? "").trim(),
    primaria: (b.fonte_primaria_url ?? "").trim(),
  });
  return createHash("sha256").update(canonico).digest("hex");
}

function normalizar(linha: Record<string, unknown>): Brief {
  return {
    ...(linha as unknown as Brief),
    em_30_segundos: Array.isArray(linha.em_30_segundos) ? (linha.em_30_segundos as ParagrafoBrief[]) : [],
    porque_interessa: Array.isArray(linha.porque_interessa)
      ? (linha.porque_interessa as ImplicacaoBrief[])
      : [],
    fontes_adicionais: Array.isArray(linha.fontes_adicionais)
      ? (linha.fontes_adicionais as Brief["fontes_adicionais"])
      : [],
    titulo_editorial: typeof linha.titulo_editorial === "string" ? linha.titulo_editorial : "",
    tese_editorial: typeof linha.tese_editorial === "string" ? linha.tese_editorial : "",
    leitura_sugerida: typeof linha.leitura_sugerida === "string" ? linha.leitura_sugerida : "",
    leitura_aprovada: typeof linha.leitura_aprovada === "string" ? linha.leitura_aprovada : "",
    pull_quote_sugerida:
      typeof linha.pull_quote_sugerida === "string" ? linha.pull_quote_sugerida : "",
    factos: Array.isArray(linha.factos) ? (linha.factos as Brief["factos"]) : [],
    contexto: Array.isArray(linha.contexto) ? (linha.contexto as string[]) : [],
    incertezas: Array.isArray(linha.incertezas) ? (linha.incertezas as string[]) : [],
    verificacao:
      linha.verificacao && typeof linha.verificacao === "object"
        ? (linha.verificacao as Brief["verificacao"])
        : {},
    ia: linha.ia && typeof linha.ia === "object" ? (linha.ia as Brief["ia"]) : {},
  };
}

export function alteradoAposPublicacao(b: Brief): boolean {
  if (!b.hash_publicado) return false;
  return hashConteudo(b) !== b.hash_publicado;
}

/* ─────────── limites configuráveis ─────────── */

export async function limitesBrief(sb?: SupabaseClient): Promise<LimitesBrief> {
  const db = sb ?? admin();
  const { data } = await db
    .from("nl_configuracoes")
    .select("valor")
    .eq("chave", "brief_limites")
    .maybeSingle();
  const bruto = (data as { valor: string | null } | null)?.valor;
  if (!bruto) return LIMITES_BRIEF_PADRAO;
  try {
    const v = JSON.parse(bruto) as Partial<LimitesBrief>;
    return {
      destaque: Number.isFinite(v.destaque) ? Number(v.destaque) : LIMITES_BRIEF_PADRAO.destaque,
      radar: Number.isFinite(v.radar) ? Number(v.radar) : LIMITES_BRIEF_PADRAO.radar,
    };
  } catch {
    return LIMITES_BRIEF_PADRAO;
  }
}

/** Interruptor de recuo: com os Briefs desligados nada é apresentado ao leitor. */
export async function briefsActivos(sb?: SupabaseClient): Promise<boolean> {
  const db = sb ?? admin();
  const { data } = await db
    .from("nl_configuracoes")
    .select("valor")
    .eq("chave", "briefs_activos")
    .maybeSingle();
  return ((data as { valor: string | null } | null)?.valor ?? "false").trim() === "true";
}

/* ─────────── criação idempotente ─────────── */

export interface PedidoBrief {
  noticiaId: string;
  titulo: string;
  url?: string | null;
  tipo: TipoBrief;
  publisher?: string | null;
}

export interface ResultadoObterOuCriar {
  brief: Brief;
  criado: boolean;
}

/**
 * Segue a cadeia de repetições até à notícia canónica. Uma notícia marcada
 * como repetição de outra nunca origina um Brief próprio: a identidade é
 * sempre a da notícia original.
 */
export async function resolverNoticiaCanonica(
  noticiaId: string,
  sb?: SupabaseClient,
): Promise<{ id: string; titulo: string | null; url: string | null }> {
  const db = sb ?? admin();
  let id = noticiaId;
  let titulo: string | null = null;
  let url: string | null = null;

  for (let salto = 0; salto < 5; salto++) {
    const { data } = await db
      .from("nl_noticias")
      .select("id, titulo, url, repeticao_de")
      .eq("id", id)
      .maybeSingle();
    const linha = data as { id: string; titulo: string | null; url: string | null; repeticao_de: string | null } | null;
    if (!linha) break;
    id = linha.id;
    titulo = linha.titulo;
    url = linha.url;
    if (!linha.repeticao_de || linha.repeticao_de === linha.id) break;
    id = linha.repeticao_de;
  }

  return { id, titulo, url };
}

/**
 * Devolve o Brief da fonte pedida, criando-o só na primeira vez. Chamar duas
 * vezes com a mesma fonte devolve sempre a mesma linha e o mesmo endereço.
 * A identidade é sempre a da notícia canónica.
 */
export async function obterOuCriarBrief(
  pedido: PedidoBrief,
  sb?: SupabaseClient,
): Promise<ResultadoObterOuCriar> {
  const db = sb ?? admin();
  const canonica = await resolverNoticiaCanonica(pedido.noticiaId, db);
  const titulo = canonica.titulo?.trim() || pedido.titulo;
  const url = canonica.url ?? pedido.url ?? null;
  pedido = { ...pedido, noticiaId: canonica.id, titulo, url };
  const fingerprint = calcularFingerprint({ url, titulo });

  const existente = await db.from("nl_briefs").select(COLUNAS).eq("fingerprint", fingerprint).maybeSingle();
  if (existente.data) {
    return { brief: normalizar(existente.data as Record<string, unknown>), criado: false };
  }

  const { data: slugs } = await db.from("nl_briefs").select("slug");
  const slug = slugUnico(pedido.titulo, ((slugs ?? []) as { slug: string }[]).map((s) => s.slug));

  const indexavel = pedido.tipo === "destaque";
  const inserido = await db
    .from("nl_briefs")
    .insert({
      noticia_id: pedido.noticiaId,
      fingerprint,
      slug,
      tipo: pedido.tipo,
      estado: "por_gerar",
      indexavel,
      // Ponto de partida editável: nunca fica preso ao título da fonte.
      titulo_editorial: pedido.titulo,
      fonte_url: pedido.url ?? null,
      fonte_url_norm: fingerprint.startsWith("url:") ? fingerprint.slice(4) : null,
      fonte_publisher: pedido.publisher ?? null,
    })
    .select(COLUNAS)
    .single();

  if (inserido.error) {
    // Corrida: outra chamada criou o mesmo Brief entretanto.
    const recuperado = await db.from("nl_briefs").select(COLUNAS).eq("fingerprint", fingerprint).maybeSingle();
    if (recuperado.data) {
      return { brief: normalizar(recuperado.data as Record<string, unknown>), criado: false };
    }
    throw inserido.error;
  }

  return { brief: normalizar(inserido.data as Record<string, unknown>), criado: true };
}

/* ─────────── associação à edição ─────────── */

export async function associarBriefAEdicao(
  args: { briefId: string; edicaoId: string; papel: TipoBrief; ordem?: number; tituloApresentado?: string | null },
  sb?: SupabaseClient,
): Promise<void> {
  const db = sb ?? admin();

  const jaLa = await db
    .from("nl_brief_edicoes")
    .select("id")
    .eq("brief_id", args.briefId)
    .eq("edicao_id", args.edicaoId)
    .maybeSingle();

  const limites = await limitesBrief(db);
  if (!jaLa.data) {
    const { count } = await db
      .from("nl_brief_edicoes")
      .select("id", { count: "exact", head: true })
      .eq("edicao_id", args.edicaoId)
      .eq("papel", args.papel);
    const maximo = args.papel === "destaque" ? limites.destaque : limites.radar;
    if ((count ?? 0) >= maximo) {
      throw new Error(
        args.papel === "destaque"
          ? `Esta edição já tem ${maximo} Destaques com Brief.`
          : `Esta edição já tem ${maximo} itens de Radar com Quick Brief.`,
      );
    }
  }

  const registo = {
    brief_id: args.briefId,
    edicao_id: args.edicaoId,
    papel: args.papel,
    ordem: args.ordem ?? 0,
    titulo_apresentado: args.tituloApresentado ?? null,
  };

  const { error } = jaLa.data
    ? await db.from("nl_brief_edicoes").update(registo).eq("id", (jaLa.data as { id: string }).id)
    : await db.from("nl_brief_edicoes").insert(registo);
  if (error) throw error;

  // O tipo do Brief acompanha o papel na edição mais recente.
  await db.from("nl_briefs").update({ tipo: args.papel, indexavel: args.papel === "destaque" }).eq("id", args.briefId);
}

export async function desassociarBriefDaEdicao(
  args: { briefId: string; edicaoId: string },
  sb?: SupabaseClient,
): Promise<void> {
  const db = sb ?? admin();
  const { error } = await db
    .from("nl_brief_edicoes")
    .delete()
    .eq("brief_id", args.briefId)
    .eq("edicao_id", args.edicaoId);
  if (error) throw error;
}

/**
 * Põe o Brief da notícia de acordo com o papel escolhido no editor:
 * cria ou reutiliza e associa quando há papel, desassocia quando a notícia
 * sai do email. Idempotente: repetir a chamada não muda nada.
 */
export async function sincronizarPapelBrief(
  args: { edicaoId: string; noticiaId: string; papel: TipoBrief | null },
  sb?: SupabaseClient,
): Promise<{ briefId: string | null; criado: boolean }> {
  const db = sb ?? admin();
  const canonica = await resolverNoticiaCanonica(args.noticiaId, db);
  const titulo = canonica.titulo?.trim() || "";

  if (!args.papel) {
    const fingerprint = calcularFingerprint({ url: canonica.url, titulo });
    const { data } = await db
      .from("nl_briefs")
      .select("id")
      .eq("fingerprint", fingerprint)
      .maybeSingle();
    const id = (data as { id: string } | null)?.id ?? null;
    if (id) await desassociarBriefDaEdicao({ briefId: id, edicaoId: args.edicaoId }, db);
    return { briefId: id, criado: false };
  }

  const { brief, criado } = await obterOuCriarBrief(
    { noticiaId: canonica.id, titulo, url: canonica.url, tipo: args.papel },
    db,
  );
  await associarBriefAEdicao(
    { briefId: brief.id, edicaoId: args.edicaoId, papel: args.papel, tituloApresentado: titulo || null },
    db,
  );
  return { briefId: brief.id, criado };
}

/* ─────────── leitura ─────────── */

export async function listarBriefsDaEdicao(
  edicaoId: string,
  sb?: SupabaseClient,
): Promise<BriefDaEdicao[]> {
  const db = sb ?? admin();
  const { data, error } = await db
    .from("nl_brief_edicoes")
    .select("papel, ordem, titulo_apresentado, brief:briefs(*)")
    .eq("edicao_id", edicaoId)
    .order("ordem", { ascending: true });
  if (error) throw error;

  return ((data ?? []) as unknown as Array<{
    papel: TipoBrief;
    ordem: number;
    titulo_apresentado: string | null;
    brief: Record<string, unknown> | null;
  }>)
    .filter((l) => l.brief)
    .map((l) => {
      const b = normalizar(l.brief as Record<string, unknown>);
      return {
        ...b,
        papel: l.papel,
        ordem_edicao: l.ordem,
        titulo_apresentado: l.titulo_apresentado,
        alterado_apos_publicacao: alteradoAposPublicacao(b),
      };
    });
}

export async function obterBriefPorSlug(slug: string, sb?: SupabaseClient): Promise<Brief | null> {
  const db = sb ?? admin();
  const { data } = await db.from("nl_briefs").select(COLUNAS).eq("slug", slug).maybeSingle();
  return data ? normalizar(data as Record<string, unknown>) : null;
}

async function obterBrief(id: string, db: SupabaseClient): Promise<Brief> {
  const { data, error } = await db.from("nl_briefs").select(COLUNAS).eq("id", id).single();
  if (error) throw error;
  return normalizar(data as Record<string, unknown>);
}

/* ─────────── escrita de conteúdo e ciclo de vida ─────────── */

export interface AlteracaoConteudo {
  em_30_segundos?: ParagrafoBrief[];
  porque_interessa?: ImplicacaoBrief[];
  leitura_sugerida?: string;
  leitura_aprovada?: string;
  fonte_url?: string | null;
  fonte_publisher?: string | null;
  fonte_data?: string | null;
  fonte_primaria_url?: string | null;
}

/**
 * Grava conteúdo editorial. Mexer no texto aprovado revoga sempre a
 * aprovação: nada volta a ser apresentado como opinião do autor sem uma nova
 * decisão humana.
 */
export async function actualizarConteudo(
  id: string,
  alteracao: AlteracaoConteudo,
  sb?: SupabaseClient,
): Promise<Brief> {
  const db = sb ?? admin();
  const actual = await obterBrief(id, db);

  const mexeuNaLeitura =
    alteracao.leitura_aprovada !== undefined &&
    alteracao.leitura_aprovada.trim() !== actual.leitura_aprovada.trim();

  const registo: Record<string, unknown> = { ...alteracao };

  if (mexeuNaLeitura && actual.aprovada_em) {
    registo.aprovada_em = null;
    registo.aprovada_por = null;
    registo.estado = "por_rever";
  } else if (actual.estado === "por_gerar") {
    registo.estado = "gerado";
  }

  const { data, error } = await db.from("nl_briefs").update(registo).eq("id", id).select(COLUNAS).single();
  if (error) throw error;
  return normalizar(data as Record<string, unknown>);
}

export async function aprovarLeitura(
  args: { id: string; texto: string; quem: string },
  sb?: SupabaseClient,
): Promise<Brief> {
  const db = sb ?? admin();
  const actual = await obterBrief(args.id, db);
  const texto = args.texto.trim();
  if (!texto) throw new Error("Não é possível aprovar uma leitura vazia.");

  garantirTransicao(actual.estado, "aprovado");

  const { data, error } = await db
    .from("nl_briefs")
    .update({
      leitura_aprovada: texto,
      aprovada_em: new Date().toISOString(),
      aprovada_por: args.quem,
      estado: "aprovado",
    })
    .eq("id", args.id)
    .select(COLUNAS)
    .single();
  if (error) throw error;
  return normalizar(data as Record<string, unknown>);
}

export async function revogarAprovacao(id: string, sb?: SupabaseClient): Promise<Brief> {
  const db = sb ?? admin();
  const { data, error } = await db
    .from("nl_briefs")
    .update({ aprovada_em: null, aprovada_por: null, estado: "por_rever" })
    .eq("id", id)
    .select(COLUNAS)
    .single();
  if (error) throw error;
  return normalizar(data as Record<string, unknown>);
}

export async function transitarEstado(
  args: { id: string; para: EstadoBrief; erro?: string | null },
  sb?: SupabaseClient,
): Promise<Brief> {
  const db = sb ?? admin();
  const actual = await obterBrief(args.id, db);
  garantirTransicao(actual.estado, args.para);

  const registo: Record<string, unknown> = { estado: args.para, erro: args.erro ?? null };
  if (args.para === "publicado") {
    registo.publicado_em = actual.publicado_em ?? new Date().toISOString();
    registo.slug_congelado = true;
    registo.hash_publicado = hashConteudo(actual);
  }

  const { data, error } = await db.from("nl_briefs").update(registo).eq("id", args.id).select(COLUNAS).single();
  if (error) throw error;
  return normalizar(data as Record<string, unknown>);
}

/* ─────────── histórico ─────────── */

export async function registarVersao(
  args: { id: string; motivo: string; quem: string },
  sb?: SupabaseClient,
): Promise<number> {
  const db = sb ?? admin();
  const b = await obterBrief(args.id, db);

  const { data: ultima } = await db
    .from("nl_brief_versoes")
    .select("versao")
    .eq("brief_id", args.id)
    .order("versao", { ascending: false })
    .limit(1)
    .maybeSingle();

  const versao = ((ultima as { versao: number } | null)?.versao ?? 0) + 1;

  const { error } = await db.from("nl_brief_versoes").insert({
    brief_id: args.id,
    versao,
    conteudo: {
      em_30_segundos: b.em_30_segundos,
      porque_interessa: b.porque_interessa,
      leitura_aprovada: b.leitura_aprovada,
      fonte_url: b.fonte_url,
      fonte_primaria_url: b.fonte_primaria_url,
      slug: b.slug,
      tipo: b.tipo,
    },
    hash: hashConteudo(b),
    motivo: args.motivo,
    criado_por: args.quem,
  });
  if (error) throw error;
  return versao;
}

/** Endereço derivado do título, para pré-visualizar antes de criar. */
export function prevermSlug(titulo: string): string {
  return derivarSlug(titulo);
}

/**
 * Autosave da leitura em revisão. O texto trabalhado vive em
 * `leitura_sugerida`: só a aprovação o copia para `leitura_aprovada`. Mexer
 * numa leitura já aprovada revoga sempre a aprovação.
 */
export async function guardarLeituraSugerida(
  args: { id: string; texto: string },
  sb?: SupabaseClient,
): Promise<{ estado: EstadoBrief; aprovada: boolean; revogou: boolean }> {
  const db = sb ?? admin();
  const actual = await obterBrief(args.id, db);
  const texto = args.texto;
  const revogou = Boolean(actual.aprovada_em) && texto.trim() !== actual.leitura_aprovada.trim();

  const registo: Record<string, unknown> = { leitura_sugerida: texto };
  if (revogou) {
    registo.aprovada_em = null;
    registo.aprovada_por = null;
    registo.estado = "por_rever";
  }

  const { data, error } = await db.from("nl_briefs").update(registo).eq("id", args.id).select(COLUNAS).single();
  if (error) throw error;
  const b = normalizar(data as Record<string, unknown>);
  return { estado: b.estado, aprovada: Boolean(b.aprovada_em), revogou };
}


/**
 * Identidade editorial pública do Brief. O título é estável depois da
 * primeira publicação, mas continua deliberadamente editável — o endereço é
 * que nunca muda.
 */
export async function guardarIdentidadeEditorial(
  args: { id: string; tituloEditorial?: string; teseEditorial?: string },
  sb?: SupabaseClient,
): Promise<Brief> {
  const db = sb ?? admin();
  const registo: Record<string, unknown> = {};
  if (args.tituloEditorial !== undefined) registo.titulo_editorial = args.tituloEditorial.trim();
  if (args.teseEditorial !== undefined) registo.tese_editorial = args.teseEditorial.trim();
  if (!Object.keys(registo).length) return obterBrief(args.id, db);

  const { data, error } = await db.from("nl_briefs").update(registo).eq("id", args.id).select(COLUNAS).single();
  if (error) throw error;
  return normalizar(data as Record<string, unknown>);
}
