// Content-engine worker: processes mc_trabalhos under R2 leases. Bounded per run, idempotent
// per step, never retries an "unknown" provider call, reuses a stored checkpoint response.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";
import { chamarGateway, MENSAGEM_RECUSA, promptSistema, promptUtilizador } from "./gateway.server.ts";
import {
  comporDocumentos, estruturarSemIa, marcaDoProjeto, MARCADOR_FALHA, MARCADOR_FIXTURE, MODELO_DEMO, MODELO_ESTRUTURACAO,
  normalizarFonte, respostaDemo, validarRespostaModelo, type Brief, type PropostaEditorial,
} from "./proposta.ts";
import { MENSAGEM_SEM_ALTERNATIVA, promptSistemaSlide, promptUtilizadorSlide, propostaComSlide, respostaDemoSlide, validarRespostaSlide } from "./regenerar.ts";
import { linhasBriefing, normalizarBriefing } from "./briefing.ts";
import { normalizarLeitura, normalizarPerfil, regrasAutor } from "./autor.ts";

export function admin(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
}

interface Trabalho {
  id: string; project_id: string; fonte_id: string; brief: Brief; modelo: string; lease_token: string; etapa: string; tentativas: number;
}

class Pausa extends Error {}

async function rpc<T>(sb: SupabaseClient, fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await sb.rpc(fn, args);
  if (error) {
    const e = new Error(error.message) as Error & { code?: string };
    e.code = error.code;
    throw e;
  }
  return data as T;
}

async function avancar(sb: SupabaseClient, t: Trabalho, etapa: string, estado: string, erro: string | null = null) {
  const ok = await rpc<boolean>(sb, "mc_avancar_trabalho", { _trabalho_id: t.id, _lease: t.lease_token, _etapa: etapa, _estado: estado, _erro: erro });
  if (!ok) throw new Pausa("lease perdido");
}

async function obterProposta(sb: SupabaseClient, t: Trabalho, texto: string, citacao: PropostaEditorial["citacao"], marca: PropostaEditorial["marca"]): Promise<void> {
  const { data: prop } = await sb.from("mc_propostas").select("id, versao_actual").eq("trabalho_id", t.id).single();
  if ((prop?.versao_actual ?? 0) > 0) return; // already persisted (idempotent)
  const fonte = normalizarFonte(texto);
  const regen = t.brief.regen ?? null;

  if (t.modelo === MODELO_ESTRUTURACAO) {
    const p = estruturarSemIa(fonte, t.brief, citacao, marca);
    await rpc(sb, "mc_gravar_proposta_servidor", { _trabalho_id: t.id, _lease: t.lease_token, _conteudo: p, _origem: "estruturacao" });
    return;
  }

  if (t.modelo === MODELO_DEMO && !texto.startsWith(MARCADOR_FIXTURE)) {
    throw Object.assign(new Error("O fornecedor de demonstração só aceita a fixture sintética."), { terminal: true });
  }

  // Checkpoint: reuse a stored response instead of calling again.
  const { data: chamadas } = await sb.from("mc_chamadas_ia").select("id, estado, resposta_bruta, erro").eq("trabalho_id", t.id).order("tentativa", { ascending: false }).limit(1);
  let ch = chamadas?.[0] as { id: string; estado: string; resposta_bruta: string | null; erro: string | null } | undefined;
  if (ch?.estado === "desconhecido") throw Object.assign(new Error("Resultado do pedido à IA desconhecido; não é repetido automaticamente."), { terminal: true, estado: "desconhecido" });
  if (ch?.estado === "pedido_enviado" || ch?.estado === "reservada") {
    if (ch.estado === "pedido_enviado") await rpc(sb, "mc_registar_chamada", { _chamada_id: ch.id, _estado: "desconhecido", _erro: "interrompido após envio" });
    throw Object.assign(new Error("Pedido à IA interrompido após o envio; resultado desconhecido."), { terminal: true, estado: "desconhecido" });
  }
  if (!ch || ch.estado === "invalida" || ch.estado === "erro_antes_pedido" || ch.estado === "recusada") {
    const erroAnterior = ch?.estado === "invalida" ? (ch.erro ?? undefined) : undefined;
    let id: string;
    try {
      id = await rpc<string>(sb, "mc_reservar_chamada", { _trabalho_id: t.id, _lease: t.lease_token });
    } catch (e) {
      const c = (e as { code?: string }).code;
      if (c === "P0002") throw Object.assign(new Error("IA desligada neste projeto: o limite diário está a zero."), { terminal: true });
      if (c === "P0003") throw Object.assign(new Error(ch?.estado === "invalida" ? `A IA devolveu uma resposta inválida duas vezes (${ch.erro ?? ""}). Nada foi gravado.` : "Limite de pedidos à IA atingido (por trabalho ou por dia)."), { terminal: true });
      if (c === "P0004") throw Object.assign(new Error("Há um pedido anterior sem resultado conhecido."), { terminal: true, estado: "desconhecido" });
      throw e;
    }
    let resposta: string;
    if (t.modelo === MODELO_DEMO) {
      await rpc(sb, "mc_registar_chamada", { _chamada_id: id, _estado: "pedido_enviado" });
      resposta = regen ? respostaDemoSlide(fonte, regen) : respostaDemo(fonte, t.brief);
      await rpc(sb, "mc_registar_chamada", { _chamada_id: id, _estado: "resposta_recebida", _resposta: resposta, _custo_eur: 0, _custo_incerto: false });
    } else {
      if (!Deno.env.get("DEEPSEEK_API_KEY")) {
        await rpc(sb, "mc_registar_chamada", { _chamada_id: id, _estado: "erro_antes_pedido", _erro: "chave em falta" });
        throw Object.assign(new Error("A DeepSeek não está configurada no servidor (DEEPSEEK_API_KEY em falta)."), { terminal: true });
      }
      await rpc(sb, "mc_registar_chamada", { _chamada_id: id, _estado: "pedido_enviado" });
      const r = regen
        ? await chamarGateway(t.modelo, promptSistemaSlide(regen.modo, t.brief.autor ? regrasAutor(normalizarPerfil(t.brief.autor), t.brief.leitura === true, t.brief.leitura_trabalho ? normalizarLeitura(t.brief.leitura_trabalho.angulo, t.brief.leitura_trabalho.especifica) : null) : null),
          [...(t.brief.briefing ? linhasBriefing(normalizarBriefing(t.brief.briefing)) : []), promptUtilizadorSlide(fonte.paragrafos, regen, erroAnterior)].join("\n"))
        : await chamarGateway(t.modelo, promptSistema(t.brief.framework, t.brief.autor ?? null, t.brief.leitura === true, t.brief.leitura_trabalho ?? null, t.brief.formato), promptUtilizador(fonte.paragrafos, { slides: t.brief.slides ?? 5, formato: t.brief.formato, objetivo: t.brief.objetivo, tom: t.brief.tom, titulo: citacao.titulo, briefing: t.brief.briefing ?? null }, erroAnterior));
      if (r.tipo === "recusado") {
        await rpc(sb, "mc_registar_chamada", { _chamada_id: id, _estado: "recusada", _custo_incerto: false, _erro: `${r.classe} HTTP ${r.status}` });
        throw Object.assign(new Error(MENSAGEM_RECUSA[r.classe]), { terminal: true });
      }
      if (r.tipo !== "resposta") {
        await rpc(sb, "mc_registar_chamada", { _chamada_id: id, _estado: "desconhecido", _erro: r.mensagem.slice(0, 300) });
        throw Object.assign(new Error("Não se sabe se a IA respondeu (ligação interrompida). Não é repetido automaticamente."), { terminal: true, estado: "desconhecido" });
      }
      resposta = r.texto;
      // Checkpoint before validating: the raw answer and token counts are stored first.
      await rpc(sb, "mc_registar_chamada", { _chamada_id: id, _estado: "resposta_recebida", _resposta: resposta || " ", _tokens_entrada: r.tokensEntrada, _tokens_saida: r.tokensSaida, _custo_incerto: true });
    }
    ch = { id, estado: "resposta_recebida", resposta_bruta: resposta, erro: null };
  }
  if (ch.estado === "resposta_recebida") {
    try {
      if (regen) validarRespostaSlide(ch.resposta_bruta ?? "", fonte, regen);
      else validarRespostaModelo(ch.resposta_bruta ?? "", fonte, t.modelo === MODELO_DEMO ? undefined : t.brief.slides, t.brief.formato);
      await rpc(sb, "mc_registar_chamada", { _chamada_id: ch.id, _estado: "valida", _custo_incerto: t.modelo !== MODELO_DEMO });
      ch.estado = "valida";
    } catch (e) {
      await rpc(sb, "mc_registar_chamada", { _chamada_id: ch.id, _estado: "invalida", _custo_incerto: t.modelo !== MODELO_DEMO, _erro: (e as Error).message.slice(0, 300) });
      // Known-invalid answer: one guided repair is allowed (reservation caps the job at 2 calls).
      throw Object.assign(new Error(`Resposta da IA inválida: ${(e as Error).message}`), { reparavel: true });
    }
  }
  // Induced failure (synthetic test only): stop after the checkpoint, before the final write, once.
  if (texto.includes(MARCADOR_FALHA)) {
    const { count } = await sb.from("mc_etapas").select("id", { count: "exact", head: true }).eq("trabalho_id", t.id).eq("estado", "falha_induzida");
    if (!count) {
      await sb.from("mc_etapas").insert({ trabalho_id: t.id, etapa: "proposta", estado: "falha_induzida", detalhe: { chamada: ch.id } });
      throw new Error("Falha induzida após checkpoint (teste sintético).");
    }
  }
  const demo = t.modelo === MODELO_DEMO;
  if (regen) {
    const rs = validarRespostaSlide(ch.resposta_bruta ?? "", fonte, regen);
    // A valid "no alternative" answer is final for this request (it was paid); nothing is stored.
    if (rs.tipo === "sem_alternativa") throw Object.assign(new Error(MENSAGEM_SEM_ALTERNATIVA), { terminal: true });
    await rpc(sb, "mc_gravar_proposta_servidor", { _trabalho_id: t.id, _lease: t.lease_token, _conteudo: propostaComSlide(regen, rs, demo ? "demonstracao" : "ia"), _origem: demo ? "demonstracao" : "ia", _chamada_id: ch.id });
    return;
  }
  const r = validarRespostaModelo(ch.resposta_bruta ?? "", fonte, demo ? undefined : t.brief.slides, t.brief.formato);
  const base = estruturarSemIa(fonte, t.brief, citacao, marca);
  const p: PropostaEditorial = {
    ...base, metodo: demo ? "demonstracao" : "ia", demonstracao: demo, titulo: r.titulo, slides: r.slides, legenda: r.legenda,
    alt: r.alt ?? r.slides.map((s, i) => `Slide ${i + 1} de ${r.slides.length}: ${s.titulo}`.slice(0, 250)),
  };
  await rpc(sb, "mc_gravar_proposta_servidor", { _trabalho_id: t.id, _lease: t.lease_token, _conteudo: p, _origem: demo ? "demonstracao" : "ia", _chamada_id: ch.id });
}

async function processarUm(sb: SupabaseClient, t: Trabalho): Promise<string> {
  const { data: f } = await sb.from("mc_fontes").select("texto, titulo, origem_url").eq("id", t.fonte_id).single();
  const { data: proj } = await sb.from("projects").select("color").eq("id", t.project_id).single();
  if (!f) throw new Error("Fonte inexistente.");
  const marca = marcaDoProjeto(proj?.color);
  try {
    await obterProposta(sb, t, f.texto, { titulo: f.titulo, url: f.origem_url }, marca);
  } catch (e) {
    if (!(e as { reparavel?: boolean }).reparavel) throw e;
    // Single guided repair in the same lease; the reservation refuses a third call.
    await obterProposta(sb, t, f.texto, { titulo: f.titulo, url: f.origem_url }, marca);
  }
  await avancar(sb, t, "documento", "a_processar");
  const { data: prop } = await sb.from("mc_propostas").select("id, versao_actual").eq("trabalho_id", t.id).single();
  const { data: pv } = await sb.from("mc_propostas_versoes").select("conteudo").eq("proposta_id", prop!.id).eq("versao", prop!.versao_actual).single();
  const docs = comporDocumentos(pv!.conteudo as PropostaEditorial, normalizarFonte(f.texto).paragrafos);
  for (const v of ["A", "B"] as const) {
    await rpc(sb, "mc_gravar_documento_servidor", { _trabalho_id: t.id, _lease: t.lease_token, _variante: v, _documento: docs[v] });
  }
  await avancar(sb, t, "fim", "concluido");
  return "concluido";
}

/** Processes at most `limite` jobs; each job is fully owned by its lease token. */
export async function processarLote(sb: SupabaseClient, limite = 3): Promise<Array<{ id: string; resultado: string }>> {
  await rpc(sb, "mc_fechar_esgotados", {});
  const trabalhos = await rpc<Trabalho[]>(sb, "mc_reservar_trabalhos", { _limite: limite, _segundos: 300 });
  const out: Array<{ id: string; resultado: string }> = [];
  for (const t of trabalhos ?? []) {
    try {
      out.push({ id: t.id, resultado: await processarUm(sb, t) });
    } catch (e) {
      const err = e as Error & { terminal?: boolean; estado?: string };
      if (err instanceof Pausa) { out.push({ id: t.id, resultado: "lease_perdido" }); continue; }
      const estado = err.terminal || (err as { reparavel?: boolean }).reparavel ? (err.estado ?? "erro") : "pendente";
      try { await avancar(sb, t, t.etapa === "fonte" ? "proposta" : t.etapa, estado, (err.message ?? "erro").slice(0, 300)); } catch { /* lease gone */ }
      out.push({ id: t.id, resultado: `${estado}: ${(err.message ?? "").slice(0, 120)}` });
    }
  }
  return out;
}
