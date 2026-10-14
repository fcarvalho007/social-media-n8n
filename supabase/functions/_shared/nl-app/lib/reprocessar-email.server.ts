// Reprocessamento de um email recebido através do pipeline de extracção v2.
// Server-only: só é importado dinamicamente de dentro de handlers.

import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";

export type ResultadoReprocessamento = {
  ok: true;
  noticias_inseridas: number;
  ferramentas_inseridas: number;
  formato: string;
  usou_fallback: boolean;
  motivo_sem_resultado: string | null;
};

/**
 * Corre o pipeline sobre um email já guardado.
 * `forcar` ignora o estado `activa` da fonte — é o comportamento correcto para
 * uma acção manual explícita de admin.
 */
export async function reprocessarEmailGuardado(
  // deno-lint-ignore no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  emailId: string,
  quem: string,
  forcar: boolean,
): Promise<ResultadoReprocessamento> {
  const { data: email, error } = await supabase
    .from("nl_emails_recebidos")
    .select("id, assunto, remetente, remetente_nome, corpo_html, corpo_texto")
    .eq("id", emailId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!email) throw new Error("Email não encontrado");

  const { processarEmailComPipeline } = await import(
    "../edge-shared/pipeline-newsletter.ts"
  );
  const { chamarIaExtrator } = await import("./ia-extractor.server.ts");
  const { chamarDeepSeek } = await import("./deepseek.server.ts");
  const { supabaseAdmin } = await import("../_shim/admin.ts");

  // Every AI call made while reading an email is counted in ia_uso (origem "email").
  const { custoUsd: custoUsdEmail } = await import("../edge-shared/custos-ia.ts");
  const registarUsoEmail = async (modelo: string, usage: { cacheHit: number; cacheMiss: number; saida: number }, operacao: string) => {
    try {
      await supabaseAdmin.from("nl_ia_uso").insert({
        modelo,
        tokens_entrada_cache_hit: usage.cacheHit,
        tokens_entrada_cache_miss: usage.cacheMiss,
        tokens_saida: usage.saida,
        custo_usd: custoUsdEmail(modelo, usage.cacheHit, usage.cacheMiss, usage.saida),
        origem: "email",
        operacao,
        edicao_id: null,
      } as never);
    } catch { /* nunca bloqueia */ }
  };
  const extratorComCusto = async (bloco: string, urlManual: string | undefined, corpoArtigo?: string) => {
    const r = await chamarIaExtrator(bloco, urlManual, corpoArtigo);
    await registarUsoEmail(r.modelo, r.usage, "email_extrair");
    return r;
  };
  const chamarBruto = async (sistema: string, user: string): Promise<string | null> => {
    try {
      const r = await chamarDeepSeek(sistema, user, { responseJson: true });
      await registarUsoEmail(r.modelo, r.usage, "email_blocos");
      return r.conteudo;
    } catch {
      return null;
    }
  };

  // Rede de segurança: uma descrição que só repete o título é reescrita com o
  // material do próprio email (sem ir buscar a página original).
  const { corrigirDescricaoRepetida } = await import("./extrair-noticia.server.ts");
  const { custoUsd } = await import("../edge-shared/custos-ia.ts");
  const corrigirDescricao = async (args: { titulo: string; descricao: string; corpo?: string }) => {
    const r = await corrigirDescricaoRepetida(args, async (u) => {
      try {
        await supabaseAdmin.from("nl_ia_uso").insert({
          modelo: u.modelo,
          tokens_entrada_cache_hit: u.usage.cacheHit,
          tokens_entrada_cache_miss: u.usage.cacheMiss,
          tokens_saida: u.usage.saida,
          custo_usd: custoUsd(u.modelo, u.usage.cacheHit, u.usage.cacheMiss, u.usage.saida),
          origem: "email",
          operacao: u.origem,
          edicao_id: null,
        } as never);
      } catch { /* nunca bloqueia */ }
    });
    return r.descricao;
  };

  // Lê o artigo ligado em cada notícia do email (best-effort).
  const { lerArtigo } = await import("./ler-artigo.server.ts");
  const lerCorpoArtigo = async (url: string) => (await lerArtigo(url)).corpo;


  const remetenteEmail = (email.remetente as string | null) ?? null;
  const remetenteNome = (email.remetente_nome as string | null) ?? null;
  const remetenteLabel = remetenteNome && remetenteEmail
    ? `${remetenteNome} <${remetenteEmail}>`
    : (remetenteNome ?? remetenteEmail ?? "desconhecido");

  // Estado de processamento: qualquer saída (sucesso ou falha) fica visível.
  await supabaseAdmin.from("nl_emails_recebidos")
    .update({ processamento_estado: "a_processar" } as never)
    .eq("id", email.id);

  let res: Awaited<ReturnType<typeof processarEmailComPipeline>>;
  try {
    res = await processarEmailComPipeline(
      supabaseAdmin as never,
      {
        html: (email.corpo_html as string | null) ?? null,
        plain: (email.corpo_texto as string | null) ?? null,
        assunto: (email.assunto as string | null) ?? "",
        remetenteLabel,
        remetenteEmail,
        emailRecebidoId: email.id as string,
      },
      { chamarIaExtrator: extratorComCusto, chamarDeepSeek: chamarBruto, corrigirDescricao, lerCorpoArtigo },
      { forcar },
    );
  } catch (e) {
    const msg = String((e as { message?: string })?.message ?? e).slice(0, 500);
    await supabaseAdmin.from("nl_emails_recebidos")
      .update({ processamento_estado: "falhou", processamento_erro: msg } as never)
      .eq("id", email.id);
    await supabaseAdmin.from("nl_audit_log").insert({
      quem, accao: "email_processamento_falhou",
      detalhe: { email_recebido_id: email.id, assunto: email.assunto, erro: msg },
    });
    throw e;
  }

  // Se a extracção foi cortada pelo tecto de tempo, o email fica pendente para
  // a corrida seguinte terminar os blocos restantes (o dedup evita repetidos).
  const truncado = Boolean((res.detalhe as { truncado_por_tempo?: boolean }).truncado_por_tempo);
  await supabaseAdmin.from("nl_emails_recebidos")
    .update({
      processamento_estado: truncado ? "por_processar" : "processado",
      processamento_erro: null,
      processado_em: new Date().toISOString(),
    } as never)
    .eq("id", email.id);

  if (res.noticias_inseridas + res.ferramentas_inseridas > 0) {
    await supabaseAdmin.from("nl_emails_recebidos")
      .update({ classificacao: "newsletter", notas_processadas: res.noticias_inseridas } as never)
      .eq("id", email.id);
  }

  await supabaseAdmin.from("nl_audit_log").insert({
    quem,
    accao: "email_reprocessado",
    detalhe: {
      email_id: email.id,
      assunto: email.assunto,
      noticias: res.noticias_inseridas,
      ferramentas: res.ferramentas_inseridas,
      formato: res.formato,
      usou_fallback: res.usou_fallback,
      forcado: forcar,
      motivo_sem_resultado: res.motivo_sem_resultado,
    },
  });

  return {
    ok: true,
    noticias_inseridas: res.noticias_inseridas,
    ferramentas_inseridas: res.ferramentas_inseridas,
    formato: res.formato,
    usou_fallback: res.usou_fallback,
    motivo_sem_resultado: res.motivo_sem_resultado,
  };
}
