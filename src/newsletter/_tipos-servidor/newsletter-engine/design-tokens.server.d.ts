export declare const COR: {
    readonly tituloCor: "#0F172A";
    readonly descricaoCor: "#475569";
    readonly linkCor: "#6366F1";
    readonly linkBorda: "#C7D2FE";
    readonly fundoClaro: "#EEF1F5";
    readonly fundoCartao: "#FFFFFF";
    readonly bordaCartao: "#E2E8F0";
    readonly tenue: "#94A3B8";
    readonly divisor: "#F1F5F9";
};
export declare const FONT_TITULO = "'Space Grotesk', Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif";
export declare const FONT_CORPO = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif";
export declare const ESCALA: {
    readonly xs: 13;
    readonly sm: 15;
    readonly base: 16;
    readonly md: 18;
    readonly lg: 21;
    readonly xl: 24;
};
export declare const GRADIENTE: {
    readonly marca: "linear-gradient(135deg,#6366F1 0%,#8B5CF6 50%,#EC4899 100%)";
    readonly estatisticas: "linear-gradient(135deg,#10B981 0%,#059669 100%)";
    readonly podcast: "linear-gradient(135deg,#EF4444 0%,#F97316 100%)";
    readonly livro: "linear-gradient(135deg,#F97316 0%,#C2410C 100%)";
    readonly curso: "linear-gradient(135deg,#6366F1 0%,#4338CA 100%)";
};
export interface CategoriaDef {
    id: string;
    nome: string;
    emoji: string;
    accent: string;
}
export declare const CATEGORIAS: CategoriaDef[];
