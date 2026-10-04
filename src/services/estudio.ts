import { supabase } from "@/integrations/supabase/client";

// Data-access layer for the Content Studio (newsletter, articles, import).
const db = supabase as unknown as { from: (t: string) => any; rpc: (f: string, a?: object) => any }; // nl_* tables not yet in generated types

export interface Edicao { id: string; numero: number; assunto: string | null; estado: string; data_envio_prevista: string | null; enviada_em: string | null }
export interface Cronica { id: string; edicao_id: string; titulo: string | null; conteudo: string | null }
export interface Artigo { id: string; project_id: string | null; titulo: string; resumo: string | null; corpo: string | null; estado: string; updated_at: string }
export interface Projeto { id: string; name: string; color: string | null }

const MARCA_KEY = "estudio:marca";
export const getMarca = () => localStorage.getItem(MARCA_KEY);
export const setMarca = (id: string) => localStorage.setItem(MARCA_KEY, id);

export async function listarProjetos(): Promise<Projeto[]> {
  const { data, error } = await supabase.from("projects").select("id,name,color").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function listarEdicoes(): Promise<Edicao[]> {
  const { data, error } = await db.from("nl_edicoes").select("id,numero,assunto,estado,data_envio_prevista,enviada_em").order("numero", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function obterEdicao(id: string): Promise<{ edicao: Edicao; cronica: Cronica | null }> {
  const { data: edicao, error } = await db.from("nl_edicoes").select("id,numero,assunto,estado,data_envio_prevista,enviada_em").eq("id", id).single();
  if (error) throw error;
  const { data: cronica } = await db.from("nl_cronicas").select("id,edicao_id,titulo,conteudo").eq("edicao_id", id).maybeSingle();
  return { edicao, cronica: cronica ?? null };
}

export async function guardarEdicao(id: string, assunto: string, cronica: { id?: string; titulo: string; conteudo: string }) {
  const r1 = await db.from("nl_edicoes").update({ assunto }).eq("id", id);
  if (r1.error) throw r1.error;
  const r2 = cronica.id
    ? await db.from("nl_cronicas").update({ titulo: cronica.titulo, conteudo: cronica.conteudo }).eq("id", cronica.id)
    : await db.from("nl_cronicas").insert({ edicao_id: id, titulo: cronica.titulo, conteudo: cronica.conteudo });
  if (r2.error) throw r2.error;
}

export async function listarArtigos(projectId: string | null): Promise<Artigo[]> {
  let q = db.from("art_rascunhos").select("*").order("updated_at", { ascending: false });
  if (projectId) q = q.eq("project_id", projectId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function guardarArtigo(a: Partial<Artigo> & { titulo: string }) {
  const { error } = a.id
    ? await db.from("art_rascunhos").update({ titulo: a.titulo, resumo: a.resumo, corpo: a.corpo }).eq("id", a.id)
    : await db.from("art_rascunhos").insert({ titulo: a.titulo, resumo: a.resumo, corpo: a.corpo, project_id: a.project_id, estado: "rascunho" });
  if (error) throw error;
}

export async function apagarArtigo(id: string) {
  const { error } = await db.from("art_rascunhos").delete().eq("id", id);
  if (error) throw error;
}

// ---- Import ----
export async function souAdminNewsletter(): Promise<boolean> {
  const { data } = await db.rpc("nl_is_admin");
  return !!data;
}

async function sha256Hex(buf: ArrayBuffer) {
  const h = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function enviarPacote(file: File): Promise<string> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Sessão em falta");
  const hash = await sha256Hex(await file.arrayBuffer());
  const path = `${u.user.id}/${hash}.json`;
  const { error } = await supabase.storage.from("nl-import-staging").upload(path, file, { upsert: true, contentType: "application/json" });
  if (error) throw error;
  return path;
}

const invocar = <T,>(body: object) => invocarFn<T>("nl-import", body);

async function invocarFn<T>(fn: string, body: object): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    const msg = ctx ? (await ctx.json().catch(() => null))?.error : null;
    throw new Error(msg ?? error.message);
  }
  return data as T;
}

export interface Simulacao {
  run_id: string; erros: string[]; avisos: string[]; ficheiros: number; conflitos: Record<string, number>;
  tabelas: { nome: string; registos: number; hash_ok: boolean; existentes: number }[];
}
export const simularImportacao = (staging_path: string) => invocar<Simulacao>({ acao: "simular", staging_path });
export const passoImportacao = (run_id: string) =>
  invocar<{ concluido: boolean; relatorio?: Record<string, unknown>; progresso?: { indice: number; fase: string }; total_tabelas?: number }>({ acao: "importar", run_id });

export async function previewEdicao(edicao_id: string): Promise<{ versao: string; html: string; problemas: string[] }> {
  return invocarFn("nl-newsletter", { acao: "preview", edicao_id });
}

export interface MapeamentoPerfil { source_user_id: string; source_nome: string | null; source_papel: string | null; target_user_id: string | null; historico: unknown[] }
export interface ContaEstudio { id: string; email: string | null; full_name: string | null }

export async function listarMapeamentos(): Promise<MapeamentoPerfil[]> {
  const { data, error } = await db.from("nl_user_mapping").select("source_user_id,source_nome,source_papel,target_user_id,historico").order("created_at");
  if (error) throw error;
  return data ?? [];
}
export async function listarContasEstudio(): Promise<ContaEstudio[]> {
  const { data, error } = await supabase.from("profiles").select("id,email,full_name").order("email");
  if (error) throw error;
  return data ?? [];
}
/** Manual admin mapping only; never creates or changes roles. */
export async function mapearPerfil(source: string, target: string | null) {
  const { error } = await db.rpc("nl_mapear_perfil", { _source: source, _target: target });
  if (error) throw error;
}
