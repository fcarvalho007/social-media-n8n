export type FonteDirectorio = {
    id: string;
    nome: string;
    url_listagem: string | null;
    url_feed: string;
    activa: boolean;
    ultima_recolha: string | null;
    criada_em: string;
};
export type CuradoriaFerramentasConfig = {
    dia_semana: number;
    hora: number;
    max_por_corrida: number;
    activo: boolean;
    actualizado_em: string;
};
export type ResumoCorridaFerramentas = {
    ok: boolean;
    inseridas: number;
    descartadas_por_ia: number;
    candidatos: number;
    fontes: number;
    custo_usd: number;
    mensagem?: string;
};
/** Chama o hook público em process — mesma origem, portanto seguro. */
export declare const correrCuradoriaFerramentasAgora: import("../_shim/start.ts").NlServerFn<{
    forcarFontes?: string[];
} | undefined, ResumoCorridaFerramentas>;
export declare const listarFontesDirectorios: import("../_shim/start.ts").NlServerFn<void, FonteDirectorio[]>;
export declare const criarFonteDirectorio: import("../_shim/start.ts").NlServerFn<{
    nome: string;
    url_listagem: string;
}, {
    ok: true;
}>;
export declare const actualizarFonteDirectorio: import("../_shim/start.ts").NlServerFn<{
    id: string;
    activa?: boolean;
    url_listagem?: string;
    nome?: string;
}, {
    ok: true;
}>;
export declare const apagarFonteDirectorio: import("../_shim/start.ts").NlServerFn<{
    id: string;
}, {
    ok: true;
}>;
export declare const getConfigCuradoriaFerramentas: import("../_shim/start.ts").NlServerFn<void, CuradoriaFerramentasConfig>;
export declare const setConfigCuradoriaFerramentas: import("../_shim/start.ts").NlServerFn<{
    dia_semana?: number;
    hora?: number;
    max_por_corrida?: number;
    activo?: boolean;
}, {
    ok: true;
}>;
/** Activa/desactiva vários directórios de uma vez. */
export declare const alternarDirectoriosEmLote: import("../_shim/start.ts").NlServerFn<{
    ids: string[];
    activa: boolean;
}, {
    ok: true;
    afectadas: number;
}>;
