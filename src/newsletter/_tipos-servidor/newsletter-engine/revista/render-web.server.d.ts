import type { EdicaoRevista } from "./compose.server.ts";
export interface HtmlRevistaWeb {
    html: string;
    resumoTexto: string;
    tituloLesson: string;
}
export declare function montarHtmlRevistaWeb(e: EdicaoRevista): HtmlRevistaWeb;
