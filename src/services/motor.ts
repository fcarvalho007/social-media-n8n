import { supabase } from "@/integrations/supabase/client";
import { tratarSessaoRecusada } from "@/lib/sessaoRecusada";
import type { DocumentoGrafico, Variante } from "../../supabase/functions/_shared/documento-grafico/nucleo";
import type { PropostaEditorial } from "../../supabase/functions/_shared/motor/proposta";

export type EstadoTrabalho = "pendente" | "a_processar" | "concluido" | "erro" | "desconhecido" | "cancelado";

export interface TrabalhoResumo {
  id: string; project_id: string; estado: EstadoTrabalho; etapa: string; erro: string | null; modelo: string;
  criado_em: string; actualizado_em: string; titulo: string | null;
}

async function invocar<T>(body: object): Promise<T> {
  const { data, error } = await supabase.functions.invoke("mc-motor", { body });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    if (ctx instanceof Response && ctx.status === 401 && (await tratarSessaoRecusada())) throw new Error("A sessão terminou. Entra de novo.");
    const msg = ctx ? (await ctx.json().catch(() => null))?.error : null;
    throw new Error(msg ?? "Não foi possível contactar o servidor.");
  }
  return data as T;
}

export async function listarTrabalhos(projectId: string | null): Promise<TrabalhoResumo[]> {
  let q = supabase.from("mc_trabalhos").select("id, project_id, estado, etapa, erro, modelo, criado_em, actualizado_em, brief, mc_fontes(titulo)")
    .order("criado_em", { ascending: false }).limit(100);
  if (projectId) q = q.eq("project_id", projectId);
  const { data, error } = await q;
  if (error) throw new Error("Não foi possível ler os carrosséis.");
  return (data ?? []).map((r) => {
    const x = r as unknown as TrabalhoResumo & { brief: { titulo?: string | null }; mc_fontes: { titulo: string | null } | null };
    return { ...x, titulo: x.brief?.titulo ?? x.mc_fontes?.titulo ?? null };
  });
}

export interface NovoTrabalho {
  project_id: string; texto: string; titulo: string; objetivo: string; tom: string; slides: number; modo?: "estruturacao" | "demonstracao"; nova?: boolean;
}
export const criarTrabalho = (n: NovoTrabalho) => invocar<{ trabalho_id: string; reutilizado: boolean }>({ acao: "criar", ...n });
export const retomarTrabalho = (id: string) => invocar<{ retomado: boolean }>({ acao: "retomar", trabalho_id: id });
export const acordarFila = () => invocar<{ ok: boolean }>({ acao: "acordar" });

export interface DocAtual { id: string; variante: Variante; versao: number; proposta_versao: number; documento: DocumentoGrafico; aprovada_versao: number | null }
export interface TrabalhoCompleto {
  trabalho: TrabalhoResumo & { fonte_id: string; tentativas: number };
  fonte: { texto: string; titulo: string | null; hash: string; origem_url: string | null };
  etapas: { etapa: string; estado: string; criado_em: string }[];
  proposta: { id: string; versao: number; aprovada_versao: number | null; conteudo: PropostaEditorial | null };
  documentos: Partial<Record<Variante, DocAtual>>;
}

export async function abrirTrabalho(id: string): Promise<TrabalhoCompleto> {
  const { data: t, error } = await supabase.from("mc_trabalhos").select("*").eq("id", id).maybeSingle();
  if (error || !t) throw new Error("Carrossel inexistente ou sem acesso.");
  const [{ data: f }, { data: et }, { data: p }] = await Promise.all([
    supabase.from("mc_fontes").select("texto, titulo, hash, origem_url").eq("id", t.fonte_id).single(),
    supabase.from("mc_etapas").select("etapa, estado, criado_em").eq("trabalho_id", id).order("id"),
    supabase.from("mc_propostas").select("id, versao_actual, aprovada_versao").eq("trabalho_id", id).single(),
  ]);
  if (!f || !p) throw new Error("Carrossel incompleto.");
  let conteudo: PropostaEditorial | null = null;
  if (p.versao_actual > 0) {
    const { data: pv } = await supabase.from("mc_propostas_versoes").select("conteudo").eq("proposta_id", p.id).eq("versao", p.versao_actual).single();
    conteudo = (pv?.conteudo ?? null) as unknown as PropostaEditorial | null;
  }
  const documentos: Partial<Record<Variante, DocAtual>> = {};
  const { data: ds } = await supabase.from("mc_documentos").select("id, variante, versao_actual, aprovada_versao").eq("proposta_id", p.id);
  for (const d of ds ?? []) {
    if (d.versao_actual < 1) continue;
    const { data: dv } = await supabase.from("mc_documentos_versoes").select("documento, proposta_versao").eq("documento_id", d.id).eq("versao", d.versao_actual).single();
    if (dv) documentos[d.variante as Variante] = { id: d.id, variante: d.variante as Variante, versao: d.versao_actual, proposta_versao: dv.proposta_versao, documento: dv.documento as unknown as DocumentoGrafico, aprovada_versao: d.aprovada_versao };
  }
  return {
    trabalho: { ...(t as unknown as TrabalhoCompleto["trabalho"]), titulo: (t.brief as { titulo?: string | null })?.titulo ?? f.titulo },
    fonte: f, etapas: et ?? [], documentos,
    proposta: { id: p.id, versao: p.versao_actual, aprovada_versao: p.aprovada_versao, conteudo },
  };
}

export class ConflitoVersao extends Error {}

export async function gravarEdicao(args: {
  proposta_id: string; proposta_versao: number; conteudo: PropostaEditorial | null;
  documentos: Partial<Record<Variante, { versao_esperada: number; documento: DocumentoGrafico }>>;
}): Promise<{ proposta_versao: number; documentos: Partial<Record<Variante, number>> }> {
  const { data, error } = await supabase.rpc("mc_gravar_edicao", {
    _proposta_id: args.proposta_id, _proposta_versao: args.proposta_versao,
    _conteudo: (args.conteudo ?? null) as never, _documentos: args.documentos as never,
  });
  if (error) {
    if (error.code === "40001") throw new ConflitoVersao(error.message);
    if (error.code === "42501") throw new Error("Sem permissão para gravar neste projeto.");
    throw new Error("O servidor recusou a gravação.");
  }
  return data as unknown as { proposta_versao: number; documentos: Partial<Record<Variante, number>> };
}

export interface VersaoDoc { versao: number; proposta_versao: number; criado_em: string }
export async function listarVersoes(documentoId: string): Promise<VersaoDoc[]> {
  const { data } = await supabase.from("mc_documentos_versoes").select("versao, proposta_versao, criado_em").eq("documento_id", documentoId).order("versao", { ascending: false }).limit(50);
  return data ?? [];
}
export async function lerVersao(documentoId: string, versao: number, propostaId: string): Promise<{ documento: DocumentoGrafico; conteudo: PropostaEditorial }> {
  const { data: dv } = await supabase.from("mc_documentos_versoes").select("documento, proposta_versao").eq("documento_id", documentoId).eq("versao", versao).single();
  if (!dv) throw new Error("Versão inexistente.");
  const { data: pv } = await supabase.from("mc_propostas_versoes").select("conteudo").eq("proposta_id", propostaId).eq("versao", dv.proposta_versao).single();
  return { documento: dv.documento as unknown as DocumentoGrafico, conteudo: pv!.conteudo as unknown as PropostaEditorial };
}
