// Publicação dos Briefs no circuito de envio (Fase 3B).
//
// Três responsabilidades, sempre do lado do servidor e sempre nesta ordem:
//   1. validar    — que peças podem mesmo ir para o email;
//   2. publicar   — congelar slug, versão e hash de quem está aprovado;
//   3. confirmar  — bater à porta de cada endereço público antes de o usar.
//
// Nada aqui corre com o interruptor `briefs_activos` desligado.

import type { SupabaseClient } from "npm:npm:@supabase/supabase-js@2.57.4@2.57.4";

import { baseUrlEdicoes } from "../destinos.server.ts";
import { prontoParaPublicar } from "./estados.ts";
import { avaliarAtencao } from "./atencao.ts";
import {
  briefsActivos,
  clienteBrief,
  listarBriefsDaEdicao,
  registarVersao,
  transitarEstado,
} from "./modelo.server.ts";
import type { BriefDaEdicao, TipoBrief } from "./tipos.ts";

/** Bloco congelado no snapshot, por peça. */
export interface LigacaoBrief {
  briefId: string;
  versao: number;
  tipo: TipoBrief;
  /** Papel na edição. Hoje igual ao tipo; fica explícito para o histórico. */
  papel: TipoBrief;
  ordem: number;
  slug: string;
  url: string;
  /** Identidade editorial do Brief — o que a página pública mostra. */
  tituloEditorial: string;
  /** Título usado nesta edição, que pode ser diferente do editorial. */
  tituloApresentado: string;
  fonteUrl: string;
}

export function caminhoBrief(slug: string): string {
  return `/brief/${slug}`;
}

/* ─────────── validação ─────────── */

export interface ProblemaBrief {
  noticiaId: string | null;
  titulo: string;
  motivo: string;
}

export interface ValidacaoBriefs {
  /** Peças com Brief pronto a publicar, por notícia. */
  prontos: BriefDaEdicao[];
  /** Destaques sem leitura aprovada. */
  leiturasPorAprovar: ProblemaBrief[];
  /** Fonte em falta, inválida ou indisponível. */
  fontes: ProblemaBrief[];
  /** Factualidade ou proximidade bloqueadas, geração falhada. */
  verificacoes: ProblemaBrief[];
  /** Conteúdo em falta (Brief por gerar, sem texto). */
  incompletos: ProblemaBrief[];
  totalDestaques: number;
  totalRadar: number;
  /** Peças associadas à edição (Destaques + Radar). */
  total: number;
  /** Peças sem afirmação por sustentar, proximidade bloqueada ou geração falhada. */
  factualidadeOk: number;
  /** Peças com fonte original válida. */
  fontesOk: number;
}

function rotulo(b: BriefDaEdicao): string {
  return (b.titulo_apresentado ?? "").trim() || b.slug;
}

export async function validarBriefsDaEdicao(
  edicaoId: string,
  sb?: SupabaseClient,
): Promise<ValidacaoBriefs> {
  const db = sb ?? clienteBrief();
  const lista = await listarBriefsDaEdicao(edicaoId, db);

  const out: ValidacaoBriefs = {
    prontos: [],
    leiturasPorAprovar: [],
    fontes: [],
    verificacoes: [],
    incompletos: [],
    totalDestaques: lista.filter((b) => b.papel === "destaque").length,
    totalRadar: lista.filter((b) => b.papel === "radar").length,
    total: lista.length,
    factualidadeOk: 0,
    fontesOk: 0,
  };

  for (const b of lista) {
    const ref = { noticiaId: b.noticia_id, titulo: rotulo(b) };
    const atencao = avaliarAtencao(b);
    const pronto = prontoParaPublicar(b);

    let travado = false;
    let fonteOk = true;
    let factualidadeOk = true;

    if (atencao.motivos.includes("fonte_invalida") || !(b.fonte_url ?? "").trim()) {
      fonteOk = false;
      out.fontes.push({ ...ref, motivo: "A fonte original está em falta ou indisponível." });
      travado = true;
    }
    if (atencao.motivos.includes("factualidade")) {
      out.verificacoes.push({ ...ref, motivo: "Há afirmações sem suporte na fonte." });
      factualidadeOk = false;
      travado = true;
    }
    if (atencao.motivos.includes("proximidade")) {
      out.verificacoes.push({ ...ref, motivo: "O texto está demasiado perto do original." });
      factualidadeOk = false;
      travado = true;
    }
    if (atencao.motivos.includes("geracao_falhou")) {
      out.verificacoes.push({ ...ref, motivo: "A geração do Brief falhou." });
      factualidadeOk = false;
      travado = true;
    }
    if (b.tipo === "destaque" && !b.leitura_aprovada.trim()) {
      out.leiturasPorAprovar.push({ ...ref, motivo: "A leitura do Destaque ainda não foi aprovada." });
      travado = true;
    }
    if (!pronto.ok) {
      const restantes = pronto.motivos.filter(
        (m) => !m.includes("leitura") && !m.includes("fonte") && !m.includes("erro"),
      );
      if (restantes.length) {
        out.incompletos.push({ ...ref, motivo: restantes[0] });
        travado = true;
      }
    }

    if (fonteOk) out.fontesOk += 1;
    if (factualidadeOk) out.factualidadeOk += 1;
    if (!travado) out.prontos.push(b);
  }

  return out;
}

/* ─────────── publicação ─────────── */

export interface ResultadoPublicacaoBriefs {
  publicados: number;
  reutilizados: number;
  ligacoes: Record<string, LigacaoBrief>;
  /** Peças cuja versão não pôde ser congelada — bloqueio real do envio. */
  naoCongelaveis: ProblemaBrief[];
}

/**
 * Publica os Briefs prontos desta edição e devolve as ligações por notícia.
 * Idempotente: um Brief já publicado e sem alterações não é tocado.
 */
export async function publicarBriefsDaEdicao(
  edicaoId: string,
  sb?: SupabaseClient,
): Promise<ResultadoPublicacaoBriefs> {
  const db = sb ?? clienteBrief();
  if (!(await briefsActivos(db))) {
    return { publicados: 0, reutilizados: 0, ligacoes: {}, naoCongelaveis: [] };
  }

  const validacao = await validarBriefsDaEdicao(edicaoId, db);
  const base = await baseUrlEdicoes(db);

  const ligacoes: Record<string, LigacaoBrief> = {};
  const naoCongelaveis: ProblemaBrief[] = [];
  let publicados = 0;
  let reutilizados = 0;

  for (const b of validacao.prontos) {
    if (!b.noticia_id) continue;

    const jaPublicado = b.estado === "publicado" && !b.alterado_apos_publicacao;
    let versao: number;

    try {
      if (jaPublicado) {
        versao = await versaoActual(db, b.id);
        reutilizados += 1;
      } else {
        versao = await registarVersao({ id: b.id, motivo: "publicação", quem: "envio" }, db);
        if (b.estado !== "publicado") await transitarEstado({ id: b.id, para: "publicado" }, db);
        publicados += 1;
      }
    } catch (e) {
      naoCongelaveis.push({
        noticiaId: b.noticia_id,
        titulo: rotulo(b),
        motivo: `Não foi possível fixar a versão deste Brief: ${(e as Error).message}`,
      });
      continue;
    }

    ligacoes[b.noticia_id] = ligacao(b, versao, base);
  }

  return { publicados, reutilizados, ligacoes, naoCongelaveis };
}

/** Bloco congelado por peça: tudo o que o histórico precisa de saber. */
function ligacao(b: BriefDaEdicao, versao: number, base: string): LigacaoBrief {
  return {
    briefId: b.id,
    versao,
    tipo: b.papel,
    papel: b.papel,
    ordem: b.ordem_edicao,
    slug: b.slug,
    url: `${base}${caminhoBrief(b.slug)}`,
    tituloEditorial: (b.titulo_editorial || "").trim() || rotulo(b),
    tituloApresentado: rotulo(b),
    fonteUrl: (b.fonte_url ?? "").trim(),
  };
}

async function versaoActual(db: SupabaseClient, briefId: string): Promise<number> {
  const { data } = await db
    .from("nl_brief_versoes")
    .select("versao")
    .eq("brief_id", briefId)
    .order("versao", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as { versao: number } | null)?.versao ?? 1;
}

/**
 * Ligações já publicadas desta edição, sem publicar nada.
 * Usada na composição e na pré-visualização.
 */
export async function ligacoesBriefsDaEdicao(
  edicaoId: string,
  sb?: SupabaseClient,
): Promise<Record<string, LigacaoBrief>> {
  const db = sb ?? clienteBrief();
  if (!(await briefsActivos(db))) return {};

  const lista = await listarBriefsDaEdicao(edicaoId, db);
  const base = await baseUrlEdicoes(db);
  const out: Record<string, LigacaoBrief> = {};

  for (const b of lista) {
    if (!b.noticia_id) continue;
    if (b.estado !== "publicado") continue;
    if (b.tipo === "destaque" && !b.leitura_aprovada.trim()) continue;
    out[b.noticia_id] = ligacao(b, await versaoActual(db, b.id), base);
  }
  return out;
}

/* ─────────── confirmação dos endereços públicos ─────────── */

export interface ConfirmacaoUrls {
  ok: boolean;
  falhados: Array<{ slug: string; url: string; status: number }>;
}

/**
 * Bate à porta de cada página antes de o endereço entrar no email.
 * Uma página de Brief interna que não responde é bloqueio real.
 */
export async function confirmarUrlsPublicas(
  ligacoes: Record<string, LigacaoBrief>,
): Promise<ConfirmacaoUrls> {
  const alvos = Object.values(ligacoes);
  const falhados: ConfirmacaoUrls["falhados"] = [];

  for (const l of alvos) {
    let status = 0;
    try {
      const r = await fetch(l.url, { method: "GET", redirect: "follow" });
      status = r.status;
    } catch {
      status = 0;
    }
    if (status < 200 || status >= 400) falhados.push({ slug: l.slug, url: l.url, status });
  }

  return { ok: falhados.length === 0, falhados };
}
