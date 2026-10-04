export type TipoBloco = "destaque" | "breve" | "ferramenta_bullet" | "link_roundup" | "patrocinio" | "tutorial" | "meta";
export type BlocoSegmentado = {
    tipo: TipoBloco;
    titulo: string | null;
    corpo: string;
    html: string;
    url: string | null;
    contexto_seccao: string | null;
};
export declare function segmentar(html: string | null): BlocoSegmentado[];
export declare function priorizar(blocos: BlocoSegmentado[]): BlocoSegmentado[];
