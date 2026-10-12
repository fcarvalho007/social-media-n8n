import type { EdicaoRevista } from "./compose.server.ts";
export declare function esc(s: string): string;
export declare function fmtDataLonga(iso: string | null | undefined): string;
/** Data curta em caixa alta: «19 AGO 2026». */
export declare function fmtDataCurta(iso: string | null | undefined): string;
/**
 * Marca de origem nos links de Brief enviados por email. O email não executa
 * código, por isso a contagem depende desta marca no endereço.
 */
export declare function urlBriefEmail(url: string): string;
/** Parágrafos a partir de texto simples com quebras de linha. */
export declare function paragrafos(txt: string): string[];
export declare function montarHtmlRevista(e: EdicaoRevista): string;
