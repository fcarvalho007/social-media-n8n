export type IdiomaFonte = "pt-PT" | "pt-BR" | "en" | "es" | "fr" | "de" | "outro";
export interface Candidato {
    url: string;
    dominio: string;
    titulo: string;
    snippet: string;
    score: number;
    motivo: string;
    data: string;
    dataISO?: string;
    idioma: IdiomaFonte;
}
export declare const pesquisarFonteIA: import("../_shim/start.ts").NlServerFn<unknown, {
    candidatos: Candidato[];
    total: number;
    queryGoogle: string;
}>;
