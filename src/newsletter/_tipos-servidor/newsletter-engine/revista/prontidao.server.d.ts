import { rotuloWorkflow, type EstadoWorkflow } from "./prontidao-rotulos.ts";
export { rotuloWorkflow };
export type { EstadoWorkflow };
export type EstadoArea = "pronta" | "nao_aplicavel" | "aviso" | "bloqueada";
export type AccaoProntidao = "publicar_cronica" | "actualizar_cronica" | "repetir_cronica" | "corrigir_url_cronica" | "corrigir_editorial" | "definir_assunto" | "escolher_listas" | "gerar_brief" | "rever_leitura" | "reformular_brief" | "reverificar_brief" | "corrigir_fonte";
export type ChaveArea = "cronica" | "web" | "editorial" | "briefs" | "leituras" | "factualidade" | "fontes" | "snapshot" | "email" | "egoi" | "backup";
export interface AreaProntidao {
    chave: ChaveArea;
    rotulo: string;
    estado: EstadoArea;
    mensagem: string;
    accao?: AccaoProntidao;
    /**
     * «bloqueio» impede mesmo o envio (não há «enviar mesmo assim»);
     * «aviso» é confirmável por quem envia. Só as áreas dos Briefs e o
     * endereço da edição web bloqueiam.
     */
    severidade?: "bloqueio" | "aviso";
}
export interface Prontidao {
    ok: boolean;
    /** Mensagens dos bloqueios críticos, pela ordem em que devem ser resolvidos. */
    bloqueios: string[];
    /** Subconjunto sem hipótese de confirmação: o envio não pode seguir. */
    bloqueiosRigidos: string[];
    areas: AreaProntidao[];
    estadoWorkflow: EstadoWorkflow;
    /** Verdadeiro quando a edição não é Revista (o Clássico não usa isto). */
    naoAplicavel: boolean;
}
/**
 * O CTA da crónica tem de apontar para o artigo público real.
 * Rejeita rascunhos, permalinks internos (`?p=`, `?page_id=`) e placeholders.
 */
export declare function urlCronicaPublica(url: string | null | undefined): {
    ok: boolean;
    motivo?: string;
};
export interface OpcoesProntidao {
    /** Listas E-goi escolhidas no modal (quando ainda não houve envio). */
    listaIds?: string[];
}
export declare function avaliarProntidao(edicaoId: string, opcoes?: OpcoesProntidao): Promise<Prontidao>;
/**
 * Estado global humano do workflow. Derivado — não substitui nem duplica os
 * estados por destino, que continuam a ser a fonte de verdade operacional.
 */
export declare function derivarEstadoWorkflow(i: {
    estadoEdicao: string;
    envioEmCurso: string | null;
    estadoEmail: string;
    snapshotBloqueado: boolean;
    ok: boolean;
}): EstadoWorkflow;
