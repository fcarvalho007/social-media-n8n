import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";
import type { FactoBrief, VerificacaoFactual } from "./tipos.ts";
export interface ResultadoVerificacao extends VerificacaoFactual {
    motivo?: string;
}
export declare function verificarFactualidade(args: {
    sb: SupabaseClient;
    briefId?: string | null;
    texto: string;
    factos: FactoBrief[];
    corpo?: string;
}): Promise<ResultadoVerificacao>;
