export interface FotoCandidata {
    id: number;
    largura: number;
    altura: number;
}
/** Converte o HTML da crónica em parágrafos de texto simples. */
export declare function paragrafosDoHtml(html: string | null | undefined): string[];
/** Texto simples da crónica, com parágrafos separados por linha em branco. */
export declare function textoDaCronica(html: string | null | undefined): string;
/**
 * Excerto: os primeiros parágrafos completos, sem cortar frases a meio.
 * Nunca inventa texto — é sempre material da própria crónica.
 */
export declare function excertoSugerido(paragrafos: string[], maxCaracteres?: number): string;
/**
 * Melhor frase do próprio texto para servir de frase de destaque:
 * entre 8 e 28 palavras, afirmativa, sem números soltos a abrir.
 */
export declare function pullQuoteSugerida(paragrafos: string[]): string;
/**
 * Trava anti-invenção: o valor protagonista do momento editorial tem de
 * existir literalmente no texto da crónica.
 */
export declare function valorExisteNoTexto(valor: string, texto: string): boolean;
/** Melhor fotografia: horizontal, resolução decente e proporção perto de 3:1. */
export declare function escolherFoto<T extends FotoCandidata>(fotos: T[]): T | null;
/** Assinatura curta e estável do texto, para não repetir propostas iguais. */
export declare function assinaturaTexto(texto: string): string;
