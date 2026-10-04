import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";
export declare function problemasTokensEnvio(sb: SupabaseClient, apiKey: string, listas: Array<{
    egoi_lista_id: string;
    nome: string;
}>): Promise<string[]>;
