export type EstadoWorkflow = "a_validar" | "pronta_para_enviar" | "a_preparar" | "a_enviar" | "envio_parcial" | "enviada" | "erro";
export declare function rotuloWorkflow(e: EstadoWorkflow | string): string;
export declare function rotuloAccaoProntidao(a?: string): string | null;
/** Linha da prontidão, na forma mínima que a interface precisa de classificar. */
export interface LinhaProntidao {
    estado: string;
    mensagem: string;
    severidade?: "bloqueio" | "aviso";
}
/** Pontos que travam mesmo o envio — não há «enviar mesmo assim». */
export declare function bloqueiosRigidosDe(areas: LinhaProntidao[]): string[];
/** Pontos por resolver que quem envia pode confirmar e seguir. */
export declare function avisosConfirmaveisDe(areas: LinhaProntidao[]): string[];
