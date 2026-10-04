import process from "node:process";
// Server functions dos destinos de publicação da Revista.
//
// O cliente pede acções e lê estados; toda a orquestração (e qualquer
// credencial futura) vive no servidor.
import { createServerFn } from "../_shim/start.ts";
import { requireSupabaseAuth } from "../_shim/auth.ts";

import type { DestinosEdicao } from "../../newsletter-engine/revista/destinos.server.ts";

export type { DestinosEdicao };

async function nomeDe(userId: string): Promise<string> {
  const { createClient } = await import("npm:@supabase/supabase-js@2.57.4");
  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  const { data } = await sb.from("nl_perfis").select("nome").eq("id", userId).maybeSingle();
  return ((data as { nome: string | null } | null)?.nome ?? "").trim() || "utilizador";
}

/** Estado consolidado dos quatro destinos. */
export const estadoDestinosFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { edicao_id: string }) => d)
  .handler(async ({ data }) => {
    const { estadoDestinos } = await import("../../newsletter-engine/revista/destinos.server.ts");
    if (!data.edicao_id) throw new Error("edicao_id em falta");
    return estadoDestinos(data.edicao_id);
  });

/** URL manual do artigo da crónica em FredericoCarvalho.pt. */
export const guardarUrlCronicaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { edicao_id: string; url: string }) => d)
  .handler(async ({ data, context }) => {
    const { guardarUrlCronica } = await import("../../newsletter-engine/revista/destinos.server.ts");
    return guardarUrlCronica({
      edicaoId: data.edicao_id,
      url: data.url ?? "",
      quem: await nomeDe(context.userId),
    });
  });

/** Retry de um destino externo, sem reenviar email nem recriar o snapshot. */
export const repetirDestinoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { edicao_id: string; destino: "backup" }) => d)
  .handler(async ({ data, context }) => {
    const { repetirDestino } = await import("../../newsletter-engine/revista/destinos.server.ts");
    return repetirDestino({
      edicaoId: data.edicao_id,
      destino: "backup",
      quem: await nomeDe(context.userId),
    });
  });

/** Pré-visualização autenticada do artigo que iria para FredericoCarvalho.pt. */
export const previewArtigoCronicaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { edicao_id: string }) => d)
  .handler(async ({ data }) => {
    const { construirArtigoCronica } = await import(
      "../../newsletter-engine/revista/frederico-wordpress.server.ts"
    );
    if (!data.edicao_id) throw new Error("edicao_id em falta");
    return construirArtigoCronica(data.edicao_id);
  });

/** Estado da integração FredericoCarvalho.pt (nunca devolve credenciais). */
export const estadoIntegracaoCronicaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { obterEstadoIntegracaoFrederico } = await import(
      "../../newsletter-engine/revista/frederico-wordpress.server.ts"
    );
    return obterEstadoIntegracaoFrederico();
  });

/**
 * Diagnóstico da integração: autenticação, categoria «Crónicas» e Rank Math.
 * Nunca devolve credenciais — apenas o que é seguro mostrar no painel.
 */
export const diagnosticoCronicaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { verificarAutenticacao, resolverCategoriaCronicas, auditarRankMath } = await import(
      "../../newsletter-engine/revista/frederico-wordpress.server.ts"
    );
    const autenticacao = await verificarAutenticacao();
    if (!autenticacao.ok) {
      return { autenticacao, categoria: null, rankmath: null };
    }
    const [categoria, rankmath] = await Promise.all([resolverCategoriaCronicas(), auditarRankMath()]);
    return { autenticacao, categoria, rankmath };
  });

/**
 * Publica ou actualiza a crónica. O cliente nunca escolhe entre criar e
 * actualizar: o servidor decide pela existência do `external_id`.
 */
export const publicarCronicaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { edicao_id: string; repetir?: boolean }) => d)
  .handler(async ({ data, context }) => {
    const { publicarCronica, repetirPublicacaoCronica } = await import(
      "../../newsletter-engine/revista/frederico-wordpress.server.ts"
    );
    if (!data.edicao_id) throw new Error("edicao_id em falta");
    const quem = await nomeDe(context.userId);
    return data.repetir
      ? repetirPublicacaoCronica({ edicaoId: data.edicao_id, quem })
      : publicarCronica({ edicaoId: data.edicao_id, quem });
  });


/**
 * Publicação definitiva da crónica: torna público o rascunho já existente.
 * Nunca cria um artigo novo — actua sempre sobre o `external_id` guardado.
 */
export const publicarArtigoCronicaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { edicao_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { publicarArtigoCronica } = await import(
      "../../newsletter-engine/revista/frederico-wordpress.server.ts"
    );
    if (!data.edicao_id) throw new Error("edicao_id em falta");
    return publicarArtigoCronica({ edicaoId: data.edicao_id, quem: await nomeDe(context.userId) });
  });

/**
 * Actualiza o artigo já publicado. Nunca cria artigo, nunca muda o slug e
 * nunca despublica — o servidor recusa se o preflight não confirmar o estado.
 */
export const actualizarArtigoCronicaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { edicao_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { actualizarArtigoCronica } = await import(
      "../../newsletter-engine/revista/frederico-wordpress.server.ts"
    );
    if (!data.edicao_id) throw new Error("edicao_id em falta");
    return actualizarArtigoCronica({ edicaoId: data.edicao_id, quem: await nomeDe(context.userId) });
  });

/**
 * Reconcilia apenas a impressão digital guardada, depois de confirmar por
 * leitura que o artigo remoto já contém a versão canónica. Não escreve no site.
 */
export const reconciliarHashCronicaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { edicao_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { reconciliarHashCronica } = await import(
      "../../newsletter-engine/revista/frederico-wordpress.server.ts"
    );
    if (!data.edicao_id) throw new Error("edicao_id em falta");
    return reconciliarHashCronica({ edicaoId: data.edicao_id, quem: await nomeDe(context.userId) });
  });

/**
 * Contagem real de artigos em FredericoCarvalho.pt com um dado slug.
 * Leitura autenticada, sem qualquer escrita — prova de unicidade.
 */
export const contarArtigosPorSlugFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { slug: string }) => d)
  .handler(async ({ data }) => {
    const { contarArtigosPorSlug } = await import(
      "../../newsletter-engine/revista/frederico-wordpress.server.ts"
    );
    if (!data.slug) throw new Error("slug em falta");
    return contarArtigosPorSlug(data.slug);
  });

/**
 * Prontidão consolidada do workflow Revista (crónica, web, conteúdo,
 * snapshot, email, listas e backup). Só leitura — não escreve em lado nenhum.
 */
export const prontidaoRevistaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { edicao_id: string; lista_ids?: string[] }) => d)
  .handler(async ({ data }) => {
    const { avaliarProntidao } = await import("../../newsletter-engine/revista/prontidao.server.ts");
    if (!data.edicao_id) throw new Error("edicao_id em falta");
    return avaliarProntidao(data.edicao_id, { listaIds: data.lista_ids });
  });
