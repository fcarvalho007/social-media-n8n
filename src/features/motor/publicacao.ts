// Publication state of a carousel for the library. Pure: "publicado" only from a real publication
// (external reference per network) tied to the CURRENT version via posts.ai_metadata.motor. Exported,
// prepared, scheduled, names or dates never count as published.
import type { EstadoTrabalho } from "@/services/motor";

export type Rede = string;
export type EstadoRede = "publicado" | "agendado" | "erro" | "a_publicar";
export type EstadoConteudo = "a_preparar" | "rascunho" | "revisao" | "aprovado" | "preparado" | "agendado" | "erro" | "parcial" | "por_confirmar" | "publicado";

export interface DocResumo { id: string; variante: "A" | "B"; versao_actual: number; aprovada_versao: number | null }
export interface LigacaoResumo { documento_id: string; documento_versao: number; draft_id: string | null; draft_previsto: string | null }
export interface MotorMeta { trabalho_id: string; documento_id?: string; variante?: "A" | "B"; versao?: number; redes?: string[] }
export interface DraftResumo { id: string; status: string | null; trabalho_id: string | null }
export interface PostResumo {
  id: string; status: string | null; selected_networks: string[] | null; external_post_ids: Record<string, string> | null;
  scheduled_date: string | null; motor: MotorMeta | null; redesFalhadas: string[];
}

export interface EstadoPublicacao {
  grupo: "por_publicar" | "publicados";
  estado: EstadoConteudo;
  redes: Array<{ rede: Rede; estado: EstadoRede }>;
  versaoAtual: number | null;
  nota: string | null;
}

export const NOME_ESTADO_CONTEUDO: Record<EstadoConteudo, string> = {
  a_preparar: "A preparar", rascunho: "Rascunho", revisao: "Em revisão", aprovado: "Aprovado", preparado: "Preparado para publicar",
  agendado: "Agendado", erro: "Erro", parcial: "Publicado em parte", por_confirmar: "Publicação por confirmar", publicado: "Publicado",
};
export const NOME_REDE: Record<string, string> = { instagram: "Instagram", linkedin: "LinkedIn", facebook: "Facebook", tiktok: "TikTok", youtube: "YouTube" };
export const NOME_ESTADO_REDE: Record<EstadoRede, string> = { publicado: "publicado", agendado: "agendado", erro: "erro", a_publicar: "a publicar" };

const futuro = (d: string | null, agora: number) => !!d && new Date(d).getTime() > agora;

function estadoRede(p: PostResumo, rede: Rede, agora: number): EstadoRede {
  if (p.external_post_ids?.[rede]) return "publicado";
  if (p.redesFalhadas.includes(rede) || p.status === "failed" || p.status === "rejected") return "erro";
  if (futuro(p.scheduled_date, agora) && p.status !== "published") return "agendado";
  return "a_publicar";
}

export function estadoPublicacao(a: {
  trabalho: { id: string; estado: EstadoTrabalho };
  docs: DocResumo[]; ligacoes: LigacaoResumo[]; drafts: DraftResumo[]; posts: PostResumo[]; agora?: number;
}): EstadoPublicacao {
  const agora = a.agora ?? Date.now();
  const versao = (v?: "A" | "B") => a.docs.find((d) => d.variante === v)?.versao_actual ?? null;
  const versaoAtual = a.docs.length ? Math.max(...a.docs.map((d) => d.versao_actual)) : null;
  const meus = a.posts.filter((p) => p.motor?.trabalho_id === a.trabalho.id);
  const atuais = meus.filter((p) => p.motor?.versao != null && p.motor.versao === versao(p.motor.variante));
  const antigosPublicados = meus.filter((p) => !atuais.includes(p) && Object.keys(p.external_post_ids ?? {}).length > 0);
  const notaAntiga = antigosPublicados.length
    ? `Versão ${Math.max(...antigosPublicados.map((p) => p.motor?.versao ?? 0))} publicada; a versão atual ainda não.`
    : null;

  if (atuais.length) {
    const porRede = new Map<Rede, EstadoRede>();
    const ordem: EstadoRede[] = ["a_publicar", "erro", "agendado", "publicado"]; // best evidence wins per network
    for (const p of atuais) {
      const previstas = p.motor?.redes?.length ? p.motor.redes : p.selected_networks ?? [];
      for (const r of previstas) {
        const e = estadoRede(p, r, agora);
        const atual = porRede.get(r);
        if (!atual || ordem.indexOf(e) > ordem.indexOf(atual)) porRede.set(r, e);
      }
    }
    const redes = [...porRede].map(([rede, estado]) => ({ rede, estado }));
    const n = (e: EstadoRede) => redes.filter((r) => r.estado === e).length;
    if (redes.length && n("publicado") === redes.length) return { grupo: "publicados", estado: "publicado", redes, versaoAtual, nota: null };
    const estado: EstadoConteudo = n("publicado") > 0 ? "parcial" : n("erro") > 0 ? "erro" : n("agendado") > 0 ? "agendado" : "preparado";
    return { grupo: "por_publicar", estado, redes, versaoAtual, nota: notaAntiga };
  }

  const base = { grupo: "por_publicar" as const, redes: [], versaoAtual, nota: notaAntiga };
  if (a.drafts.some((d) => d.trabalho_id === a.trabalho.id)) return { ...base, estado: "preparado" };
  // A draft was reserved for this work but no longer exists and no publication proves what happened.
  const docIds = new Set(a.docs.map((d) => d.id));
  if (a.ligacoes.some((l) => docIds.has(l.documento_id) && !!l.draft_previsto && !l.draft_id)) return { ...base, estado: "por_confirmar" };
  if (a.trabalho.estado === "erro" || a.trabalho.estado === "desconhecido") return { ...base, estado: "erro" };
  if (a.trabalho.estado === "pendente" || a.trabalho.estado === "a_processar") return { ...base, estado: "a_preparar" };
  if (!a.docs.length) return { ...base, estado: "rascunho" };
  if (a.docs.some((d) => d.aprovada_versao != null && d.aprovada_versao === d.versao_actual)) return { ...base, estado: "aprovado" };
  return { ...base, estado: "revisao" };
}
