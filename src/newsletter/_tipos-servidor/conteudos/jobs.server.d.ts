import { type SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";
import { type Carrossel, type FonteCronica } from "./carrossel.ts";
export declare const TIPO = "carrossel_cronica";
/**
 * Automatic preparation only covers campaigns accepted by E-goi from this instant on
 * (go-live of the worker). Imported/historical editions are prepared only by an explicit
 * "preparar" action, never retroactively by the worker.
 */
export declare const AUTO_DESDE = "2026-10-04T11:00:00Z";
export declare function admin(): SupabaseClient;
/** Ensures one content row for the given source. Never touches an existing row. */
export declare function garantirConteudo(sb: SupabaseClient, fonte: FonteCronica): Promise<{
    id: string;
    fonte_aceite_em: string | null;
}>;
/**
 * Enqueue (idempotent). Repeated calls for the same campaign/edition/source do nothing.
 * Never throws: a failure here must not change the newsletter send result.
 */
export declare function enfileirarCarrossel(edicaoId: string, origem: "envio" | "reconciliacao" | "manual"): Promise<{
    ok: boolean;
    jobId?: string;
    motivo?: string;
}>;
/** Calls DeepSeek (max one guided repair), logs cost for every call incl. invalid answers, returns a validated carousel. */
export declare function gerarProposta(sb: SupabaseClient, fonte: FonteCronica): Promise<Carrossel>;
/** Bounded processor (max 5 jobs per run, atomic lease). Safe to call repeatedly. */
export declare function processarJobs(limite?: number): Promise<{
    processados: number;
}>;
/**
 * Recovers editions whose campaigns E-goi accepted after AUTO_DESDE but which have no job
 * yet (bounded). Never looks at nl_edicoes.estado and never touches historical editions.
 */
export declare function reconciliarEdicoesSemJob(limite?: number): Promise<{
    enfileiradas: number;
}>;
/** Editions with campaigns still "aceite" (accepted, not delivered) since AUTO_DESDE. */
export declare function edicoesPorConfirmar(limite?: number): Promise<string[]>;
