declare const EVENTOS: readonly ["brief_open_from_email", "edition_brief_click", "brief_source_click", "brief_related_click", "brief_commercial_cta"];
export type EventoBrief = (typeof EVENTOS)[number];
interface EntradaEvento {
    evento: string;
    slug: string;
    edicaoNumero?: number | null;
}
export declare const registarEventoBriefFn: import("../_shim/start.ts").NlServerFn<EntradaEvento, {
    ok: boolean;
}>;
export {};
