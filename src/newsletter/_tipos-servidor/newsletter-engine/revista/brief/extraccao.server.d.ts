import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";
import type { FactoBrief } from "./tipos.ts";
export interface ResultadoExtraccaoFactual {
    factos: FactoBrief[];
    contexto: string[];
    incertezas: string[];
}
export declare function extrairFactos(args: {
    sb: SupabaseClient;
    briefId?: string | null;
    titulo: string;
    urlFonte: string | null;
    corpo: string;
    corpoPrimaria?: string;
    urlPrimaria?: string | null;
}): Promise<ResultadoExtraccaoFactual>;
