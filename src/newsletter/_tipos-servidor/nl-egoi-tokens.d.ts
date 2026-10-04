export declare const PAGINA = 50;
/** Re-read window when resuming a finished list, so deletions that shift offsets never skip a contact. */
export declare const SOBREPOSICAO = 50;
export declare const MAX_TENTATIVAS_FALHA = 5;
export type ContactoEgoi = {
    id: string;
    email: string | null;
    valorCampo: string | null;
};
export type CampoEgoi = {
    field_id: string;
    name: string;
    format: string;
    type: string;
};
export interface ClienteEgoi {
    lerCampos(lista: string): Promise<CampoEgoi[]>;
    listar(lista: string, offset: number, limit: number, campo: number): Promise<{
        total: number | null;
        itens: ContactoEgoi[];
    }>;
    lerContacto(lista: string, id: string, campo: number): Promise<ContactoEgoi | null>;
    escrever(lista: string, id: string, campo: number, valor: string): Promise<{
        ok: boolean;
        status: number;
    }>;
}
export type Progresso = {
    egoi_lista_id: string;
    campo_id: number;
    estado: "por_iniciar" | "em_curso" | "concluida" | "campo_invalido";
    campo_validado: boolean;
    campo_meta: unknown;
    segredo_fp: string;
    offset_proximo: number;
    processados: number;
    actualizados: number;
    ja_correctos: number;
    ignorados: number;
    total_egoi: number | null;
    verificado_leitura: boolean;
    ultimo_erro: string | null;
    concluido_em: string | null;
};
export type Falha = {
    contact_id: string;
    motivo: string;
    tentativas: number;
};
export interface ArmazemProgresso {
    ler(lista: string, campo: number): Promise<Progresso | null>;
    /** Creates (or resets, when `recomecar`) the row; returns it. */
    iniciar(lista: string, campo: number, fp: string, recomecar: boolean): Promise<Progresso>;
    /** Acquires the per-list lease; null when another run holds it. */
    reservar(lista: string, campo: number, segundos: number): Promise<string | null>;
    /** Writes progress only while `token` still holds the lease (CAS); false otherwise. */
    guardar(token: string, p: Progresso): Promise<boolean>;
    libertar(lista: string, campo: number, token: string): Promise<void>;
    registarFalha(lista: string, campo: number, contactId: string, motivo: string): Promise<void>;
    resolverFalha(lista: string, campo: number, contactId: string): Promise<void>;
    falhasPendentes(lista: string, campo: number, limite: number): Promise<Falha[]>;
    contarFalhas(lista: string, campo: number): Promise<number>;
}
export type Deps = {
    egoi: ClienteEgoi;
    armazem: ArmazemProgresso;
    criarToken: (email: string) => string;
    agora?: () => number;
};
export type ResultadoLote = {
    lista: string;
    estado: Progresso["estado"] | "ocupada" | "segredo_mudou";
    offset: number;
    total: number | null;
    escritos: number;
    ja_correctos: number;
    falhas_novas: number;
    falhas_pendentes: number;
    terminou: boolean;
    erro?: string;
};
/** E-goi merge code for an extra field (helpdesk "Using merge codes": `!extra_field_X`). */
export declare function tagCampo(campo: number): string;
/**
 * Processes at most `limite` contacts of one list from the durable offset, page by page.
 * Never restarts from zero unless `recomecar`; failures are recorded per contact and the offset still advances.
 */
export declare function executarLote(deps: Deps, o: {
    lista: string;
    campo: number;
    fp: string;
    recomecar?: boolean;
    limite?: number;
    prazoMs?: number;
}): Promise<ResultadoLote>;
/** Retries recorded failures (by contact id) without touching the offset. */
export declare function repetirFalhas(deps: Deps, o: {
    lista: string;
    campo: number;
    fp: string;
    limite?: number;
}): Promise<{
    resolvidas: number;
    mantidas: number;
    erro: string;
} | {
    resolvidas: number;
    mantidas: number;
    erro?: undefined;
}>;
/** Pre-send gate: every real list must be fully synced, validated, failure-free and not grown since. */
export declare function verificarProntidao(deps: Pick<Deps, "egoi" | "armazem">, o: {
    listas: Array<{
        egoi_lista_id: string;
        nome: string;
    }>;
    campo: number;
    fp: string;
}): Promise<string[]>;
export declare function clienteEgoiHttp(apiKey: string, f?: typeof fetch): ClienteEgoi;
/** Fingerprint of the signing secret: a rotation invalidates previously written tokens. */
export declare function impressaoSegredo(segredo: string): Promise<string>;
