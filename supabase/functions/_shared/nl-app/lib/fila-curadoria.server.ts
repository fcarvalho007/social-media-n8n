// Fila de entrada da curadoria.
//
// A recolha automática (RSS/HTML e emails) passa a guardar candidatos aqui,
// sem gastar IA. O processamento em lote é sempre explícito: o utilizador
// escolhe quantos itens quer interpretar, dos mais recentes para os mais
// antigos.
//
// Server-only: só importado dinamicamente de dentro de handlers.

import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";

// deno-lint-ignore no-explicit-any
type Admin = SupabaseClient<any, any, any>;

export const CHAVE_MODO_MANUAL = "curadoria_modo_manual";
const CHAVE_LOCK = "curadoria_fila_lock";
const LOCK_MAX_MS = 10 * 60 * 1000;

export type ItemFila = {
  origem: "rss" | "email";
  fonte_id?: string | null;
  fonte_nome?: string | null;
  fonte_grupo?: string | null;
  email_recebido_id?: string | null;
  titulo: string;
  url?: string | null;
  url_norm?: string | null;
  descricao?: string;
  publicado_em?: string;
};

/** A recolha automática deve apenas guardar em fila (sem IA)? */
export async function modoManualActivo(admin: Admin): Promise<boolean> {
  try {
    const { data } = await admin
      .from("nl_configuracoes").select("valor").eq("chave", CHAVE_MODO_MANUAL).maybeSingle();
    const valor = (data as { valor?: string | null } | null)?.valor;
    if (valor == null) return true; // por omissão, manual
    return valor !== "false";
  } catch {
    return true;
  }
}

export async function definirModoManual(admin: Admin, manual: boolean): Promise<void> {
  await admin.from("nl_configuracoes")
    .upsert({ chave: CHAVE_MODO_MANUAL, valor: manual ? "true" : "false" } as never, { onConflict: "chave" });
}

/** Insere candidatos na fila, ignorando os que já lá estão (url_norm único). */
export async function enfileirar(admin: Admin, itens: ItemFila[]): Promise<number> {
  if (itens.length === 0) return 0;
  const linhas = itens.map((i) => ({
    origem: i.origem,
    fonte_id: i.fonte_id ?? null,
    fonte_nome: i.fonte_nome ?? null,
    fonte_grupo: i.fonte_grupo ?? null,
    email_recebido_id: i.email_recebido_id ?? null,
    titulo: i.titulo.slice(0, 240),
    url: i.url ?? null,
    url_norm: i.url_norm ?? null,
    descricao: (i.descricao ?? "").slice(0, 4000),
    publicado_em: i.publicado_em ?? new Date().toISOString(),
    estado: "em_fila",
  }));

  let inseridos = 0;
  // Um a um: um url repetido não pode abortar o lote inteiro.
  for (const linha of linhas) {
    // Emails não têm url_norm; a unicidade garante-se pelo email de origem.
    if (linha.email_recebido_id) {
      const { data: jaExiste } = await admin
        .from("nl_curadoria_fila").select("id")
        .eq("email_recebido_id", linha.email_recebido_id).maybeSingle();
      if (jaExiste) continue;
    }
    const { error } = await admin.from("nl_curadoria_fila").insert(linha as never);
    if (!error) inseridos += 1;
  }
  return inseridos;

}

/** Itens com mais de estes dias podem ser apagados da fila (pré-definição). */
export const DIAS_LIMPEZA_FILA = 20;

export type ContagemFila = {
  total: number;
  rss: number;
  email: number;
  falhados: number;
  antigas: number;
  mais_antigo: string | null;
  mais_recente: string | null;
};

export async function contarFila(admin: Admin): Promise<ContagemFila> {
  const { data } = await admin
    .from("nl_curadoria_fila")
    .select("origem, estado, publicado_em")
    .in("estado", ["em_fila", "falhado"])
    .order("publicado_em", { ascending: false })
    .limit(5000);

  const linhas = (data ?? []) as Array<{ origem: string; estado: string; publicado_em: string }>;
  const emFila = linhas.filter((l) => l.estado === "em_fila");
  const datas = emFila.map((l) => l.publicado_em).sort();
  const limite = Date.now() - DIAS_LIMPEZA_FILA * 24 * 60 * 60 * 1000;
  return {
    total: emFila.length,
    rss: emFila.filter((l) => l.origem === "rss").length,
    email: emFila.filter((l) => l.origem === "email").length,
    falhados: linhas.filter((l) => l.estado === "falhado").length,
    antigas: linhas.filter((l) => Date.parse(l.publicado_em) < limite).length,
    mais_antigo: datas[0] ?? null,
    mais_recente: datas[datas.length - 1] ?? null,
  };
}

/**
 * Apaga itens da fila com mais de `dias` dias (pré-definição: 20).
 * Só toca em itens à espera ou falhados — nunca em itens já processados.
 */
export async function limparFilaAntiga(
  admin: Admin,
  opcoes: { dias?: number; quem: string },
): Promise<{ apagados: number }> {
  const dias = Math.max(1, Math.floor(opcoes.dias ?? DIAS_LIMPEZA_FILA));
  const corte = new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString();
  const { error, count } = await admin
    .from("nl_curadoria_fila")
    .delete({ count: "exact" })
    .in("estado", ["em_fila", "falhado"])
    .lt("publicado_em", corte);
  if (error) throw new Error(error.message);
  const apagados = count ?? 0;
  if (apagados > 0) {
    await admin.from("nl_audit_log").insert({
      quem: opcoes.quem,
      accao: `Fila limpa — ${apagados} ${apagados === 1 ? "item apagado" : "itens apagados"} com mais de ${dias} dias`,
      detalhe: { dias, apagados },
    } as never);
  }
  return { apagados };
}

/** Lock simples de execução única, guardado em `configuracoes`. */
async function adquirirLock(admin: Admin, quem: string): Promise<boolean> {
  const { data } = await admin
    .from("nl_configuracoes").select("valor").eq("chave", CHAVE_LOCK).maybeSingle();
  const valor = (data as { valor?: string | null } | null)?.valor;
  if (valor) {
    try {
      const anterior = JSON.parse(valor) as { em?: string };
      const em = anterior.em ? Date.parse(anterior.em) : 0;
      if (Number.isFinite(em) && Date.now() - em < LOCK_MAX_MS) return false;
    } catch { /* lock corrompido: assume livre */ }
  }
  await admin.from("nl_configuracoes")
    .upsert({ chave: CHAVE_LOCK, valor: JSON.stringify({ quem, em: new Date().toISOString() }) } as never,
      { onConflict: "chave" });
  return true;
}

async function libertarLock(admin: Admin): Promise<void> {
  try {
    await admin.from("nl_configuracoes")
      .upsert({ chave: CHAVE_LOCK, valor: "" } as never, { onConflict: "chave" });
  } catch { /* noop */ }
}

export type ResultadoLote = {
  ok: boolean;
  bloqueado?: boolean;
  processados: number;
  noticias: number;
  ferramentas: number;
  descartados: number;
  falhados: number;
  restantes: number;
  detalhes: Array<{ titulo: string; resultado: string }>;
};

/**
 * Processa até `limite` itens da fila, dos mais recentes para os mais antigos.
 * Cada item é marcado no momento em que termina, para que uma nova corrida
 * nunca repita trabalho já feito.
 */
export async function processarLote(
  admin: Admin,
  opcoes: { limite: number; quem: string },
): Promise<ResultadoLote> {
  const limite = Math.max(1, Math.min(50, Math.floor(opcoes.limite)));
  const vazio: ResultadoLote = {
    ok: true, processados: 0, noticias: 0, ferramentas: 0,
    descartados: 0, falhados: 0, restantes: 0, detalhes: [],
  };

  if (!(await adquirirLock(admin, opcoes.quem))) {
    return { ...vazio, ok: false, bloqueado: true };
  }

  try {
    const { data } = await admin
      .from("nl_curadoria_fila")
      .select("id, origem, titulo, url, descricao, fonte_id, email_recebido_id, tentativas")
      .eq("estado", "em_fila")
      .order("publicado_em", { ascending: false })
      .limit(limite);

    const itens = (data ?? []) as Array<{
      id: string; origem: string; titulo: string; url: string | null; descricao: string;
      fonte_id: string | null; email_recebido_id: string | null; tentativas: number;
    }>;

    const resultado: ResultadoLote = { ...vazio, detalhes: [] };

    const { mapCategoria } = await import("./ia-extractor.server.ts");
    const { custoUsd } = await import("../edge-shared/custos-ia.ts");
    const { motivoTituloLixo, descreverMotivoLixo } = await import(
      "../edge-shared/ruido-titulo.ts"
    );
    const { resolverFonteArtigo } = await import("../edge-shared/resolver-url.ts");
    const { extrairNoticiaComCorpo } = await import("./extrair-noticia.server.ts");

    /** Custo de cada chamada, sem nunca travar o processamento. */
    const registarUso = async (u: {
      modelo: string;
      usage: { cacheHit: number; cacheMiss: number; saida: number };
      origem: string;
    }) => {
      try {
        await admin.from("nl_ia_uso").insert({
          modelo: u.modelo,
          tokens_entrada_cache_hit: u.usage.cacheHit,
          tokens_entrada_cache_miss: u.usage.cacheMiss,
          tokens_saida: u.usage.saida,
          custo_usd: custoUsd(u.modelo, u.usage.cacheHit, u.usage.cacheMiss, u.usage.saida),
          origem: u.origem,
          edicao_id: null,
        } as never);
      } catch { /* nunca bloqueia */ }
    };


    for (const item of itens) {
      resultado.processados += 1;
      try {
        if (item.origem === "email" && item.email_recebido_id) {
          const { reprocessarEmailGuardado } = await import("./reprocessar-email.server.ts");
          const r = await reprocessarEmailGuardado(admin, item.email_recebido_id, opcoes.quem, false);
          resultado.noticias += r.noticias_inseridas;
          resultado.ferramentas += r.ferramentas_inseridas;
          await admin.from("nl_curadoria_fila")
            .update({ estado: "processado", motivo: null, tentativas: item.tentativas + 1 } as never)
            .eq("id", item.id);
          resultado.detalhes.push({
            titulo: item.titulo,
            resultado: `${r.noticias_inseridas} notícias · ${r.ferramentas_inseridas} ferramentas`,
          });
          continue;
        }

        // Lê o artigo original, extrai e garante que a descrição acrescenta
        // informação ao título. A leitura falhar nunca trava o processamento.
        const extraccao = await extrairNoticiaComCorpo(
          {
            titulo: item.titulo,
            descricao: item.descricao,
            url: item.url,
            origemUso: "curadoria_fila",
          },
          registarUso,
        );

        const ia = extraccao.ia;
        if (!ia) throw new Error(extraccao.motivo ?? "A IA não devolveu resultado");

        const titulo = extraccao.titulo;
        const descricao = extraccao.descricao;
        const corpoArtigo = extraccao.corpo;
        const categoria = mapCategoria(ia.categoria);
        const urlBruto = (typeof ia.url === "string" && /^https?:\/\//i.test(ia.url)) ? ia.url : (item.url ?? "");

        const fonte = await resolverFonteArtigo({ titulo, descricao, url: urlBruto });
        const url = fonte.url || urlBruto;

        const motivoLixo = motivoTituloLixo(titulo, descricao, url);
        if (motivoLixo) {
          resultado.descartados += 1;
          await admin.from("nl_curadoria_fila")
            .update({
              estado: "descartado",
              motivo: descreverMotivoLixo(motivoLixo),
              tentativas: item.tentativas + 1,
            } as never)
            .eq("id", item.id);
          resultado.detalhes.push({ titulo, resultado: `descartado — ${descreverMotivoLixo(motivoLixo)}` });
          continue;
        }

        const { data: inserida, error: insErr } = await admin.from("nl_noticias").insert({
          titulo: titulo.slice(0, 240),
          descricao,
          url,
          categoria,
          origem: "curadoria_ia",
          estado: "pendente",
          destino: "news",
          destaque: false,
          ordem: 0,
          edicao_id: null,
          fonte_id: item.fonte_id,
          fonte_estado: fonte.estado,
          fonte_url_original: fonte.urlOriginal,
          corpo_artigo: corpoArtigo || null,
        } as never).select("id").maybeSingle();
        if (insErr) throw new Error(insErr.message);

        resultado.noticias += 1;
        await admin.from("nl_curadoria_fila")
          .update({
            estado: "processado",
            motivo: null,
            tentativas: item.tentativas + 1,
            noticia_id: (inserida as { id?: string } | null)?.id ?? null,
          } as never)
          .eq("id", item.id);
        resultado.detalhes.push({ titulo, resultado: "em pendentes" });
      } catch (e) {
        const msg = String((e as { message?: string })?.message ?? e).slice(0, 300);
        resultado.falhados += 1;
        await admin.from("nl_curadoria_fila")
          .update({ estado: "falhado", motivo: msg, tentativas: item.tentativas + 1 } as never)
          .eq("id", item.id);
        resultado.detalhes.push({ titulo: item.titulo, resultado: `falhou — ${msg}` });
      }
    }

    const contagem = await contarFila(admin);
    resultado.restantes = contagem.total;

    if (resultado.processados > 0) {
      await admin.from("nl_audit_log").insert({
        quem: opcoes.quem,
        accao: `Fila processada — ${resultado.noticias} notícias · ${resultado.ferramentas} ferramentas de ${resultado.processados} itens`,
        detalhe: {
          limite,
          processados: resultado.processados,
          noticias: resultado.noticias,
          ferramentas: resultado.ferramentas,
          descartados: resultado.descartados,
          falhados: resultado.falhados,
          restantes: resultado.restantes,
        },
      } as never);
    }

    return resultado;
  } finally {
    await libertarLock(admin);
  }
}
