import { type SupabaseClient } from "npm:npm:@supabase/supabase-js@2.57.4@2.57.4";
export declare class ErroEnvio extends Error {
    status: number;
    constructor(mensagem: string, status?: number);
}
export declare function admin(): SupabaseClient;
export interface Utilizador {
    id: string;
    nome: string;
    papel: "admin" | "curador";
}
/** Confirma papel do utilizador autenticado; `real` exige admin. */
export declare function autorizar(sb: SupabaseClient, userId: string, modo: "teste" | "real"): Promise<Utilizador>;
export declare function previewHtml(edicaoId: string, destino: "email" | "wordpress"): Promise<{
    ok: true;
    destino: "wordpress";
    html: string;
    resumo: string;
} | {
    ok: true;
    destino: "email";
    html: string;
    resumo: string | undefined;
}>;
export declare function sincronizarRascunho(userId: string, edicaoId: string, listaIds: string[]): Promise<{
    ok: boolean;
    campanhas: import("./sincronizar-egoi.server.ts").ResultadoSync[];
    sucessos: number;
    falhas: number;
    mensagem: string;
}>;
/** Cria a edição seguinte em rascunho (idempotente: não cria se já houver rascunho). */
export declare function garantirEdicaoSeguinte(sb: SupabaseClient, quem: string): Promise<{
    id: string;
    numero: number;
} | null>;
/**
 * Marca a edição como enviada. Idempotente: se já estiver enviada não faz nada.
 * Verifica o resultado e regista falha no audit_log em vez de falhar em silêncio.
 */
export declare function fecharEdicaoEnviada(sb: SupabaseClient, edicaoId: string, dados: {
    quem: string;
    assunto: string;
    html: string;
    sucessos: Array<{
        campaign_hash?: string;
        lista_id: string;
        lista_nome: string;
    }>;
    falhas: Array<{
        lista_id: string;
        lista_nome: string;
        erro?: string;
    }>;
}): Promise<boolean>;
export interface ResDisparo {
    lista_id: string;
    lista_nome: string;
    campaign_hash?: string;
    ok: boolean;
    erro?: string;
    sincronizada: boolean;
    /** Verdadeiro quando o estado veio da E-goi e não da resposta ao disparo. */
    confirmadoNaEgoi?: boolean;
}
/**
 * Pergunta à E-goi o estado real de cada campanha desta edição e alinha a
 * base de dados. Evita "por enviar" falso quando a resposta ao disparo se
 * perdeu (502, timeout) mas a campanha saiu mesmo.
 */
export declare function reconciliarEdicao(edicaoId: string): Promise<{
    ok: true;
    actualizadas: Array<{
        lista_id: string;
        lista_nome: string;
    }>;
}>;
export interface ListaPreparada {
    lista_id: string;
    lista_nome: string;
    campaign_hash?: string;
    ok: boolean;
    erro?: string;
}
/**
 * Fase 1 — prepara todas as campanhas na E-goi (criar/actualizar rascunho)
 * ANTES de qualquer disparo. Nenhuma lista é enviada aqui.
 * Coloca também o bloqueio `envio_em_curso` para evitar disparos duplos.
 */
export declare function prepararEnvio(opts: {
    userId?: string;
    quemNome?: string;
    edicaoId: string;
    listaIds: string[];
    confirmacaoNumero?: number;
    exigirConfirmacao?: boolean;
    publicarConteudos?: boolean;
}): Promise<{
    ok: true;
    modo: "teste" | "real";
    edicao: {
        numero: number;
        assunto: string;
    };
    listas: ListaPreparada[];
}>;
/** Fase 2 — dispara uma única lista já preparada. */
export declare function dispararLista(opts: {
    userId?: string;
    quemNome?: string;
    edicaoId: string;
    listaId: string;
}): Promise<ResDisparo>;
/**
 * Repete apenas uma lista que falhou: volta a preparar a campanha e dispara.
 * Nunca reenvia uma lista cuja campanha já esteja marcada como enviada.
 */
export declare function repetirLista(opts: {
    userId?: string;
    quemNome?: string;
    edicaoId: string;
    listaId: string;
}): Promise<ResDisparo>;
/** Fase 3 — liberta o bloqueio e fecha a edição (só em modo real e com sucessos). */
export declare function finalizarEnvio(opts: {
    userId?: string;
    quemNome?: string;
    edicaoId: string;
    listaIds: string[];
    /** Quando há listas por repetir, liberta o bloqueio mas não fecha a edição. */
    adiarFecho?: boolean;
}): Promise<{
    ok: true;
    fechada: boolean;
}>;
/**
 * Fluxo completo (usado pelo motor agendado e como alternativa ao fluxo
 * passo-a-passo do cockpit): prepara TODAS as campanhas, só depois dispara
 * lista a lista com pausa, e fecha a edição no fim.
 */
export declare function dispararEgoi(opts: {
    userId?: string;
    quemNome?: string;
    edicaoId: string;
    listaIds: string[];
    confirmacaoNumero?: number;
    exigirConfirmacao?: boolean;
}): Promise<{
    ok: boolean;
    modo: "teste" | "real";
    resultados: ResDisparo[];
    sucessos: number;
    falhas: number;
    mensagem: string;
}>;
export declare function publicarWordpress(opts: {
    edicaoId: string;
    userId?: string;
    quemNome?: string;
    /** Clássico publica; o backup Revista escreve em `private`. */
    status?: "draft" | "publish" | "private";
    /** Metadados Rank Math defensivos (noindex/canonical) — só no backup Revista. */
    meta?: Record<string, unknown>;
}): Promise<{
    ok: true;
    post_id: number;
    post_url: string;
    status: string;
    actualizada: boolean;
    mensagem: string;
}>;
