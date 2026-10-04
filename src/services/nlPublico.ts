// Anonymous access to the newsletter's public API (published content and token-signed subscription actions).
import type { PaginaEdicaoPublica, ResumoEdicaoPublica } from "@/newsletter/_tipos-servidor/newsletter-engine/revista/publicacao.server";

const BASE = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/nl-publico`;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

async function pedir<T>(caminho: string, init?: RequestInit): Promise<T | null> {
  const r = await fetch(`${BASE}${caminho}`, {
    ...init,
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error("Não foi possível carregar.");
  return (await r.json()) as T;
}

export const listarEdicoes = async () => (await pedir<ResumoEdicaoPublica[]>("/edicoes")) ?? [];
export const obterEdicao = (numero: number) => pedir<PaginaEdicaoPublica & { briefs?: unknown }>(`/edicoes/${numero}`);

export interface BriefPublicoApi {
  slug: string; tipo: string; categoria: string; titulo: string; dataISO: string; actualizadoISO?: string;
  tempo: string; fonte: string; fonteUrl: string; resumo: string[]; implicacoes: Array<{ titulo: string; texto: string }>;
  leitura: string | null; relacionados: Array<{ categoria: string; titulo: string; tempo: string; slug: string }>;
  edicaoNumero: number | null; tese?: string; indexavel: boolean; enviada: boolean;
}
export const obterBrief = (slug: string) => pedir<BriefPublicoApi>(`/brief/${encodeURIComponent(slug)}`);

export interface EstadoPublico {
  ok: boolean; email: string | null; estado: "activa" | "cancelada" | "pausada" | "mensal"; retomaEm: string | null; mensagem?: string;
}
export interface ResultadoAccaoPublico { ok: boolean; estado: string; retomaEm: string | null; mensagem: string }

const SEM_LIGACAO: EstadoPublico = { ok: false, email: null, estado: "activa", retomaEm: null, mensagem: "Ligação inválida ou incompleta." };

export async function estadoSubscricao(t: string): Promise<EstadoPublico> {
  if (!t) return SEM_LIGACAO;
  const r = await fetch(`${BASE}/subscricao/estado`, { method: "POST", headers: { apikey: KEY, "Content-Type": "application/json" }, body: JSON.stringify({ t }) });
  return r.ok ? ((await r.json()) as EstadoPublico) : SEM_LIGACAO;
}

export async function accaoSubscricao(t: string, accao: "cancelar" | "pausar" | "mensal" | "reverter", motivo: string | null): Promise<ResultadoAccaoPublico> {
  const r = await fetch(`${BASE}/subscricao/accao`, { method: "POST", headers: { apikey: KEY, "Content-Type": "application/json" }, body: JSON.stringify({ t, accao, motivo }) });
  const j = (await r.json().catch(() => null)) as ResultadoAccaoPublico | null;
  return j ?? { ok: false, estado: "activa", retomaEm: null, mensagem: "Não foi possível concluir." };
}
