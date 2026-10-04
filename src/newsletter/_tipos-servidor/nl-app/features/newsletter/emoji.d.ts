export type EmojiEntry = {
    emoji: string;
    palavras: string[];
    categoria: string;
};
export declare const CATEGORIAS: readonly ["IA & Bots", "Vídeo & Imagem", "Áudio & Podcast", "Escrita & Texto", "Dados & Análise", "Código & Dev", "Produtividade", "Web & Ligações", "Educação & Livros", "Negócio & Dinheiro", "Comunicação", "Diversos"];
export declare const EMOJI_LIBRARY: EmojiEntry[];
/** Pontua cada emoji contra o texto e devolve a melhor sugestão (ou ✨). */
export declare function sugerirEmoji(nome: string, descricao?: string): string;
/** Devolve emojis filtrados pela query. Ordem: correspondências exactas primeiro. */
export declare function pesquisarEmojis(query: string): EmojiEntry[];
