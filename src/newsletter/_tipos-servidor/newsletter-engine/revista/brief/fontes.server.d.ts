export interface MaterialFonte {
    ok: boolean;
    url: string | null;
    urlFinal: string | null;
    titulo: string | null;
    publisher: string | null;
    data: string | null;
    /** Texto do artigo. Transitório: nunca é persistido. */
    corpo: string;
    /** HTML bruto. Transitório: serve só para procurar a fonte primária. */
    html?: string;
    motivo?: string;
}
export declare function urlValido(url: string | null | undefined): boolean;
/** Nome legível da publicação a partir do domínio. */
export declare function publisherDeUrl(url: string | null | undefined): string | null;
/** Endereços internos que o artigo aponta — base para procurar a fonte primária. */
export declare function ligacoesExternas(html: string, origem: string): string[];
/**
 * Recolhe o material da fonte. Nunca lança: quando a página não é
 * recuperável de forma fiável devolve `ok: false` com o motivo, para o
 * motor marcar «fonte indisponível» em vez de inventar.
 */
export declare function recolherFonte(url: string | null | undefined): Promise<MaterialFonte>;
/** Confirma que um endereço candidato existe mesmo e devolve o que se sabe dele. */
export declare function validarCandidato(url: string): Promise<MaterialFonte | null>;
