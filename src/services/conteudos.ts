import { supabase } from "@/integrations/supabase/client";
import { tratarSessaoRecusada } from "@/lib/sessaoRecusada";
import type { Carrossel, FonteCronica } from "../../supabase/functions/_shared/conteudos/carrossel";

export type { Carrossel, FonteCronica, Slide } from "../../supabase/functions/_shared/conteudos/carrossel";
export { DIMENSOES, LIMITES, legendaComLink, validarCarrossel } from "../../supabase/functions/_shared/conteudos/carrossel";

async function chamar<T>(body: object): Promise<T> {
  const { data, error } = await supabase.functions.invoke("nl-conteudos", { body });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    if (ctx instanceof Response && ctx.status === 401 && (await tratarSessaoRecusada())) {
      throw new Error("A sessão terminou. Entra de novo.");
    }
    const msg = ctx && typeof (ctx as { json?: unknown }).json === "function" ? (await ctx.json().catch(() => null))?.error : null;
    throw new Error(typeof msg === "string" && msg ? msg : "Não foi possível contactar o servidor. Tenta de novo.");
  }
  return data as T;
}

export interface JobResumo {
  id: string; edicao_id: string; conteudo_id: string; estado: string; origem: string; erro: string | null;
  tentativas: number; max_tentativas: number; proxima_tentativa_em: string; confirmado_em: string | null; created_at: string;
}
export interface ConteudoResumo {
  id: string; edicao_id: string; titulo: string; origem: string; numero: string; fonte_aceite_em: string | null;
  versao: number; social_draft_id: string | null; social_enviado_em: string | null; actualizado_em: string;
}
export interface EdicaoEnviada { id: string; numero: number; assunto: string | null; enviada_em: string | null }
export interface ConteudoCompleto {
  conteudo: { id: string; edicao_id: string; fonte: FonteCronica; fonte_aceite_em: string | null; carrossel: Carrossel | null; versao: number; social_draft_id: string | null; actualizado_em: string };
  versoes: { versao: number; origem: string; criado_em: string }[];
  job: Pick<JobResumo, "id" | "estado" | "erro" | "tentativas" | "max_tentativas" | "proxima_tentativa_em"> | null;
}

export interface Listagem {
  conteudos: ConteudoResumo[]; jobs: JobResumo[]; edicoes: EdicaoEnviada[];
  sem_identidade: boolean; credenciais: { deepseek: boolean; egoi: boolean };
}
export const listarConteudos = (project_id: string | null = null) => chamar<Listagem>({ acao: "listar", project_id });

/** Distinguishes confirmed new sends from historical/manual preparation. */
export const ORIGENS_JOB: Record<string, string> = {
  envio: "Novo envio confirmado",
  reconciliacao: "Novo envio confirmado",
  manual: "Histórico · preparado à mão",
};
export const obterConteudo = (conteudo_id: string) => chamar<ConteudoCompleto>({ acao: "obter", conteudo_id });
export const prepararCarrossel = (edicao_id: string) => chamar<{ conteudo_id: string }>({ acao: "preparar", edicao_id });
export const aceitarFonte = (conteudo_id: string) => chamar<{ ok: true }>({ acao: "aceitar_fonte", conteudo_id });
export const processarFila = () => chamar<{ processados: number; enfileiradas: number }>({ acao: "processar" });
export const retomarJob = (job_id: string) => chamar<{ processados: number }>({ acao: "retomar", job_id });
export const gerarNovaProposta = (conteudo_id: string) => chamar<{ carrossel: Carrossel }>({ acao: "gerar", conteudo_id });
export const guardarCarrossel = (conteudo_id: string, versao: number, carrossel: Carrossel, origem: "edicao" | "ia_manual") =>
  chamar<{ versao: number; actualizado_em: string }>({ acao: "guardar", conteudo_id, versao, carrossel, origem });

/** Uploads PNGs + PDF into the user's folder of the existing social bucket, then creates the native social draft. */
export async function enviarParaEstudioSocial(
  conteudoId: string, versao: number, numero: number, pngs: Blob[], pdf: Blob, substituir: boolean,
): Promise<{ draft_id: string; existente: boolean }> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Sessão em falta");
  const base = `${u.user.id}/estudio/carrossel-${numero}-v${versao}-${Date.now()}`;
  const enviar = async (blob: Blob, nome: string, tipo: string) => {
    const caminho = `${base}/${nome}`;
    const { error } = await supabase.storage.from("pdfs").upload(caminho, blob, { contentType: tipo, upsert: false });
    if (error) throw new Error(`Falha ao carregar ${nome}: ${error.message}`);
    return supabase.storage.from("pdfs").getPublicUrl(caminho).data.publicUrl;
  };
  const imagens: string[] = [];
  for (const [i, b] of pngs.entries()) imagens.push(await enviar(b, `slide-${String(i + 1).padStart(2, "0")}.png`, "image/png"));
  const pdf_url = await enviar(pdf, `digitalsprint-${numero}-cronica.pdf`, "application/pdf");
  return chamar({ acao: "enviar_social", conteudo_id: conteudoId, versao, imagens, pdf_url, substituir });
}

export const ESTADOS_JOB: Record<string, string> = {
  aguarda_confirmacao: "A aguardar confirmação de entrega (E-goi)",
  aguarda_revisao_fonte: "A aguardar revisão da fonte",
  pendente: "Na fila",
  aguarda_credencial: "A aguardar chave DeepSeek",
  a_processar: "A preparar proposta",
  concluido: "Proposta pronta",
  erro: "Erro",
  cancelado: "Cancelado",
};

/** R1 proof: server render of a synthetic DocumentoGrafico page (staff only, no writes). */
export interface RenderProva { png: string; bytes: number; ms_preparacao: number; ms_render: number }
export const renderProvaServidor = (pacote: unknown, variante: "A" | "B", pagina: number) =>
  chamar<RenderProva>({ acao: "render_prova", pacote, variante, pagina });
