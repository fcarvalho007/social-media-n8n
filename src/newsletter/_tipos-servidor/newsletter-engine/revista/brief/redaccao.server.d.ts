import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";
import type { FactoBrief, ImplicacaoBrief, ParagrafoBrief, TipoBrief } from "./tipos.ts";
export type Intencao = "normal" | "mais_pragmatico" | "mais_curto" | "menos_opinativo" | "outro_angulo" | "simplificar";
export interface ArgsRedaccao {
    sb: SupabaseClient;
    briefId?: string | null;
    titulo: string;
    tipo: TipoBrief;
    factos: FactoBrief[];
    contexto: string[];
    incertezas: string[];
    intencao?: Intencao;
    /** Texto anterior, para «outro ângulo» não repetir o mesmo. */
    anterior?: string;
}
export declare function gerarEmTrintaSegundos(args: ArgsRedaccao): Promise<ParagrafoBrief[]>;
export declare function gerarPorqueInteressa(args: ArgsRedaccao): Promise<ImplicacaoBrief[]>;
export interface LeituraGerada {
    leitura: string;
    pullQuote: string;
}
export declare function gerarLeituraSugerida(args: ArgsRedaccao): Promise<LeituraGerada>;
