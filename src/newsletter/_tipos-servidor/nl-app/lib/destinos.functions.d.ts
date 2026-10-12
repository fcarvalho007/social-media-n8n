import type { DestinosEdicao } from "../../newsletter-engine/revista/destinos.server.ts";
export type { DestinosEdicao };
/** Estado consolidado dos quatro destinos. */
export declare const estadoDestinosFn: import("../_shim/start.ts").NlServerFn<{
    edicao_id: string;
}, DestinosEdicao>;
/** URL manual do artigo da crónica em FredericoCarvalho.pt. */
export declare const guardarUrlCronicaFn: import("../_shim/start.ts").NlServerFn<{
    edicao_id: string;
    url: string;
}, {
    ok: true;
    url: string;
}>;
/** Retry de um destino externo, sem reenviar email nem recriar o snapshot. */
export declare const repetirDestinoFn: import("../_shim/start.ts").NlServerFn<{
    edicao_id: string;
    destino: "backup";
}, {
    ok: boolean;
    mensagem: string;
}>;
/** Pré-visualização autenticada do artigo que iria para FredericoCarvalho.pt. */
export declare const previewArtigoCronicaFn: import("../_shim/start.ts").NlServerFn<{
    edicao_id: string;
}, import("../../newsletter-engine/revista/frederico-wordpress.server.ts").ArtigoPreview>;
/** Estado da integração FredericoCarvalho.pt (nunca devolve credenciais). */
export declare const estadoIntegracaoCronicaFn: import("../_shim/start.ts").NlServerFn<void, import("../../newsletter-engine/revista/frederico-wordpress.server.ts").EstadoIntegracaoFrederico>;
/**
 * Diagnóstico da integração: autenticação, categoria «Crónicas» e Rank Math.
 * Nunca devolve credenciais — apenas o que é seguro mostrar no painel.
 */
export declare const diagnosticoCronicaFn: import("../_shim/start.ts").NlServerFn<void, {
    autenticacao: import("../../newsletter-engine/revista/frederico-wordpress.server.ts").DiagnosticoAutenticacao;
    categoria: null;
    rankmath: null;
} | {
    autenticacao: import("../../newsletter-engine/revista/frederico-wordpress.server.ts").DiagnosticoAutenticacao;
    categoria: import("../../newsletter-engine/revista/frederico-wordpress.server.ts").CategoriaCronicas;
    rankmath: import("../../newsletter-engine/revista/frederico-wordpress.server.ts").DiagnosticoRankMath;
}>;
/**
 * Publica ou actualiza a crónica. O cliente nunca escolhe entre criar e
 * actualizar: o servidor decide pela existência do `external_id`.
 */
export declare const publicarCronicaFn: import("../_shim/start.ts").NlServerFn<{
    edicao_id: string;
    repetir?: boolean;
}, import("../../newsletter-engine/revista/frederico-wordpress.server.ts").ResultadoPublicacao>;
/**
 * Publicação definitiva da crónica: torna público o rascunho já existente.
 * Nunca cria um artigo novo — actua sempre sobre o `external_id` guardado.
 */
export declare const publicarArtigoCronicaFn: import("../_shim/start.ts").NlServerFn<{
    edicao_id: string;
}, import("../../newsletter-engine/revista/frederico-wordpress.server.ts").ResultadoPublicacao>;
/**
 * Actualiza o artigo já publicado. Nunca cria artigo, nunca muda o slug e
 * nunca despublica — o servidor recusa se o preflight não confirmar o estado.
 */
export declare const actualizarArtigoCronicaFn: import("../_shim/start.ts").NlServerFn<{
    edicao_id: string;
}, import("../../newsletter-engine/revista/frederico-wordpress.server.ts").ResultadoPublicacao & {
    seo?: import("../../newsletter-engine/revista/frederico-wordpress.server.ts").ResultadoSeo | null;
}>;
/**
 * Reconcilia apenas a impressão digital guardada, depois de confirmar por
 * leitura que o artigo remoto já contém a versão canónica. Não escreve no site.
 */
export declare const reconciliarHashCronicaFn: import("../_shim/start.ts").NlServerFn<{
    edicao_id: string;
}, import("../../newsletter-engine/revista/frederico-wordpress.server.ts").ResultadoReconciliacao>;
/**
 * Contagem real de artigos em FredericoCarvalho.pt com um dado slug.
 * Leitura autenticada, sem qualquer escrita — prova de unicidade.
 */
export declare const contarArtigosPorSlugFn: import("../_shim/start.ts").NlServerFn<{
    slug: string;
}, {
    ok: boolean;
    slug: string;
    total: number;
    artigos: import("../../newsletter-engine/revista/frederico-wordpress.server.ts").ArtigoPorSlug[];
    mensagem: string;
}>;
/**
 * Prontidão consolidada do workflow Revista (crónica, web, conteúdo,
 * snapshot, email, listas e backup). Só leitura — não escreve em lado nenhum.
 */
export declare const prontidaoRevistaFn: import("../_shim/start.ts").NlServerFn<{
    edicao_id: string;
    lista_ids?: string[];
}, import("../../newsletter-engine/revista/prontidao.server.ts").Prontidao>;
