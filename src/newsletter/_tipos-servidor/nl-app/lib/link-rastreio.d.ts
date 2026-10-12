/** Verdadeiro quando o URL é um link de redireccionamento/rastreio de email. */
export declare function isLinkRastreio(url: string | null | undefined): boolean;
/** Versão curta e legível de um URL longo (para mostrar nos cartões). */
export declare function abreviarUrl(url: string | null | undefined, max?: number): string;
/**
 * Verdadeiro quando o URL não aponta para um artigo concreto: homepage,
 * secção genérica ou apenas parâmetros de rastreio (ex.: emarketer.com/?jid=…).
 * Estes links levam o leitor a uma página generalista, não à notícia.
 */
export declare function urlSemArtigo(url: string | null | undefined): boolean;
export type Editor = {
    dominio: string;
    nome: string;
};
/**
 * Tenta deduzir o editor original a partir de um URL (mesmo de rastreio).
 * Devolve `null` quando o domínio é genérico (beehiiv, bit.ly, …).
 */
export declare function editorDeUrl(url: string | null | undefined): Editor | null;
/** Etiquetas legíveis para o estado da fonte guardado na base de dados. */
export type FonteEstado = "ok" | "resolvida" | "por_confirmar";
export declare function estadoFonte(v: string | null | undefined): FonteEstado;
