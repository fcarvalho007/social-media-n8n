export type EstadoLink = "ok" | "redireccionado" | "suspeito" | "quebrado";
export interface ContextoLink {
    tipo: "noticia" | "ferramenta" | "cronica" | "promocao" | "recomendacao" | "podcast" | "brief";
    id: string;
    titulo: string;
    /** Onde o link é usado. Ausente no formato Clássico (tudo segue no email). */
    canal?: "email" | "web";
}
export interface ItemLink {
    url: string;
    estado: EstadoLink;
    status: number;
    redirect_para?: string;
    contexto: ContextoLink;
}
export interface ResumoLinks {
    ok: number;
    redireccionado: number;
    suspeito: number;
    quebrado: number;
    total: number;
}
export interface ResultadoVerificarLinks {
    items: ItemLink[];
    resumo: ResumoLinks;
    verificado_em: string;
    cache: boolean;
}
export declare const CACHE_MS: number;
/**
 * Verifica um URL isolado. Estratégia robusta:
 * 1) HEAD com headers de browser.
 * 2) Se HEAD falhar (erro de rede, 4xx/5xx, 405/501), tenta GET.
 * 3) Segue até MAX_REDIRECTS.
 * 4) Só o segundo pedido (GET) decide.
 */
export declare function verificarUm(inicial: string): Promise<Omit<ItemLink, "contexto">>;
export declare function correrEmFila<T>(entradas: T[], worker: (t: T) => Promise<void>): Promise<void>;
export declare function computarResumo(items: ItemLink[]): ResumoLinks;
export interface EntradaLink {
    url: string;
    contexto: ContextoLink;
}
/**
 * URLs em jogo numa edição. No Clássico: notícias aprovadas + as duas
 * ferramentas da semana. No Revista acrescentam-se crónica, recomendação e
 * podcast, e cada entrada indica se segue no email ou só na edição web.
 * A chave de comparação é `tipo:id`, para detectar troca de URL numa notícia.
 */
export declare function recolherEntradas(supabase: import("npm:@supabase/supabase-js@2.57.4").SupabaseClient, edicao_id: string): Promise<EntradaLink[]>;
export declare function chaveEntrada(c: ContextoLink): string;
/** URL comparável: normalizado quando possível, senão o texto em bruto. */
export declare function urlComparavel(url: string): string;
export declare function normalizarUrlPublico(raw: string): string | null;
/**
 * A cache continua válida quando cobre exactamente as mesmas entradas
 * (`tipo:id`) com exactamente os mesmos URLs. Qualquer edição de URL,
 * notícia nova ou notícia removida invalida-a.
 */
export declare function cacheCobreEntradas(cache: ItemLink[], entradas: EntradaLink[]): boolean;
export declare function lerLinksIgnorados(supabase: import("npm:@supabase/supabase-js@2.57.4").SupabaseClient, edicao_id: string): Promise<string[]>;
