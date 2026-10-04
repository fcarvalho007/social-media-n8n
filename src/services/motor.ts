import { supabase } from "@/integrations/supabase/client";
import { tratarSessaoRecusada } from "@/lib/sessaoRecusada";
import type { DocumentoGrafico, Variante } from "../../supabase/functions/_shared/documento-grafico/nucleo";
import type { PropostaEditorial } from "../../supabase/functions/_shared/motor/proposta";
import type { LinkFalhado, LinkLido, MetaFonte } from "../../supabase/functions/_shared/motor/fontes";
import type { Asset } from "../../supabase/functions/_shared/documento-grafico/nucleo";

export type EstadoTrabalho = "pendente" | "a_processar" | "concluido" | "erro" | "desconhecido" | "cancelado";

export interface TrabalhoResumo {
  id: string; project_id: string; estado: EstadoTrabalho; etapa: string; erro: string | null; modelo: string;
  criado_em: string; actualizado_em: string; titulo: string | null; prova?: boolean;
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
  let q = supabase.from("mc_trabalhos").select("id, project_id, estado, etapa, erro, modelo, prova, criado_em, actualizado_em, brief, mc_fontes(titulo)")
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
  fonte_tipo?: "texto" | "link" | "pdf"; metadados?: MetaFonte;
  project_id: string; texto: string; titulo: string; objetivo: string; tom: string; slides: number; modo?: "estruturacao" | "demonstracao" | "ia"; nova?: boolean;
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
export const PRAZO_GRAVACAO_MS = 20_000;

export async function gravarEdicao(args: {
  proposta_id: string; proposta_versao: number; conteudo: PropostaEditorial | null;
  documentos: Partial<Record<Variante, { versao_esperada: number; documento: DocumentoGrafico }>>;
}): Promise<{ proposta_versao: number; documentos: Partial<Record<Variante, number>> }> {
  // Finite deadline: a save never leaves the UI waiting forever.
  const ctl = new AbortController();
  const prazo = setTimeout(() => ctl.abort(), PRAZO_GRAVACAO_MS);
  let res;
  try {
    res = await supabase.rpc("mc_gravar_edicao", {
      _proposta_id: args.proposta_id, _proposta_versao: args.proposta_versao,
      _conteudo: (args.conteudo ?? null) as never, _documentos: args.documentos as never,
    }).abortSignal(ctl.signal);
  } finally { clearTimeout(prazo); }
  const { data, error } = res;
  if (ctl.signal.aborted) throw new Error("O servidor não respondeu a tempo.");
  if (error) {
    if (error.code === "MC409" || error.code === "40001") throw new ConflitoVersao(error.message);
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

export interface OrcamentoIa { maxDia: number; maxTrabalho: number; usadosHoje: number }
/** Reads the project's AI call limits (0 = AI off) and today's real calls (Lisbon day). */
export async function lerOrcamento(projectId: string): Promise<OrcamentoIa> {
  const [{ data: o, error }, { data: u, error: eu }] = await Promise.all([
    supabase.from("mc_orcamentos").select("max_chamadas_dia, max_chamadas_trabalho").eq("project_id", projectId).maybeSingle(),
    supabase.rpc("mc_uso_hoje", { _project_id: projectId }),
  ]);
  if (error || eu) throw new Error("Não foi possível ler os limites da IA.");
  return { maxDia: o?.max_chamadas_dia ?? 0, maxTrabalho: Math.min(o?.max_chamadas_trabalho ?? 2, 2), usadosHoje: (u as number | null) ?? 0 };
}
export async function definirOrcamento(projectId: string, maxDia: number, maxTrabalho: number): Promise<void> {
  const { error } = await supabase.rpc("mc_definir_orcamento", { _project_id: projectId, _max_dia: maxDia, _max_trabalho: maxTrabalho });
  if (error) throw new Error(error.code === "42501" ? "Só o dono do projeto com papel de editor pode alterar os limites." : "Não foi possível gravar os limites.");
}
export const MODELO_IA_NOME = "GPT-6 Astra (OpenAI, via Lovable AI)";

export interface FicheiroExport { formato: "png" | "pdf" | "zip"; pagina: number | null; url: string; hash: string; bytes: number; nome: string }
export interface EstadoExportacao {
  exportacao: { id: string; estado: "pendente" | "a_processar" | "concluido" | "erro"; erro: string | null; erro_classe: string | null; paginas: number; progresso: { paginas_feitas?: number; total?: number }; concluido_em: string | null } | null;
  ficheiros: FicheiroExport[];
  rascunhos: { versao: number; draft_id: string; proposta_versao: number | null }[];
  versao_actual: number; aprovada_versao: number | null;
}
export const pedirExportacao = (documento_id: string, versao: number) => invocar<{ exportacao_id: string; estado: string }>({ acao: "exportar", documento_id, versao });
export const lerExportacao = (documento_id: string, versao: number) => invocar<EstadoExportacao>({ acao: "estado_exportacao", documento_id, versao });
export const prepararRascunho = (documento_id: string, versao: number, proposta_versao: number) =>
  invocar<{ draft_id: string; existente: boolean }>({ acao: "preparar_social", documento_id, versao, proposta_versao, revisto: true });

export interface Capa { documento: DocumentoGrafico; conteudo: PropostaEditorial }
/** Current cover data (variant A) for library thumbnails; exact current versions only. */
export async function lerCapas(trabalhoIds: string[]): Promise<Record<string, Capa>> {
  if (!trabalhoIds.length) return {};
  const { data: ps } = await supabase.from("mc_propostas").select("id, trabalho_id, versao_actual").in("trabalho_id", trabalhoIds);
  const props = (ps ?? []).filter((p) => p.versao_actual > 0);
  if (!props.length) return {};
  const { data: ds } = await supabase.from("mc_documentos").select("id, proposta_id, versao_actual").eq("variante", "A").in("proposta_id", props.map((p) => p.id));
  const docs = (ds ?? []).filter((d) => d.versao_actual > 0);
  if (!docs.length) return {};
  const [{ data: pvs }, { data: dvs }] = await Promise.all([
    supabase.from("mc_propostas_versoes").select("proposta_id, versao, conteudo").or(props.map((p) => `and(proposta_id.eq.${p.id},versao.eq.${p.versao_actual})`).join(",")),
    supabase.from("mc_documentos_versoes").select("documento_id, versao, documento").or(docs.map((d) => `and(documento_id.eq.${d.id},versao.eq.${d.versao_actual})`).join(",")),
  ]);
  const out: Record<string, Capa> = {};
  for (const p of props) {
    const d = docs.find((x) => x.proposta_id === p.id);
    const pv = pvs?.find((x) => x.proposta_id === p.id);
    const dv = d && dvs?.find((x) => x.documento_id === d.id);
    if (pv && dv) out[p.trabalho_id] = { documento: dv.documento as unknown as DocumentoGrafico, conteudo: pv.conteudo as unknown as PropostaEditorial };
  }
  return out;
}

// ---------- link / images ----------
export const lerLinkFonte = (project_id: string, url: string) => invocar<LinkLido | LinkFalhado>({ acao: "ler_link", project_id, url });

export interface ImagemBiblioteca { id: string; file_name: string; file_url: string; thumbnail_url: string | null; width: number | null; height: number | null; file_size: number | null; source: string | null; created_at: string }
export interface AssetMotor { id: string; media_id: string | null; nome: string | null; largura: number; altura: number; bytes: number; mime: string; criado_em: string }
export const listarImagens = (project_id: string) => invocar<{ biblioteca: ImagemBiblioteca[]; assets: AssetMotor[] }>({ acao: "listar_imagens", project_id });
export const registarImagem = (project_id: string, media_id: string) => invocar<{ asset: AssetMotor & { hash: string } }>({ acao: "registar_imagem", project_id, media_id });
/** Verified bytes of this project's assets; ids that failed (removed/expired/other project) come back in falhas. */
export async function lerAssets(project_id: string, ids: string[]): Promise<{ assets: Record<string, Asset>; falhas: string[] }> {
  if (!ids.length) return { assets: {}, falhas: [] };
  return invocar<{ assets: Record<string, Asset>; falhas: string[] }>({ acao: "ler_assets", project_id, ids });
}
