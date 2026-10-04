// Lógica de sincronização usada tanto por `sincronizar-rascunho-egoi`
// como por `disparar-egoi`. Cria ou actualiza (PATCH) a campanha na E-goi
// por par (edicao_id, lista_id) e devolve o resultado por lista.

import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";
import { renderEdicaoEmail } from "./render.server.ts";
import { criarCampanha, patchCampanha } from "./egoi.server.ts";

const DELAY_ENTRE_LISTAS_MS = 6000;

/**
 * Nome interno da campanha na E-goi: edição + lista + título da newsletter.
 * O assunto é truncado para o nome continuar legível na listagem da E-goi.
 */
export function nomeInternoCampanha(numero: number, nomeLista: string, assunto?: string | null) {
  const base = `Edição #${numero} — ${nomeLista}`;
  const a = (assunto ?? "").trim();
  if (!a) return base;
  const curto = a.length > 120 ? `${a.slice(0, 117).trimEnd()}…` : a;
  return `${base} — ${curto}`;
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface ListaAlvo { id: string; nome: string; egoi_lista_id: string; tipo: "teste" | "real"; }

export interface ResultadoSync {
  lista_id: string;
  lista_nome: string;
  campaign_hash?: string;
  actualizado_em?: string;
  criado_agora?: boolean;
  ok: boolean;
  erro?: string;
}

export interface SincResultado {
  resultados: ResultadoSync[];
  edicao: { id: string; numero: number; assunto: string };
  html: string;
}

/** Resolve listas por UUIDs e valida activas. */
export async function resolverListas(admin: SupabaseClient, listaIds: string[]): Promise<{ ok: true; modo: "teste" | "real"; listas: ListaAlvo[] } | { ok: false; mensagem: string }> {
  const ids = listaIds.map((x) => String(x).trim()).filter(Boolean);
  if (ids.length === 0) return { ok: false, mensagem: "lista_ids é obrigatório" };
  if (ids.length > 5) return { ok: false, mensagem: "Máximo 5 listas por envio" };

  const { data, error } = await admin.from("nl_egoi_listas")
    .select("id, nome, egoi_lista_id, tipo, activa").in("id", ids);
  if (error) return { ok: false, mensagem: `Falha a carregar listas: ${error.message}` };
  const rows = (data ?? []) as { id: string; nome: string; egoi_lista_id: string; tipo: string; activa: boolean }[];

  const inactivas = rows.filter((r) => !r.activa);
  if (inactivas.length) return { ok: false, mensagem: `Listas inactivas: ${inactivas.map((r) => r.nome).join(", ")}` };
  const encontradas = new Set(rows.map((r) => r.id));
  const faltam = ids.filter((id) => !encontradas.has(id));
  if (faltam.length) return { ok: false, mensagem: `Listas não encontradas: ${faltam.join(", ")}` };

  const porId = new Map(rows.map((r) => [r.id, r]));
  const listas: ListaAlvo[] = ids.map((id) => {
    const r = porId.get(id)!;
    return { id: r.id, nome: r.nome, egoi_lista_id: r.egoi_lista_id, tipo: r.tipo as "teste" | "real" };
  });
  const modo: "teste" | "real" = listas.some((l) => l.tipo === "real") ? "real" : "teste";
  return { ok: true, modo, listas };
}

export async function lerConfig(admin: SupabaseClient): Promise<Record<string, string>> {
  const { data } = await admin.from("nl_configuracoes").select("chave, valor");
  const map: Record<string, string> = {};
  for (const row of (data ?? []) as { chave: string; valor: string | null }[]) map[row.chave] = row.valor ?? "";
  return map;
}

async function lerEdicao(admin: SupabaseClient, edicaoId: string, permitirEnviada = false) {
  const { data: edicao, error } = await admin.from("nl_edicoes")
    .select("id, numero, assunto, estado").eq("id", edicaoId).maybeSingle();
  if (error || !edicao) return { ok: false as const, status: 404, mensagem: "Edição não encontrada" };
  if (!permitirEnviada && (edicao as { estado: string }).estado === "enviada") {
    return { ok: false as const, status: 409, mensagem: "Edição já foi enviada — não é possível actualizar rascunho." };
  }
  const numero = (edicao as { numero: number }).numero;
  const assunto = ((edicao as { assunto: string | null }).assunto ?? "").trim() || `Edição #${numero}`;
  return { ok: true as const, edicao: { id: (edicao as { id: string }).id, numero, assunto } };
}

/** Sincroniza uma única lista (para uso pelo disparador sequencial). Devolve resultado + html + edição. */
export async function sincronizarUmaLista(admin: SupabaseClient, opts: {
  edicaoId: string;
  lista: ListaAlvo;
  apiKey: string;
  senderId: string;
  quem: string;
  permitirEnviada?: boolean;
}): Promise<{ ok: true; resultado: ResultadoSync; html: string; edicao: { id: string; numero: number; assunto: string } } | { ok: false; status: number; mensagem: string }> {
  const ed = await lerEdicao(admin, opts.edicaoId, opts.permitirEnviada === true);
  if (!ed.ok) return ed;
  const { html, plainText } = await renderEdicaoEmail(opts.edicaoId);
  const resultado = await sincronizarLista(admin, {
    edicao: ed.edicao, lista: opts.lista, html, plainText,
    apiKey: opts.apiKey, senderId: opts.senderId, quem: opts.quem,
  });
  return { ok: true, resultado, html, edicao: ed.edicao };
}

async function sincronizarLista(admin: SupabaseClient, opts: {
  edicao: { id: string; numero: number; assunto: string };
  lista: ListaAlvo;
  html: string;
  plainText: string;
  apiKey: string;
  senderId: string;
  quem: string;
}): Promise<ResultadoSync> {
  const cfg = { apiKey: opts.apiKey };
  const l = opts.lista;
  const { edicao, html } = opts;
  const plainText = opts.plainText;

  const { data: existenteRaw } = await admin.from("nl_egoi_campanhas")
    .select("id, campaign_hash, estado")
    .eq("edicao_id", edicao.id).eq("lista_id", l.id).maybeSingle();
  const existente = existenteRaw as { id: string; campaign_hash: string; estado: string } | null;

  if (existente && existente.estado === "enviada") {
    // Uma campanha da E-goi só pode ser disparada uma vez: se a linha já está
    // marcada como enviada, criamos uma nova campanha e substituímos o hash.
    // Criamos uma nova campanha e substituímos o hash na linha existente.
    const internalNameNovo = `${nomeInternoCampanha(edicao.numero, l.nome, edicao.assunto)} (nova ${new Date().toISOString().slice(11, 19)})`;
    const rReenvio = await criarCampanha(cfg, { listaId: l.egoi_lista_id, internalName: internalNameNovo, subject: edicao.assunto, senderId: opts.senderId, html, plainText });
    if (!rReenvio.ok) {
      await admin.from("nl_audit_log").insert({ quem: opts.quem, accao: `Falha a recriar campanha de teste «${l.nome}»`, detalhe: rReenvio.mensagem });
      return { lista_id: l.id, lista_nome: l.nome, ok: false, erro: rReenvio.mensagem, campaign_hash: existente.campaign_hash };
    }
    const { data: reenvUpd } = await admin.from("nl_egoi_campanhas")
      .update({ campaign_hash: rReenvio.campaign_hash, estado: "rascunho", actualizado_em: new Date().toISOString() })
      .eq("id", existente.id).select("actualizado_em").maybeSingle();
    await admin.from("nl_audit_log").insert({ quem: opts.quem, accao: `Nova campanha de teste criada para «${l.nome}» (reenvio)`, detalhe: `campaign_hash ${rReenvio.campaign_hash}` });
    return {
      lista_id: l.id, lista_nome: l.nome, ok: true, criado_agora: true,
      campaign_hash: rReenvio.campaign_hash,
      actualizado_em: (reenvUpd as { actualizado_em?: string } | null)?.actualizado_em,
    };
  }

  const internalName = nomeInternoCampanha(edicao.numero, l.nome, edicao.assunto);

  if (existente) {
    const rM = await patchCampanha(cfg, existente.campaign_hash, { internalName, subject: edicao.assunto, senderId: opts.senderId, html, plainText });
    if (!rM.ok) {
      await admin.from("nl_audit_log").insert({ quem: opts.quem, accao: `Falha a actualizar rascunho «${l.nome}»`, detalhe: rM.mensagem });
      return { lista_id: l.id, lista_nome: l.nome, ok: false, erro: rM.mensagem, campaign_hash: existente.campaign_hash };
    }
    const { data: updated } = await admin.from("nl_egoi_campanhas")
      .update({ actualizado_em: new Date().toISOString() })
      .eq("id", existente.id).select("actualizado_em").maybeSingle();
    await admin.from("nl_audit_log").insert({ quem: opts.quem, accao: `Rascunho actualizado na E-goi para «${l.nome}»`, detalhe: `campaign_hash ${existente.campaign_hash}` });
    return {
      lista_id: l.id, lista_nome: l.nome, ok: true,
      campaign_hash: existente.campaign_hash,
      actualizado_em: (updated as { actualizado_em?: string } | null)?.actualizado_em,
    };
  }

  // Não existe: cria (com conteúdo já no POST inicial — evita "content isEmpty")
  const rN = await criarCampanha(cfg, { listaId: l.egoi_lista_id, internalName, subject: edicao.assunto, senderId: opts.senderId, html, plainText });
  if (!rN.ok) {
    await admin.from("nl_audit_log").insert({ quem: opts.quem, accao: `Falha a criar campanha «${l.nome}»`, detalhe: rN.mensagem });
    return { lista_id: l.id, lista_nome: l.nome, ok: false, erro: rN.mensagem };
  }


  const nowIso = new Date().toISOString();
  const { data: inserted } = await admin.from("nl_egoi_campanhas")
    .insert({
      edicao_id: edicao.id,
      lista_id: l.id,
      campaign_hash: rN.campaign_hash,
      estado: "rascunho",
    }).select("actualizado_em").maybeSingle();
  await admin.from("nl_audit_log").insert({ quem: opts.quem, accao: `Rascunho criado na E-goi para «${l.nome}»`, detalhe: `campaign_hash ${rN.campaign_hash}` });
  return {
    lista_id: l.id, lista_nome: l.nome, ok: true, criado_agora: true,
    campaign_hash: rN.campaign_hash,
    actualizado_em: (inserted as { actualizado_em?: string } | null)?.actualizado_em ?? nowIso,
  };
}

/**
 * Sincroniza rascunho na E-goi para cada lista. Reutiliza campanha via PATCH
 * quando já existe linha em egoi_campanhas.
 */
export async function sincronizar(admin: SupabaseClient, opts: {
  edicaoId: string;
  listas: ListaAlvo[];
  apiKey: string;
  senderId: string;
  quem: string;
}): Promise<{ ok: true; sinc: SincResultado } | { ok: false; status: number; mensagem: string }> {
  const ed = await lerEdicao(admin, opts.edicaoId);
  if (!ed.ok) return ed;

  const { html, plainText } = await renderEdicaoEmail(opts.edicaoId);
  const resultados: ResultadoSync[] = [];

  for (let i = 0; i < opts.listas.length; i++) {
    if (i > 0) await sleep(DELAY_ENTRE_LISTAS_MS);
    const r = await sincronizarLista(admin, {
      edicao: ed.edicao, lista: opts.listas[i], html, plainText,
      apiKey: opts.apiKey, senderId: opts.senderId, quem: opts.quem,
    });
    resultados.push(r);
  }

  return {
    ok: true,
    sinc: { resultados, html, edicao: ed.edicao },
  };
}

export interface Utilizador { id: string; nome: string; papel: "admin" | "curador"; }

export async function autorizar(SUPABASE_URL: string, ANON_KEY: string, SERVICE_KEY: string, req: Request, modo: "teste" | "real"): Promise<{ ok: true; user: Utilizador } | { ok: false; status: number; mensagem: string }> {
  const auth = req.headers.get("Authorization");
  if (!auth) return { ok: false, status: 401, mensagem: "Sem sessão" };
  const sb = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: ures } = await sb.auth.getUser();
  if (!ures.user) return { ok: false, status: 401, mensagem: "Sessão inválida" };
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data: perfil } = await admin.from("nl_perfis").select("nome, papel").eq("id", ures.user.id).maybeSingle();
  const papel = (perfil?.papel ?? "") as string;
  if (papel !== "admin" && papel !== "curador") return { ok: false, status: 403, mensagem: "Sem permissão" };
  if (modo === "real" && papel !== "admin") return { ok: false, status: 403, mensagem: "Apenas o admin pode enviar para subscritores" };
  return { ok: true, user: { id: ures.user.id, nome: perfil?.nome ?? ures.user.email ?? "utilizador", papel: papel as "admin" | "curador" } };
}
