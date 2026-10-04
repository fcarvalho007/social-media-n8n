export declare const AMBITOS_RECOMECO: readonly ["noticias", "cronica", "blocos", "assunto", "briefs"];
export type AmbitoRecomeco = (typeof AMBITOS_RECOMECO)[number];
export declare const recomecarEdicaoFn: import("../_shim/start.ts").NlServerFn<unknown, {
    ok: boolean;
    numero: any;
}>;
