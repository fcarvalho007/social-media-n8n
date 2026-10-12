import type { FotoPexels } from "./pexels-tipos.ts";
export type { FotoPexels };
export declare function pesquisarPexels(termo: string, pagina?: number, porPagina?: number): Promise<{
    fotos: FotoPexels[];
    erro?: string;
}>;
