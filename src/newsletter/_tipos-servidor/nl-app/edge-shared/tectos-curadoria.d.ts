type Admin = any;
export interface TectosCuradoria {
    maxPorCorrida: number;
    maxPorEmail: number;
    maxPorDia: number;
    /** Tecto diário exclusivo das entradas por email (reserva vagas para o RSS). */
    maxPorDiaEmail: number;
    maxPorFonte: number;
    maxPorCategoria: number;
    janelaHoras: number;
}
export declare const TECTOS_DEFAULT: TectosCuradoria;
/** Origens que contam para a quota diária automática (a entrada manual não conta). */
export declare const ORIGENS_AUTOMATICAS: string[];
export declare const ORIGENS_EMAIL: string[];
export declare const ORIGENS_RSS: string[];
export type AmbitoQuota = "rss" | "email" | "global";
export declare function lerTectos(admin: Admin): Promise<TectosCuradoria>;
/** Quantas entradas do âmbito pedido entraram nas últimas 24 horas. */
export declare function contarInseridasHoje(admin: Admin, ambito?: AmbitoQuota): Promise<number>;
/**
 * Vagas ainda disponíveis no dia para o âmbito pedido, nunca negativas.
 *
 * O email tem um tecto próprio (`maxPorDiaEmail`) para nunca consumir as vagas
 * da recolha RSS; o RSS conta apenas as suas próprias entradas contra o tecto
 * global do dia.
 */
export declare function vagasDiarias(admin: Admin, tectos: TectosCuradoria, ambito?: AmbitoQuota): Promise<number>;
/**
 * Corta uma lista de candidatos ao tecto pedido, equilibrando por categoria
 * (usado nos emails, onde a fonte é sempre a mesma).
 */
export declare function limitarPorCategoria<T>(itens: T[], categoria: (item: T) => string, max: number, maxPorCategoria: number): {
    mantidos: T[];
    cortados: T[];
};
export {};
