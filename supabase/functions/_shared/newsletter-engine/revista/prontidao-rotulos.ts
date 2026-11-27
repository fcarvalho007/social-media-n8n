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
  chave?: string;
  estado: string;
  mensagem: string;
  severidade?: "bloqueio" | "aviso";
  itens?: Array<{ noticiaId: string; titulo: string; motivo: string; accao?: string }>;
}

/** Áreas dos Briefs: bloqueiam, mas quem envia pode confirmar «enviar mesmo assim». */
const CHAVES_FORCAVEIS = new Set(["briefs", "leituras", "factualidade", "fontes"]);

/** Separa bloqueios rígidos em ultrapassáveis (Briefs) e fixos (o resto). */
export function separarRigidos(areas: LinhaProntidao[]): { forcaveis: string[]; fixos: string[] } {
  const rig = areas.filter((a) => a.estado === "bloqueada" && a.severidade === "bloqueio");
  return {
    forcaveis: rig.filter((a) => CHAVES_FORCAVEIS.has(a.chave ?? "")).map((a) => a.mensagem),
    fixos: rig.filter((a) => !CHAVES_FORCAVEIS.has(a.chave ?? "")).map((a) => a.mensagem),
  };
}

export interface GrupoPendentes {
  noticiaId: string;
  titulo: string;
  pontos: Array<{ motivo: string; accao?: string }>;
}

/** Junta os pontos por resolver de todas as áreas por notícia, sem repetir motivos. */
export function pendentesPorNoticia(areas: LinhaProntidao[]): GrupoPendentes[] {
  const grupos = new Map<string, GrupoPendentes>();
  for (const a of areas) {
    if (a.estado !== "bloqueada") continue;
    for (const it of a.itens ?? []) {
      const k = it.noticiaId || it.titulo;
      const g = grupos.get(k) ?? { noticiaId: it.noticiaId, titulo: it.titulo, pontos: [] };
      if (!g.pontos.some((p) => p.motivo === it.motivo)) g.pontos.push({ motivo: it.motivo, accao: it.accao });
      grupos.set(k, g);
    }
  }
  return [...grupos.values()];
}

/** Pontos que travam mesmo o envio — não há «enviar mesmo assim». */
export function bloqueiosRigidosDe(areas: LinhaProntidao[]): string[] {
  return areas.filter((a) => a.estado === "bloqueada" && a.severidade === "bloqueio").map((a) => a.mensagem);
}

/** Pontos por resolver que quem envia pode confirmar e seguir. */
export function avisosConfirmaveisDe(areas: LinhaProntidao[]): string[] {
  return areas.filter((a) => a.estado === "bloqueada" && a.severidade !== "bloqueio").map((a) => a.mensagem);
}
