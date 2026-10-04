export interface EgoiConfig {
    apiKey: string;
}
interface EgoiErro {
    ok: false;
    status: number;
    mensagem: string;
    detalhe?: unknown;
    retriavel?: boolean;
}
interface OkCriacao {
    ok: true;
    campaign_hash: string;
}
interface OkVoid {
    ok: true;
}
/** POST /campaigns/email — cria os metadados e envia o HTML no mesmo pedido. Devolve o campaign_hash. */
export declare function criarCampanha(cfg: EgoiConfig, opts: {
    listaId: string;
    internalName: string;
    subject: string;
    senderId: string;
    html: string;
    plainText?: string;
}): Promise<OkCriacao | EgoiErro>;
/** PATCH /campaigns/email/{hash} — actualiza meta e/ou conteúdo num único pedido. */
export declare function patchCampanha(cfg: EgoiConfig, hash: string, opts: {
    internalName?: string;
    subject?: string;
    senderId?: string;
    html?: string;
    plainText?: string;
}): Promise<OkVoid | EgoiErro>;
/**
 * POST /campaigns/email/{hash}/actions/send — dispara.
 * Sem repetição automática: um 5xx pode significar que o disparo já seguiu,
 * e repetir arriscaria enviar duas vezes para os mesmos contactos.
 */
export declare function disparaCampanha(cfg: EgoiConfig, hash: string, listaId: string): Promise<OkVoid | EgoiErro>;
/**
 * GET /campaigns/email/{hash} — lê o estado real da campanha na E-goi.
 * Serve de fonte da verdade quando um disparo não devolveu resposta fiável.
 */
export declare function estadoCampanha(cfg: EgoiConfig, hash: string): Promise<{
    ok: true;
    estado: "enviada" | "a_enviar" | "rascunho" | "desconhecido";
    bruto: string;
} | EgoiErro>;
export {};
