// Rótulos do workflow Revista — módulo client-safe (usado pelo cabeçalho).
// A avaliação vive em `prontidao.server.ts`; aqui só existe vocabulário.

export type EstadoWorkflow =
  | "a_validar"
  | "pronta_para_enviar"
  | "a_preparar"
  | "a_enviar"
  | "envio_parcial"
  | "enviada"
  | "erro";

const ROTULO_WORKFLOW: Record<EstadoWorkflow, string> = {
  a_validar: "A validar",
  pronta_para_enviar: "Pronta para enviar",
  a_preparar: "A preparar edição",
  a_enviar: "A enviar",
  envio_parcial: "Envio parcial",
  enviada: "Enviada",
  erro: "Erro",
};

export function rotuloWorkflow(e: EstadoWorkflow | string): string {
  return ROTULO_WORKFLOW[e as EstadoWorkflow] ?? "A validar";
}

/** Acções concretas oferecidas por cada linha bloqueada da prontidão. */
const ROTULO_ACCAO: Record<string, string> = {
  publicar_cronica: "Publicar a crónica",
  actualizar_cronica: "Actualizar a crónica",
  repetir_cronica: "Repetir a publicação da crónica",
  corrigir_url_cronica: "Corrigir o endereço da crónica",
  corrigir_editorial: "Corrigir o conteúdo editorial",
  definir_assunto: "Definir o assunto do email",
  escolher_listas: "Escolher listas",
  gerar_brief: "Gerar Brief",
  rever_leitura: "Rever leitura",
  reformular_brief: "Reformular",
  reverificar_brief: "Voltar a verificar",
  corrigir_fonte: "Corrigir fonte",
};

export function rotuloAccaoProntidao(a?: string): string | null {
  return a ? ROTULO_ACCAO[a] ?? null : null;
}

/** Linha da prontidão, na forma mínima que a interface precisa de classificar. */
export interface LinhaProntidao {
  estado: string;
  mensagem: string;
  severidade?: "bloqueio" | "aviso";
}

/** Pontos que travam mesmo o envio — não há «enviar mesmo assim». */
export function bloqueiosRigidosDe(areas: LinhaProntidao[]): string[] {
  return areas.filter((a) => a.estado === "bloqueada" && a.severidade === "bloqueio").map((a) => a.mensagem);
}

/** Pontos por resolver que quem envia pode confirmar e seguir. */
export function avisosConfirmaveisDe(areas: LinhaProntidao[]): string[] {
  return areas.filter((a) => a.estado === "bloqueada" && a.severidade !== "bloqueio").map((a) => a.mensagem);
}
