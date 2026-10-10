export declare function extrairResumo(html: string, palavras?: number): string;
export interface HtmlWordpress {
    html: string;
    resumoTexto: string;
    tituloLesson: string;
}
export declare function gerarHtmlWordpress(edicaoId: string): Promise<HtmlWordpress>;
