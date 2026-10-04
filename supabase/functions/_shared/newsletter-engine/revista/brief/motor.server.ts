// Motor editorial do Brief. Server-only.
//
// Orquestra as etapas: fonte → fonte primária → factos → redacção →
// verificação factual → proximidade textual → estado editorial.
// Nada aqui publica seja o que for.

import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";

import { extrairFactos } from "./extraccao.server.ts";
import { identificarFontePrimaria } from "./fonte-primaria.server.ts";
import { recolherFonte, type MaterialFonte } from "./fontes.server.ts";
import { clienteBrief } from "./modelo.server.ts";
import { avaliarProximidade } from "./proximidade.ts";
import {
  gerarEmTrintaSegundos,
  gerarLeituraSugerida,
  gerarPorqueInteressa,
  type Intencao,
} from "./redaccao.server.ts";
import { verificarFactualidade } from "./verificacao.server.ts";
import type {
  Brief,
  FactoBrief,
  ImplicacaoBrief,
  ParagrafoBrief,
  VerificacaoBrief,
} from "./tipos.ts";

export type ComponenteBrief = "tudo" | "em_30_segundos" | "porque_interessa" | "leitura_sugerida";

export interface PedidoGeracao {
  briefId: string;
  componente?: ComponenteBrief;
  intencao?: Intencao;
  sb?: SupabaseClient;
}

export interface ResultadoGeracao {
  brief: Brief;
  bloqueado: boolean;
  motivos: string[];
}

const COLUNAS = "*";

async function carregar(db: SupabaseClient, id: string): Promise<Brief> {
  const { data, error } = await db.from("nl_briefs").select(COLUNAS).eq("id", id).single();
  if (error) throw error;
  const linha = data as Record<string, unknown>;
  return {
    ...(linha as unknown as Brief),
    em_30_segundos: Array.isArray(linha.em_30_segundos) ? (linha.em_30_segundos as ParagrafoBrief[]) : [],
    porque_interessa: Array.isArray(linha.porque_interessa)
      ? (linha.porque_interessa as ImplicacaoBrief[])
      : [],
    factos: Array.isArray(linha.factos) ? (linha.factos as FactoBrief[]) : [],
    contexto: Array.isArray(linha.contexto) ? (linha.contexto as string[]) : [],
    incertezas: Array.isArray(linha.incertezas) ? (linha.incertezas as string[]) : [],
    fontes_adicionais: Array.isArray(linha.fontes_adicionais)
      ? (linha.fontes_adicionais as Brief["fontes_adicionais"])
      : [],
    verificacao: (linha.verificacao as VerificacaoBrief) ?? {},
    ia: (linha.ia as Brief["ia"]) ?? {},
    leitura_sugerida: typeof linha.leitura_sugerida === "string" ? linha.leitura_sugerida : "",
    leitura_aprovada: typeof linha.leitura_aprovada === "string" ? linha.leitura_aprovada : "",
    pull_quote_sugerida:
      typeof linha.pull_quote_sugerida === "string" ? linha.pull_quote_sugerida : "",
  };
}

async function gravar(db: SupabaseClient, id: string, registo: Record<string, unknown>): Promise<Brief> {
  const { error } = await db.from("nl_briefs").update(registo).eq("id", id);
  if (error) throw error;
  return carregar(db, id);
}

function textoRedigido(b: { em_30_segundos: ParagrafoBrief[]; porque_interessa: ImplicacaoBrief[] }): string {
  return [
    ...b.em_30_segundos.map((p) => p.texto),
    ...b.porque_interessa.map((i) => `${i.rotulo}: ${i.texto}`),
  ].join("\n\n");
}

/** Falha técnica: fica em erro, com a causa, e pode voltar a tentar-se. */
async function marcarErro(
  db: SupabaseClient,
  brief: Brief,
  motivo: string,
  extra: Record<string, unknown> = {},
): Promise<ResultadoGeracao> {
  const actualizado = await gravar(db, brief.id, {
    estado: "erro",
    erro: motivo,
    tentativas: (brief.tentativas ?? 0) + 1,
    ...extra,
  });
  return { brief: actualizado, bloqueado: true, motivos: [motivo] };
}

/**
 * Gera (ou regenera) o Brief. Duas chamadas seguidas nunca criam um segundo
 * Brief: trabalha-se sempre sobre a mesma linha, e o estado `a_gerar` serve
 * de tranca contra execuções sobrepostas.
 */
export async function gerarBrief(pedido: PedidoGeracao): Promise<ResultadoGeracao> {
  const db = clienteBrief(pedido.sb);
  const componente = pedido.componente ?? "tudo";
  const intencao = pedido.intencao ?? "normal";

  const inicial = await carregar(db, pedido.briefId);
  if (inicial.estado === "a_gerar") {
    return { brief: inicial, bloqueado: true, motivos: ["Este Brief já está a ser gerado."] };
  }

  const brief = await gravar(db, inicial.id, { estado: "a_gerar", erro: null });

  let material: MaterialFonte;
  try {
    material = await recolherFonte(brief.fonte_url);
  } catch (e) {
    return marcarErro(db, brief, `Não foi possível ler a fonte: ${(e as Error).message}`);
  }

  if (!material.ok) {
    return marcarErro(db, brief, material.motivo ?? "Fonte indisponível.", {
      verificacao: { ...brief.verificacao, fonte_estado: "indisponivel" },
    });
  }

  const titulo = material.titulo?.trim() || brief.slug.replace(/-/g, " ");

  try {
    let factos = brief.factos;
    let contexto = brief.contexto;
    let incertezas = brief.incertezas;
    const registo: Record<string, unknown> = {
      fonte_publisher: material.publisher ?? brief.fonte_publisher,
      fonte_data: material.data ?? brief.fonte_data,
      verificacao: { ...brief.verificacao, fonte_estado: "ok" },
    };

    if (componente === "tudo" || factos.length === 0) {
      const extraccao = await extrairFactos({
        sb: db,
        briefId: brief.id,
        titulo,
        urlFonte: material.urlFinal ?? brief.fonte_url,
        corpo: material.corpo,
      });
      factos = extraccao.factos;
      contexto = extraccao.contexto;
      incertezas = extraccao.incertezas;
      registo.factos = factos;
      registo.contexto = contexto;
      registo.incertezas = incertezas;
    }

    if (componente === "tudo" && !brief.fonte_primaria_url) {
      const primaria = await identificarFontePrimaria({
        sb: db,
        briefId: brief.id,
        titulo,
        factos: factos.map((f) => f.afirmacao),
        urlFonte: material.urlFinal ?? brief.fonte_url,
        htmlLigacoes: material.html,
      });
      // Reportagem própria: a fonte jornalística manda, a primária só acresce.
      if (primaria.url) {
        registo.fonte_primaria_url = primaria.url;
        if (primaria.adicionais.length) registo.fontes_adicionais = primaria.adicionais;
      }
    }

    const comum = {
      sb: db,
      briefId: brief.id,
      titulo,
      tipo: brief.tipo,
      factos,
      contexto,
      incertezas,
      intencao,
    };

    let em30 = brief.em_30_segundos;
    let porque = brief.porque_interessa;
    let leitura = brief.leitura_sugerida;
    let pullQuote = brief.pull_quote_sugerida;

    if (componente === "tudo" || componente === "em_30_segundos") {
      em30 = await gerarEmTrintaSegundos({
        ...comum,
        anterior: brief.em_30_segundos.map((p) => p.texto).join(" "),
      });
      registo.em_30_segundos = em30;
    }
    if (componente === "tudo" || componente === "porque_interessa") {
      porque = await gerarPorqueInteressa(comum);
      registo.porque_interessa = porque;
    }
    if (brief.tipo === "destaque" && (componente === "tudo" || componente === "leitura_sugerida")) {
      const r = await gerarLeituraSugerida({ ...comum, anterior: brief.leitura_sugerida });
      leitura = r.leitura;
      pullQuote = r.pullQuote;
      registo.leitura_sugerida = leitura;
      registo.pull_quote_sugerida = pullQuote;
      // Mexer na leitura sugerida repõe sempre a decisão humana.
      if (brief.aprovada_em) {
        registo.aprovada_em = null;
        registo.aprovada_por = null;
      }
    }

    const texto = textoRedigido({ em_30_segundos: em30, porque_interessa: porque });
    const factual = await verificarFactualidade({
      sb: db,
      briefId: brief.id,
      texto,
      factos,
      corpo: material.corpo,
    });
    const proximidade = avaliarProximidade(texto, material.corpo);

    const motivos: string[] = [];
    if (factual.bloqueia) motivos.push("Há afirmações sem suporte na fonte.");
    if (proximidade.decisao === "bloqueado") motivos.push("O texto está demasiado perto do original.");

    const verificacao: VerificacaoBrief = {
      fonte_estado: "ok",
      factual: factual.bloqueia ? "falhou" : "ok",
      factual_detalhe: factual,
      proximidade: proximidade.score,
      proximidade_detalhe: proximidade,
      confianca: factos.length
        ? Number((factos.reduce((s, f) => s + f.confianca, 0) / factos.length).toFixed(2))
        : 0,
      verificado_em: new Date().toISOString(),
      notas: motivos,
    };
    registo.verificacao = verificacao;

    const semConteudo = em30.length === 0 || porque.length === 0;
    if (semConteudo) motivos.push("A IA não devolveu texto utilizável.");

    const meta = brief.ia ?? {};
    registo.ia = {
      ...meta,
      geracoes: (meta.geracoes ?? 0) + (componente === "tudo" ? 1 : 0),
      regeneracoes: (meta.regeneracoes ?? 0) + (componente === "tudo" ? 0 : 1),
      prompt_versao: "2b",
    };

    const bloqueado = motivos.length > 0;
    const exigeRevisao =
      brief.tipo === "destaque" || bloqueado || Boolean(registo.aprovada_em === null && brief.aprovada_em);

    registo.estado = semConteudo ? "erro" : exigeRevisao ? "por_rever" : "aprovado";
    registo.erro = semConteudo ? motivos.join(" ") : null;
    if (semConteudo) registo.tentativas = (brief.tentativas ?? 0) + 1;

    const actualizado = await gravar(db, brief.id, registo);
    return { brief: actualizado, bloqueado, motivos };
  } catch (e) {
    return marcarErro(db, brief, (e as Error).message || "Falha inesperada na geração.");
  }
}

/**
 * Reformula quando a proximidade bloqueou: pede outro ângulo e volta a medir.
 */
export async function reformularBrief(
  briefId: string,
  sb?: SupabaseClient,
): Promise<ResultadoGeracao> {
  return gerarBrief({ briefId, componente: "em_30_segundos", intencao: "outro_angulo", sb });
}

/** Nova passagem de verificação, sem reescrever nada. */
export async function reverificarBrief(briefId: string, sb?: SupabaseClient): Promise<ResultadoGeracao> {
  const db = clienteBrief(sb);
  const brief = await carregar(db, briefId);
  const material = await recolherFonte(brief.fonte_url);
  const texto = textoRedigido(brief);

  if (!material.ok) {
    const actualizado = await gravar(db, brief.id, {
      verificacao: { ...brief.verificacao, fonte_estado: "indisponivel" },
    });
    return {
      brief: actualizado,
      bloqueado: true,
      motivos: [material.motivo ?? "Fonte indisponível."],
    };
  }

  const factual = await verificarFactualidade({
    sb: db,
    briefId: brief.id,
    texto,
    factos: brief.factos,
    corpo: material.corpo,
  });
  const proximidade = avaliarProximidade(texto, material.corpo);
  const motivos: string[] = [];
  if (factual.bloqueia) motivos.push("Há afirmações sem suporte na fonte.");
  if (proximidade.decisao === "bloqueado") motivos.push("O texto está demasiado perto do original.");

  const actualizado = await gravar(db, brief.id, {
    verificacao: {
      ...brief.verificacao,
      fonte_estado: "ok",
      factual: factual.bloqueia ? "falhou" : "ok",
      factual_detalhe: factual,
      proximidade: proximidade.score,
      proximidade_detalhe: proximidade,
      verificado_em: new Date().toISOString(),
      notas: motivos,
    },
  });
  return { brief: actualizado, bloqueado: motivos.length > 0, motivos };
}
