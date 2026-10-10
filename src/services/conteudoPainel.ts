import { supabase } from "@/integrations/supabase/client";
import type { PendingItem } from "@/hooks/usePendingContent";

type TabelaConteudo = "posts_drafts" | "posts" | "stories";

export interface AlvoEliminacaoPainel {
  tabela: TabelaConteudo;
  nome: string;
  limpaAgendamento: boolean;
}

export function alvoEliminacaoPainel(tipo: PendingItem["type"]): AlvoEliminacaoPainel {
  if (tipo === "draft") return { tabela: "posts_drafts", nome: "rascunho", limpaAgendamento: false };
  if (tipo === "story") return { tabela: "stories", nome: "story", limpaAgendamento: false };
  if (tipo === "scheduled") return { tabela: "posts", nome: "publicação agendada", limpaAgendamento: true };
  return { tabela: "posts", nome: tipo === "carousel" ? "carrossel" : "publicação", limpaAgendamento: false };
}

export async function eliminarConteudoPainel(item: Pick<PendingItem, "id" | "type">): Promise<void> {
  const alvo = alvoEliminacaoPainel(item.type);
  const { data, error } = await supabase.from(alvo.tabela).delete().eq("id", item.id).select("id");

  if (error) throw error;
  if (!data?.length) throw new Error("sem-permissao");

  if (alvo.limpaAgendamento) {
    const { error: erroAgendamento } = await supabase.from("scheduled_jobs").delete().eq("post_id", item.id);
    if (erroAgendamento) console.warn("Não foi possível limpar o trabalho de agendamento já sem publicação.", erroAgendamento);
  }

  localStorage.removeItem("calendar_events_cache");
  localStorage.removeItem("calendar_last_updated");
}