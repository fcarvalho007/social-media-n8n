import { supabase } from "@/integrations/supabase/client";

// Data-access layer for the Content Studio (newsletter, articles, import).
const db = supabase as unknown as { from: (t: string) => any; rpc: (f: string, a?: object) => any }; // nl_* tables not yet in generated types

export interface Edicao { id: string; numero: number; assunto: string | null; estado: string; data_envio_prevista: string | null; enviada_em: string | null }
export interface Cronica { id: string; edicao_id: string; titulo: string | null; conteudo: string | null }
export interface Artigo { id: string; project_id: string | null; titulo: string; resumo: string | null; corpo: string | null; estado: string; updated_at: string }
export interface Projeto { id: string; name: string; color: string | null; logo_url?: string | null }

// "Para quem?" selection is stored per user in the backend (estudio_preferencias).
export async function getMarca(): Promise<string | null> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data, error } = await db.from("estudio_preferencias").select("project_id").eq("user_id", u.user.id).maybeSingle();
  // Propagate failures: a read error must never silently become "all projects".
  if (error) throw error;
  return (data?.project_id as string | null) ?? null;
}
export async function setMarca(projectId: string | null): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Sessão em falta");
  const { error } = await db.from("estudio_preferencias").upsert({ user_id: u.user.id, project_id: projectId, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export interface Identidade { id: string; chave: string; nome: string; tipo: string; project_id: string | null }
export async function listarIdentidades(): Promise<Identidade[]> {
  const { data, error } = await db.from("estudio_identidades").select("id,chave,nome,tipo,project_id").order("nome");
  if (error) throw error;
  return data ?? [];
}
/** Links an editorial identity (e.g. the DIGITALSPRINT newsletter) to a project. Staff only (RLS). */
export async function associarIdentidade(id: string, projectId: string | null): Promise<void> {
  const { error } = await db.from("estudio_identidades").update({ project_id: projectId, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function listarProjetos(): Promise<Projeto[]> {
  const { data, error } = await supabase.from("projects").select("id,name,color,logo_url").order("name");
  if (error) throw error;
  return data ?? [];
}

const TIPOS_LOGO = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];
/** Creates a brand (project) for the signed-in user; the optional logo goes to the user's public covers folder. */
export async function criarMarca(nome: string, cor: string, logo?: File | null): Promise<Projeto> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Sessão em falta");
  const n = nome.trim();
  if (n.length < 2 || n.length > 60) throw new Error("O nome deve ter entre 2 e 60 caracteres.");
  if (!/^#[0-9a-fA-F]{6}$/.test(cor)) throw new Error("Cor inválida.");
  let logo_url: string | null = null;
  if (logo) {
    if (!TIPOS_LOGO.includes(logo.type)) throw new Error("O logótipo deve ser PNG, JPG, SVG ou WebP.");
    if (logo.size > 5 * 1024 * 1024) throw new Error("O logótipo não pode exceder 5 MB.");
    const ext = logo.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
    const caminho = `${u.user.id}/marcas/${Date.now()}.${ext}`;
    const up = await supabase.storage.from("post-covers").upload(caminho, logo, { contentType: logo.type, upsert: false });
    if (up.error) throw up.error;
    logo_url = supabase.storage.from("post-covers").getPublicUrl(caminho).data.publicUrl;
  }
  const { data, error } = await supabase.from("projects").insert({ name: n, color: cor, icon: "🏷️", owner_id: u.user.id, logo_url }).select("id,name,color,logo_url").single();
  if (error) throw error;
  return data;
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

/** Saves a draft (never publishes). Returns the saved row so the editor keeps its id. */
export async function guardarArtigo(a: Partial<Artigo> & { titulo: string }): Promise<Artigo> {
  const campos = { titulo: a.titulo, resumo: a.resumo ?? null, corpo: a.corpo ?? null, project_id: a.project_id ?? null };
  const { data, error } = a.id
    ? await db.from("art_rascunhos").update(campos).eq("id", a.id).select("*").single()
    : await db.from("art_rascunhos").insert({ ...campos, estado: "rascunho" }).select("*").single();
  if (error) throw error;
  return data as Artigo;
}

export interface Continuidade {
  rascunhosSociais: number;
  ultimaEdicao: { numero: number; assunto: string | null; estado: string } | null;
  artigos: number;
  ultimoArtigo: { id: string; titulo: string; updated_at: string } | null;
}

/** Real counts for the Studio entry; filtered by project (newsletter via its identities). */
export async function resumoContinuidade(projectId: string | null, identidadeIds: string[]): Promise<Continuidade> {
  // Same filter as the drafts list (team drafts, by project), so the count matches what opens.
  let qd = supabase.from("posts_drafts").select("id", { count: "exact", head: true }).eq("status", "draft");
  if (projectId) qd = qd.eq("project_id", projectId);
  let qa = db.from("art_rascunhos").select("id,titulo,updated_at", { count: "exact" }).order("updated_at", { ascending: false }).limit(1);
  if (projectId) qa = qa.eq("project_id", projectId);
  const semNewsletter = projectId !== null && identidadeIds.length === 0;
  let qe = db.from("nl_edicoes").select("numero,assunto,estado").order("numero", { ascending: false }).limit(1);
  if (projectId) qe = qe.in("identidade_id", identidadeIds);
  const [d, a, e] = await Promise.all([qd, qa, semNewsletter ? Promise.resolve({ data: [], error: null }) : qe]);
  if (d.error) throw d.error;
  if (a.error) throw a.error;
  if (e.error) throw e.error;
  return {
    rascunhosSociais: d.count ?? 0,
    artigos: a.count ?? 0,
    ultimoArtigo: (a.data?.[0] as Continuidade["ultimoArtigo"]) ?? null,
    ultimaEdicao: (e.data?.[0] as Continuidade["ultimaEdicao"]) ?? null,
  };
}

export interface ImportRun { id: string; created_by: string | null; modo: string; estado: string; progresso: { indice?: number; fase?: string } | null; relatorio: Record<string, unknown> | null; manifesto: Record<string, unknown> | null; created_at: string; updated_at: string }
/** Latest import run of this admin, so an interrupted import can resume after reload. */
export async function ultimaImportacao(): Promise<ImportRun | null> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Sessão em falta");
  const { data, error } = await db.from("nl_import_runs").select("id,created_by,modo,estado,progresso,relatorio,manifesto,created_at,updated_at").eq("created_by", u.user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return (data as ImportRun | null) ?? null;
}

export async function apagarArtigo(id: string) {
  const { error } = await db.from("art_rascunhos").delete().eq("id", id);
  if (error) throw error;
}

// ---- Import ----
export async function souAdminNewsletter(): Promise<boolean> {
  const { data, error } = await db.rpc("nl_is_admin");
  if (error) throw error;
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
    const msg = ctx && typeof (ctx as { json?: unknown }).json === "function" ? (await ctx.json().catch(() => null))?.error : null;
    throw new Error(typeof msg === "string" && msg ? msg : "Não foi possível contactar o servidor. Tenta de novo.");
  }
  return data as T;
}

export interface Simulacao {
  run_id: string; erros: string[]; avisos: string[]; ficheiros: number; conflitos: Record<string, number>;
  tabelas: { nome: string; registos: number; hash_ok: boolean; existentes: number }[];
}
export const simularImportacao = (staging_path: string) => invocar<Simulacao>({ acao: "simular", staging_path });
export const verificarSimulacao = (run_id: string) =>
  invocar<{ valido: boolean; motivo?: string; simulacao?: Simulacao }>({ acao: "verificar_simulacao", run_id });
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

/** Brand default visual direction (only for NEW content; saved documents are never changed). */
export interface DirecaoPreferida { estilo: string; variante: "A" | "B"; paleta: string; tipografia?: { titulo: string; corpo: string } }
const chaveDirecao = (projectId: string | null | undefined) => projectId ?? "todos";
export async function lerDirecaoPreferida(projectId: string | null | undefined): Promise<DirecaoPreferida | null> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data, error } = await db.from("estudio_preferencias").select("direcao_visual").eq("user_id", u.user.id).maybeSingle();
  if (error) throw error;
  const v = (data?.direcao_visual as Record<string, unknown> | null)?.[chaveDirecao(projectId)];
  return v && typeof v === "object" ? (v as DirecaoPreferida) : null;
}
export async function guardarDirecaoPreferida(projectId: string | null | undefined, d: DirecaoPreferida): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Sessão em falta");
  const { data, error } = await db.from("estudio_preferencias").select("direcao_visual").eq("user_id", u.user.id).maybeSingle();
  if (error) throw error;
  const atual = (data?.direcao_visual as Record<string, unknown> | null) ?? {};
  const novo = { ...atual, [chaveDirecao(projectId)]: d };
  const r = data
    ? await db.from("estudio_preferencias").update({ direcao_visual: novo, updated_at: new Date().toISOString() }).eq("user_id", u.user.id)
    : await db.from("estudio_preferencias").insert({ user_id: u.user.id, direcao_visual: novo });
  if (r.error) throw r.error;
}
