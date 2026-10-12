import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";
import type { DadosArtigoCronica } from "./artigo-cronica.ts";
export interface CronicaCanonica extends DadosArtigoCronica {
    /** `destinos.cronica.external_id` guardado nesta edição. */
    externalId: string | number | null;
}
/**
 * Lê a crónica canónica da edição.
 *
 * Todas as consultas são filtradas por `edicao_id`; `cronicas.edicao_id` tem
 * índice único, pelo que existe no máximo uma crónica por edição.
 */
export declare function lerCronicaCanonica(sb: SupabaseClient, edicaoId: string): Promise<CronicaCanonica>;
