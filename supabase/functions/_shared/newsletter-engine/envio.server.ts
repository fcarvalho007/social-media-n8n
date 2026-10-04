import process from "node:process";
// Implementação servidor do fluxo de preview / sincronização / envio.
// Porta directa das antigas Edge Functions (preview-edicao,
// sincronizar-rascunho-egoi, disparar-egoi, publicar-wordpress) para o
// runtime da aplicação, mantendo exactamente as mesmas regras.

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";
import { renderEdicaoEmail } from "./render.server.ts";
import { gerarHtmlEdicaoWeb } from "./gerar-html-web.server.ts";
import {
  bloquearSnapshotRevista, composeRevistaEdition, descartarSnapshotPreparado,
  lerSnapshotRevista, prepararSnapshotRevista,
} from "./revista/compose.server.ts";
import { montarHtmlRevista } from "./revista/render-email.server.ts";
import { montarTextoRevista } from "./revista/texto.server.ts";
import { lerConfig, resolverListas, sincronizar, sincronizarUmaLista } from "./sincronizar-egoi.server.ts";
import { disparaCampanha, estadoCampanha } from "./egoi.server.ts";
import { lerConfigWp, publicarOuActualizarLicaoEdicao } from "./wordpress.server.ts";
import { caminhoCanonicoEdicao, criarBackup, gravarDestino } from "./revista/destinos.server.ts";

export class ErroEnvio extends Error {
  status: number;
  constructor(mensagem: string, status = 400) {
    super(mensagem);
    this.status = status;
  }
}

export function admin(): SupabaseClient {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

export interface Utilizador { id: string; nome: string; papel: "admin" | "curador" }

/** Confirma papel do utilizador autenticado; `real` exige admin. */
export async function autorizar(sb: SupabaseClient, userId: string, modo: "teste" | "real"): Promise<Utilizador> {
  const { data: perfil } = await sb.from("nl_perfis").select("nome, papel").eq("id", userId).maybeSingle();
  const papel = (perfil?.papel ?? "") as string;
  if (papel !== "admin" && papel !== "curador") throw new ErroEnvio("Sem permissão", 403);
  if (modo === "real" && papel !== "admin") throw new ErroEnvio("Apenas o admin pode enviar para subscritores", 403);
  return { id: userId, nome: (perfil?.nome as string | null) ?? "utilizador", papel: papel as "admin" | "curador" };
}

async function credenciaisEgoi(sb: SupabaseClient) {
  const config = await lerConfig(sb);
  const apiKey = config.egoi_api_key || process.env.EGOI_API_KEY || "";
  const senderId = config.egoi_remetente_id || "";
  if (!apiKey) throw new ErroEnvio("Falta EGOI_API_KEY em Definições.");
  if (!senderId) throw new ErroEnvio("Falta o ID do remetente E-goi em Definições.");
  return { config, apiKey, senderId };
}

/* ─────────── preview ─────────── */

export async function previewHtml(edicaoId: string, destino: "email" | "wordpress") {
  if (destino === "wordpress") {
    const { html, resumoTexto } = await gerarHtmlEdicaoWeb(edicaoId);
    return { ok: true as const, destino, html, resumo: resumoTexto };
  }
  // Email: despacha por versão de template (clássico ou revista).
  const { html } = await renderEdicaoEmail(edicaoId);
  return { ok: true as const, destino, html, resumo: undefined as string | undefined };
}

/* ─────────── sincronizar rascunho ─────────── */

export async function sincronizarRascunho(userId: string, edicaoId: string, listaIds: string[]) {
  const sb = admin();
  const listasR = await resolverListas(sb, listaIds);
  if (!listasR.ok) throw new ErroEnvio(listasR.mensagem);
  const user = await autorizar(sb, userId, listasR.modo);
  const { apiKey, senderId } = await credenciaisEgoi(sb);

  const r = await sincronizar(sb, { edicaoId, listas: listasR.listas, apiKey, senderId, quem: user.nome });
  if (!r.ok) throw new ErroEnvio(r.mensagem, r.status);

  const sucessos = r.sinc.resultados.filter((x) => x.ok).length;
  const falhas = r.sinc.resultados.length - sucessos;
  return {
    ok: falhas === 0,
    campanhas: r.sinc.resultados,
    sucessos,
    falhas,
    mensagem: falhas === 0
      ? `E-goi actualizada em ${sucessos} lista(s).`
      : `E-goi: ${sucessos} ok · ${falhas} falha(s).`,
  };
}

/* ─────────── disparo ─────────── */

const DELAY_ENTRE_DISPAROS_MS = 15000;
/** Pausa entre preparar a campanha e dar a ordem de disparo dessa lista. */
const DELAY_ANTES_DISPARO_MS = 3000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));


/** Próxima quinta-feira (inclusive hoje, se hoje for quinta). */
function proximaQuinta(): string {
  const hoje = new Date();
  const diff = (4 - hoje.getDay() + 7) % 7;
  const alvo = new Date(hoje);
  alvo.setDate(hoje.getDate() + diff);
  return alvo.toISOString().slice(0, 10);
}

/** Cria a edição seguinte em rascunho (idempotente: não cria se já houver rascunho). */
export async function garantirEdicaoSeguinte(sb: SupabaseClient, quem: string) {
  const { data: rasc } = await sb.from("nl_edicoes").select("id").eq("estado", "rascunho").limit(1).maybeSingle();
  if (rasc) return null;

  const { data: max } = await sb.from("nl_edicoes").select("numero").order("numero", { ascending: false }).limit(1).maybeSingle();
  const numero = ((max as { numero: number } | null)?.numero ?? 0) + 1;

  // As novas edições nascem no formato Revista (padrão actual).
  const { data: nova, error } = await sb.from("nl_edicoes").insert({
    numero,
    data_envio_prevista: proximaQuinta(),
    assunto: `Edição #${numero}`,
    estado: "rascunho",
    bloco_livro: true,
    bloco_recursos: true,
    template_version: "revista",
  }).select("id").single();
  if (error || !nova) return null;

  await sb.from("nl_cronicas").insert({ edicao_id: nova.id, conteudo: "", conteudo_html: "", leituras_recomendadas: "" });
  await sb.rpc("nl_criar_seccoes_padrao", { _edicao_id: nova.id });
  await sb.from("nl_revista_edicao").insert({ edicao_id: nova.id });
  await sb.from("nl_audit_log").insert({ quem, accao: `Edição #${numero} criada automaticamente após o envio` });
  return { id: nova.id as string, numero };
}

/**
 * Marca a edição como enviada. Idempotente: se já estiver enviada não faz nada.
 * Verifica o resultado e regista falha no audit_log em vez de falhar em silêncio.
 */
export async function fecharEdicaoEnviada(sb: SupabaseClient, edicaoId: string, dados: {
  quem: string;
  assunto: string;
  html: string;
  sucessos: Array<{ campaign_hash?: string; lista_id: string; lista_nome: string }>;
  falhas: Array<{ lista_id: string; lista_nome: string; erro?: string }>;
}) {
  const { data: actual } = await sb.from("nl_edicoes")
    .select("snapshot_envio, enviada_em, wordpress_post_id, wordpress_post_url").eq("id", edicaoId).maybeSingle();
  if (!actual) return false;
  // Idempotente pelo snapshot: o estado pode já ter sido marcado a meio do disparo.
  if ((actual as { snapshot_envio: unknown }).snapshot_envio) return true;

  const wp = actual as { enviada_em: string | null; wordpress_post_id: number | null; wordpress_post_url: string | null };
  const wpSnap = wp.wordpress_post_id
    ? { post_id: wp.wordpress_post_id, post_url: wp.wordpress_post_url ?? "", status: "publish" }
    : null;

  const { error, data: linhas } = await sb.from("nl_edicoes").update({
    estado: "enviada",
    enviada_em: wp.enviada_em ?? new Date().toISOString(),
    snapshot_envio: {
      gerado_em: new Date().toISOString(),

      assunto: dados.assunto,
      html: dados.html,
      egoi: dados.sucessos.map((x) => ({ campaign_hash: x.campaign_hash, lista_id: x.lista_id, lista_nome: x.lista_nome })),
      egoi_falhas: dados.falhas.map((x) => ({ lista_id: x.lista_id, lista_nome: x.lista_nome, erro: x.erro })),
      wordpress: wpSnap,
    },
  }).eq("id", edicaoId).select("id");

  if (error || !linhas?.length) {
    await sb.from("nl_audit_log").insert({
      quem: dados.quem,
      accao: "ERRO: a edição foi enviada mas não ficou marcada como enviada",
      detalhe: error?.message ?? "nenhuma linha actualizada",
    });
    return false;
  }

  await sb.from("nl_noticias").update({ estado: "enviada" }).eq("edicao_id", edicaoId).eq("estado", "aprovada");
  await garantirEdicaoSeguinte(sb, dados.quem);
  return true;
}

export interface ResDisparo {
  lista_id: string;
  lista_nome: string;
  campaign_hash?: string;
  ok: boolean;
  erro?: string;
  sincronizada: boolean;
  /** Verdadeiro quando o estado veio da E-goi e não da resposta ao disparo. */
  confirmadoNaEgoi?: boolean;
}

/**
 * Pergunta à E-goi o estado real de cada campanha desta edição e alinha a
 * base de dados. Só "sent" confirma a entrega; "sending"/"processing" marcam a
 * campanha como aceite (nunca repetir). Quando um administrador já pediu o fecho
 * e todas as campanhas aceites estão confirmadas, fecha a edição aqui.
 */
export async function reconciliarEdicao(edicaoId: string): Promise<{
  ok: true;
  actualizadas: Array<{ lista_id: string; lista_nome: string }>;
  por_confirmar: number;
  fechada: boolean;
}> {
  const sb = admin();
  const { data: campsRaw } = await sb.from("nl_egoi_campanhas")
    .select("lista_id, campaign_hash, estado, nl_egoi_listas(nome)").eq("edicao_id", edicaoId);
  const camps = (campsRaw ?? []) as unknown as Array<{
    lista_id: string; campaign_hash: string; estado: string;
    nl_egoi_listas: { nome: string } | { nome: string }[] | null;
  }>;
  const nomeDe = (c: (typeof camps)[number]) => {
    const rel = Array.isArray(c.nl_egoi_listas) ? c.nl_egoi_listas[0] : c.nl_egoi_listas;
    return rel?.nome ?? "lista";
  };
  const pendentes = camps.filter((c) => c.estado !== "enviada" && c.campaign_hash);

  let apiKey: string | null = null;
  if (pendentes.length) {
    try { ({ apiKey } = await credenciaisEgoi(sb)); } catch { apiKey = null; }
  }

  const actualizadas: Array<{ lista_id: string; lista_nome: string }> = [];
  const agora = () => new Date().toISOString();
  if (apiKey) {
    for (const c of pendentes) {
      const r = await estadoCampanha({ apiKey }, c.campaign_hash);
      if (!r.ok) continue;
      if (r.estado === "enviada") {
        await sb.from("nl_egoi_campanhas")
          .update({ estado: "enviada", estado_egoi: r.bruto, confirmado_em: agora(), actualizado_em: agora() })
          .eq("edicao_id", edicaoId).eq("lista_id", c.lista_id);
        c.estado = "enviada";
        actualizadas.push({ lista_id: c.lista_id, lista_nome: nomeDe(c) });
        await sb.from("nl_audit_log").insert({
          quem: "sistema",
          accao: `E-goi confirma a entrega para «${nomeDe(c)}»`,
          detalhe: `campaign_hash ${c.campaign_hash}`,
        });
      } else if (r.estado === "a_enviar" && c.estado === "rascunho") {
        // A resposta ao disparo perdeu-se mas a campanha está a sair: aceite, não entregue.
        await sb.from("nl_egoi_campanhas")
          .update({ estado: "aceite", estado_egoi: r.bruto, aceite_em: agora(), actualizado_em: agora() })
          .eq("edicao_id", edicaoId).eq("lista_id", c.lista_id);
        c.estado = "aceite";
      } else {
        await sb.from("nl_egoi_campanhas").update({ estado_egoi: r.bruto }).eq("edicao_id", edicaoId).eq("lista_id", c.lista_id);
      }
    }
  }
  // Se há campanhas aceites ou confirmadas, a edição já não pode voltar atrás.
  if (camps.some((c) => c.estado === "aceite" || c.estado === "enviada")) await bloquearSnapshotRevista(edicaoId);

  const porConfirmar = camps.filter((c) => c.estado === "aceite").length;
  let fechada = false;
  const { data: edRaw } = await sb.from("nl_edicoes")
    .select("numero, assunto, estado, fecho_pendente_em, fecho_pendente_por").eq("id", edicaoId).maybeSingle();
  const ed = edRaw as { numero: number; assunto: string | null; estado: string; fecho_pendente_em: string | null; fecho_pendente_por: string | null } | null;
  if (ed && ed.estado !== "enviada" && ed.fecho_pendente_em && porConfirmar === 0) {
    const sucessos = camps.filter((c) => c.estado === "enviada")
      .map((c) => ({ campaign_hash: c.campaign_hash, lista_id: c.lista_id, lista_nome: nomeDe(c) }));
    if (sucessos.length) {
      const falhas = camps.filter((c) => c.estado === "rascunho").map((c) => ({ lista_id: c.lista_id, lista_nome: nomeDe(c) }));
      const assunto = (ed.assunto ?? "").trim() || `Edição #${ed.numero}`;
      const { html } = await renderEdicaoEmail(edicaoId);
      fechada = await fecharEdicaoEnviada(sb, edicaoId, { quem: ed.fecho_pendente_por ?? "sistema", assunto, html, sucessos, falhas });
      if (fechada) {
        await sb.from("nl_edicoes").update({ fecho_pendente_em: null, fecho_pendente_por: null }).eq("id", edicaoId);
        const { enfileirarCarrossel } = await import("../conteudos/jobs.server.ts");
        await enfileirarCarrossel(edicaoId, "reconciliacao");
      }
    }
  }
  return { ok: true, actualizadas, por_confirmar: porConfirmar, fechada };
}


export interface ListaPreparada {
  lista_id: string;
  lista_nome: string;
  campaign_hash?: string;
  ok: boolean;
  erro?: string;
}

const LOCK_MS = 10 * 60_000;

/**
 * Prepara a edição Revista antes do envio: publica a versão web, guarda o URL
 * e grava a fotografia (dados + HTML + texto) no estado «preparado».
 *
 * «Preparado» garante determinismo — todas as listas recebem exactamente o
 * mesmo conteúdo — mas ainda é reversível: só bloqueia definitivamente quando
 * a primeira lista for aceite pela E-goi.
 * Não faz nada em edições Clássicas nem em edições já bloqueadas ou preparadas.
 */
async function prepararEdicaoRevista(
  sb: SupabaseClient,
  edicaoId: string,
  quem: string,
  listaIds: string[],
): Promise<void> {
  const { data: edRaw } = await sb.from("nl_edicoes")
    .select("template_version").eq("id", edicaoId).maybeSingle();
  const ed = edRaw as { template_version?: string } | null;
  if (!ed || ed.template_version !== "revista") return;

  const existente = await lerSnapshotRevista(edicaoId);
  if (existente) return; // bloqueada (histórico) ou já preparada nesta tentativa

  await sb.from("nl_audit_log").insert({ quem, accao: "Workflow Revista iniciado" });

  // 1) Prontidão completa ANTES de qualquer escrita externa. Os avisos não
  //    travam (a decisão é editorial, confirmada no modal); os bloqueios
  //    rígidos dos Briefs travam mesmo — nada segue para a E-goi.
  const { avaliarProntidao } = await import("./revista/prontidao.server.ts");
  const pront = await avaliarProntidao(edicaoId, { listaIds });
  if (pront.bloqueiosRigidos.length) {
    await sb.from("nl_audit_log").insert({
      quem,
      accao: "Envio Revista travado pelos Briefs",
      detalhe: pront.bloqueiosRigidos.join(" · ").slice(0, 500),
    });
    throw new ErroEnvio(pront.bloqueiosRigidos.join(" · "), 409);
  }
  await sb.from("nl_audit_log").insert({
    quem,
    accao: pront.ok ? "Prontidão Revista verificada" : "Envio Revista prosseguiu com avisos",
    detalhe: pront.ok ? null : pront.bloqueios.join(" · ").slice(0, 500),
  });

  // 2) Briefs: publicar o que está pronto e confirmar que cada página responde
  //    ANTES de o endereço entrar no email. Com o interruptor desligado, nada
  //    disto corre.
  const { publicarBriefsDaEdicao, confirmarUrlsPublicas } = await import("./revista/brief/publicacao.server.ts");
  const briefs = await publicarBriefsDaEdicao(edicaoId, sb);
  if (briefs.naoCongelaveis.length) {
    throw new ErroEnvio(
      `Não foi possível fixar a versão de ${briefs.naoCongelaveis.length} Brief(s): ${briefs.naoCongelaveis[0].motivo}`,
      409,
    );
  }
  const nLigacoes = Object.keys(briefs.ligacoes).length;
  if (nLigacoes > 0) {
    await sb.from("nl_audit_log").insert({
      quem,
      accao: "Briefs publicados",
      detalhe: `${briefs.publicados} publicados · ${briefs.reutilizados} reutilizados`,
    });
    // 3) confirmação das páginas públicas — uma página nossa que não responde
    //    é bloqueio real: nunca entra um endereço morto no email.
    const confirmacao = await confirmarUrlsPublicas(briefs.ligacoes);
    await sb.from("nl_audit_log").insert({
      quem,
      accao: confirmacao.ok ? "Endereços dos Briefs confirmados" : "Endereços de Brief sem resposta",
      detalhe: confirmacao.ok
        ? `${nLigacoes} páginas públicas`
        : confirmacao.falhados.map((f) => `${f.slug} (${f.status})`).join(" · ").slice(0, 500),
    });
    if (!confirmacao.ok) {
      throw new ErroEnvio(
        `Há páginas de Brief que não respondem: ${confirmacao.falhados.map((f) => f.slug).join(", ")}`,
        409,
      );
    }
  }

  // 4) a edição web canónica é a própria aplicação (/edicoes/:numero): não
  //    depende de nenhum CMS externo, por isso já está pronta aqui.
  const estrutura = await composeRevistaEdition(edicaoId, { ignorarSnapshot: true });
  await gravarDestino(edicaoId, "web", { estado: "preparada", url: caminhoCanonicoEdicao(estrutura.edicao.numero), erro: null }, sb);
  await sb.from("nl_audit_log").insert({
    quem, accao: "Edição web preparada", detalhe: estrutura.urlPagina,
  });

  // 5) fotografia preparada — daqui em diante nada é recomposto.
  await prepararSnapshotRevista(edicaoId, estrutura, {
    emailHtml: montarHtmlRevista(estrutura),
    emailText: montarTextoRevista(estrutura),
    urlWeb: estrutura.urlPagina,
  });

  await sb.from("nl_audit_log").insert({
    quem,
    accao: "Edição Revista preparada (fotografia guardada)",
    detalhe: estrutura.urlPagina,
  });

  // 6) publicação web: a página passa a responder já, antes do email. Fica
  //    fora dos motores de busca até a edição ser efectivamente enviada.
  await gravarDestino(edicaoId, "web", { estado: "publica", erro: null }, sb);
  await sb.from("nl_audit_log").insert({
    quem, accao: "Edição web publicada (ainda fora dos motores de busca)", detalhe: estrutura.urlPagina,
  });

  // 7) confirmar que a página da edição responde antes de a anunciar no email.
  const web = await confirmarUrl(estrutura.urlPagina);
  await sb.from("nl_audit_log").insert({
    quem,
    accao: web.ok ? "Endereço da edição web confirmado" : "Endereço da edição web sem resposta",
    detalhe: `${estrutura.urlPagina} (${web.status})`,
  });
  if (!web.ok) {
    throw new ErroEnvio(`A página da edição não responde (${web.status}). O envio foi travado.`, 409);
  }

  // 8) backup no WordPress — tolerante: nunca impede o envio.
  const backup = await criarBackup({ edicaoId, quem });
  await sb.from("nl_audit_log").insert({
    quem,
    accao: backup.ok ? "Backup DigitalSprint.pt actualizado" : "Backup DigitalSprint.pt adiado (envio prossegue)",
    detalhe: backup.mensagem,
  });
}

/** HEAD com recurso a GET: confirma que um endereço nosso já responde. */
async function confirmarUrl(url: string): Promise<{ ok: boolean; status: number }> {
  try {
    let r = await fetch(url, { method: "HEAD", redirect: "follow" });
    if (r.status === 405 || r.status === 501) r = await fetch(url, { redirect: "follow" });
    return { ok: r.ok, status: r.status };
  } catch {
    return { ok: false, status: 0 };
  }
}



/**
 * Fase 1 — prepara todas as campanhas na E-goi (criar/actualizar rascunho)
 * ANTES de qualquer disparo. Nenhuma lista é enviada aqui.
 * Coloca também o bloqueio `envio_em_curso` para evitar disparos duplos.
 */
export async function prepararEnvio(opts: {
  userId?: string;
  quemNome?: string;
  edicaoId: string;
  listaIds: string[];
  confirmacaoNumero?: number;
  exigirConfirmacao?: boolean;
  publicarConteudos?: boolean;
}) {
  const sb = admin();
  const listasR = await resolverListas(sb, opts.listaIds);
  if (!listasR.ok) throw new ErroEnvio(listasR.mensagem);

  const quem = opts.userId
    ? (await autorizar(sb, opts.userId, listasR.modo)).nome
    : (opts.quemNome ?? "agendamento");

  // Real sends need destination public links and per-contact signed tokens (never e-mail-only links).
  if (listasR.modo === "real") {
    const { verificarLigacoesPublicas } = await import("../nl-publico-config.ts");
    const falta = verificarLigacoesPublicas();
    if (falta.length) throw new ErroEnvio(falta.join(" "), 412);
  }

  const { apiKey, senderId } = await credenciaisEgoi(sb);

  // Every real list must have its tokens fully synced, field validated and no pending failures.
  if (listasR.modo === "real") {
    const { problemasTokensEnvio } = await import("../nl-egoi-tokens-gate.ts");
    const p = await problemasTokensEnvio(sb, apiKey, listasR.listas.filter((l) => l.tipo === "real"));
    if (p.length) throw new ErroEnvio(`Tokens de subscrição por validar: ${p.join(" ")}`, 412);
  }

  const { data: edRaw } = await sb.from("nl_edicoes")
    .select("numero, estado, assunto, envio_em_curso").eq("id", opts.edicaoId).maybeSingle();
  if (!edRaw) throw new ErroEnvio("Edição não encontrada", 404);
  const ed = edRaw as { numero: number; estado: string; assunto: string | null; envio_em_curso: string | null };
  if (ed.estado === "enviada") throw new ErroEnvio("Edição já foi enviada.", 409);
  if (listasR.modo === "real" && opts.exigirConfirmacao !== false && Number(opts.confirmacaoNumero ?? 0) !== ed.numero) {
    throw new ErroEnvio("Número de confirmação não corresponde à edição.");
  }
  if (listasR.modo === "real" && ed.envio_em_curso && Date.now() - new Date(ed.envio_em_curso).getTime() < LOCK_MS) {
    throw new ErroEnvio("Já existe um envio em curso para esta edição. Aguarda que termine.", 409);
  }
  const { data: formatoRaw } = await sb.from("nl_edicoes")
    .select("template_version").eq("id", opts.edicaoId).maybeSingle();
  const revista = (formatoRaw as { template_version?: string } | null)?.template_version === "revista";

  if (revista && opts.publicarConteudos) {
    const { estadoDestinos } = await import("./revista/destinos.server.ts");
    const { publicarArtigoCronica, actualizarArtigoCronica } = await import("./revista/frederico-wordpress.server.ts");
    const antes = await estadoDestinos(opts.edicaoId);
    if (antes.cronica.estado !== "publicada" && antes.cronica.estado !== "manual") {
      const resultadoCronica = antes.cronica.estado === "desactualizada"
        ? await actualizarArtigoCronica({ edicaoId: opts.edicaoId, quem })
        : await publicarArtigoCronica({ edicaoId: opts.edicaoId, quem });
      if (!resultadoCronica.ok) {
        throw new ErroEnvio(`A crónica não ficou pública: ${resultadoCronica.mensagem}`, 409);
      }
    }
  }

  if (listasR.modo === "real") {
    await sb.from("nl_edicoes").update({ envio_em_curso: new Date().toISOString() }).eq("id", opts.edicaoId);
  }
  // Nos testes Revista também se confirma a experiência pública completa.
  // A pessoa autorizou explicitamente esta publicação no modal; a versão web
  // permanece fora dos motores de busca até ao primeiro envio real.
  if (revista && opts.publicarConteudos) {
    await prepararEdicaoRevista(sb, opts.edicaoId, quem, listasR.listas.map((l) => l.id));
  } else if (revista && listasR.modo === "real") {
    await prepararEdicaoRevista(sb, opts.edicaoId, quem, listasR.listas.map((l) => l.id));
  }


  const listas: ListaPreparada[] = [];
  for (let i = 0; i < listasR.listas.length; i++) {
    const lista = listasR.listas[i];
    if (i > 0) await sleep(6000);
    const s = await sincronizarUmaLista(sb, { edicaoId: opts.edicaoId, lista, apiKey, senderId, quem, permitirEnviada: true });
    if (!s.ok) {
      listas.push({ lista_id: lista.id, lista_nome: lista.nome, ok: false, erro: s.mensagem });
      await sb.from("nl_audit_log").insert({ quem, accao: `Erro a preparar campanha «${lista.nome}»`, detalhe: s.mensagem });
      continue;
    }
    const sr = s.resultado;
    listas.push({
      lista_id: lista.id,
      lista_nome: lista.nome,
      campaign_hash: sr.campaign_hash,
      ok: sr.ok && !!sr.campaign_hash,
      erro: sr.ok ? (sr.campaign_hash ? undefined : "Campanha sem identificador na E-goi") : sr.erro,
    });
  }

  return {
    ok: true as const,
    modo: listasR.modo,
    edicao: { numero: ed.numero, assunto: (ed.assunto ?? "").trim() || `Edição #${ed.numero}` },
    listas,
  };
}

/** Fase 2 — dispara uma única lista já preparada. */
export async function dispararLista(opts: {
  userId?: string;
  quemNome?: string;
  edicaoId: string;
  listaId: string;
}): Promise<ResDisparo> {
  const sb = admin();
  const listasR = await resolverListas(sb, [opts.listaId]);
  if (!listasR.ok) throw new ErroEnvio(listasR.mensagem);
  const lista = listasR.listas[0];

  const quem = opts.userId
    ? (await autorizar(sb, opts.userId, listasR.modo)).nome
    : (opts.quemNome ?? "agendamento");

  const { apiKey } = await credenciaisEgoi(sb);

  const { data: campRaw } = await sb.from("nl_egoi_campanhas")
    .select("campaign_hash").eq("edicao_id", opts.edicaoId).eq("lista_id", lista.id).maybeSingle();
  const hash = (campRaw as { campaign_hash?: string } | null)?.campaign_hash;
  if (!hash) {
    return { lista_id: lista.id, lista_nome: lista.nome, ok: false, sincronizada: false, erro: "Campanha não preparada para esta lista." };
  }

  const { data: edRaw } = await sb.from("nl_edicoes").select("numero").eq("id", opts.edicaoId).maybeSingle();
  const numero = (edRaw as { numero: number } | null)?.numero ?? 0;

  // Dá tempo à E-goi para consolidar o conteúdo antes da ordem de envio.
  await sleep(DELAY_ANTES_DISPARO_MS);
  const rD = await disparaCampanha({ apiKey }, hash, lista.egoi_lista_id);
  let confirmadoNaEgoi = false;
  let estadoBruto: string | null = null;
  if (!rD.ok) {
    // Um erro de rede/5xx não significa que a campanha não saiu: a E-goi é a
    // fonte da verdade. Só reportamos falha se ela confirmar que não enviou.
    const est = await estadoCampanha({ apiKey }, hash);
    if (est.ok && (est.estado === "enviada" || est.estado === "a_enviar")) {
      confirmadoNaEgoi = est.estado === "enviada";
      estadoBruto = est.bruto;
      await sb.from("nl_audit_log").insert({
        quem,
        accao: `Disparo sem resposta para «${lista.nome}», mas a E-goi já tem a campanha ${confirmadoNaEgoi ? "enviada" : "em envio"}`,
        detalhe: `campaign_hash ${hash} · ${rD.mensagem}`,
      });
    } else {
      await sb.from("nl_audit_log").insert({
        quem, accao: `Falha no disparo para «${lista.nome}»`, detalhe: `campaign_hash ${hash} · ${rD.mensagem}`,
      });
      return { lista_id: lista.id, lista_nome: lista.nome, ok: false, sincronizada: true, campaign_hash: hash, erro: rD.mensagem };
    }
  }

  // Aceitação do pedido ≠ entrega: fica "aceite" até a E-goi reportar "sent"
  // (confirmação aqui, na reconciliação ou na tarefa de conteúdos derivados).
  const agoraIso = new Date().toISOString();
  await sb.from("nl_egoi_campanhas")
    .update(confirmadoNaEgoi
      ? { estado: "enviada", estado_egoi: estadoBruto, aceite_em: agoraIso, confirmado_em: agoraIso, actualizado_em: agoraIso }
      : { estado: "aceite", estado_egoi: estadoBruto, aceite_em: agoraIso, actualizado_em: agoraIso })
    .eq("edicao_id", opts.edicaoId).eq("lista_id", lista.id);
  // Primeira lista aceite pela E-goi: a fotografia passa a definitiva e as
  // listas em falta receberão obrigatoriamente esta mesma versão.
  if (listasR.modo === "real") await bloquearSnapshotRevista(opts.edicaoId);
  await sb.from("nl_audit_log").insert({
    quem,
    accao: listasR.modo === "real"
      ? `E-goi aceitou o envio da edição #${numero} para «${lista.nome}»${confirmadoNaEgoi ? " (entrega confirmada)" : " (entrega por confirmar)"}`
      : `Disparou teste da edição #${numero} para «${lista.nome}»`,
    detalhe: `campaign_hash ${hash}`,
  });

  return { lista_id: lista.id, lista_nome: lista.nome, ok: true, sincronizada: true, campaign_hash: hash, confirmadoNaEgoi };
}

/**
 * Repete apenas uma lista que falhou: volta a preparar a campanha e dispara.
 * Nunca reenvia uma lista cuja campanha já esteja marcada como enviada.
 */
export async function repetirLista(opts: {
  userId?: string;
  quemNome?: string;
  edicaoId: string;
  listaId: string;
}): Promise<ResDisparo> {
  const sb = admin();
  const listasR = await resolverListas(sb, [opts.listaId]);
  if (!listasR.ok) throw new ErroEnvio(listasR.mensagem);
  const lista = listasR.listas[0];

  const quem = opts.userId
    ? (await autorizar(sb, opts.userId, listasR.modo)).nome
    : (opts.quemNome ?? "repetição");

  // Antes de repetir, confirma na E-goi: se a campanha já saiu, repetir
  // duplicaria os emails.
  await reconciliarEdicao(opts.edicaoId);

  const { data: campRaw } = await sb.from("nl_egoi_campanhas")
    .select("estado").eq("edicao_id", opts.edicaoId).eq("lista_id", lista.id).maybeSingle();
  const estadoCamp = (campRaw as { estado?: string } | null)?.estado;
  if (estadoCamp === "enviada" || estadoCamp === "aceite") {
    return {
      lista_id: lista.id, lista_nome: lista.nome, ok: false, sincronizada: true,
      erro: estadoCamp === "aceite"
        ? "A E-goi já aceitou o envio para esta lista (entrega por confirmar) — não foi repetida."
        : "Esta lista já recebeu esta edição — não foi repetida.",
    };
  }

  const { apiKey, senderId } = await credenciaisEgoi(sb);
  const s = await sincronizarUmaLista(sb, {
    edicaoId: opts.edicaoId, lista, apiKey, senderId, quem, permitirEnviada: true,
  });
  if (!s.ok) {
    await sb.from("nl_audit_log").insert({ quem, accao: `Repetição falhou a preparar «${lista.nome}»`, detalhe: s.mensagem });
    return { lista_id: lista.id, lista_nome: lista.nome, ok: false, sincronizada: false, erro: s.mensagem };
  }
  if (!s.resultado.ok || !s.resultado.campaign_hash) {
    return {
      lista_id: lista.id, lista_nome: lista.nome, ok: false, sincronizada: false,
      erro: s.resultado.erro ?? "Campanha sem identificador na E-goi",
    };
  }

  await sb.from("nl_audit_log").insert({ quem, accao: `Repetiu o envio da lista «${lista.nome}»` });
  return dispararLista({ userId: opts.userId, quemNome: opts.quemNome, edicaoId: opts.edicaoId, listaId: lista.id });
}

/** Fase 3 — liberta o bloqueio e fecha a edição (só em modo real e com sucessos). */
export async function finalizarEnvio(opts: {
  userId?: string;
  quemNome?: string;
  edicaoId: string;
  listaIds: string[];
  /** Quando há listas por repetir, liberta o bloqueio mas não fecha a edição. */
  adiarFecho?: boolean;
}) {

  const sb = admin();
  const listasR = await resolverListas(sb, opts.listaIds);
  if (!listasR.ok) throw new ErroEnvio(listasR.mensagem);
  const quem = opts.userId
    ? (await autorizar(sb, opts.userId, listasR.modo)).nome
    : (opts.quemNome ?? "agendamento");

  await sb.from("nl_edicoes").update({ envio_em_curso: null }).eq("id", opts.edicaoId);
  if (listasR.modo !== "real") return { ok: true as const, fechada: false };
  // Com listas por repetir, a edição fica aberta para que a repetição consiga
  // voltar a preparar a campanha em falta.
  if (opts.adiarFecho) return { ok: true as const, fechada: false };


  // A E-goi é a fonte da verdade: reconciliar ANTES de decidir fechar ou descartar.
  await reconciliarEdicao(opts.edicaoId);

  const nomes = new Map(listasR.listas.map((l) => [l.id, l.nome]));
  const { data: campsRaw } = await sb.from("nl_egoi_campanhas")
    .select("lista_id, campaign_hash, estado").eq("edicao_id", opts.edicaoId);
  const camps = (campsRaw ?? []) as { lista_id: string; campaign_hash: string; estado: string }[];
  const aceites = camps.filter((c) => c.estado === "aceite" && nomes.has(c.lista_id));
  if (aceites.length) {
    // Pedido aceite mas entrega por confirmar: nunca descartar nem fechar já.
    // A reconciliação seguinte fecha a edição quando a E-goi reportar "sent".
    await sb.from("nl_edicoes").update({ fecho_pendente_em: new Date().toISOString(), fecho_pendente_por: quem }).eq("id", opts.edicaoId);
    await sb.from("nl_audit_log").insert({
      quem,
      accao: `Fecho pedido — ${aceites.length} lista(s) aceite(s) pela E-goi com entrega por confirmar`,
    });
    return { ok: true as const, fechada: false, aguarda_confirmacao: aceites.length };
  }
  const sucessos = camps
    .filter((c) => c.estado === "enviada" && nomes.has(c.lista_id))
    .map((c) => ({ campaign_hash: c.campaign_hash, lista_id: c.lista_id, lista_nome: nomes.get(c.lista_id)! }));
  if (!sucessos.length) {
    // Nenhuma lista aceite: a fotografia preparada é descartada e a edição
    // volta a ser editável para se corrigir e voltar a tentar.
    if (await descartarSnapshotPreparado(opts.edicaoId)) {
      await sb.from("nl_audit_log").insert({
        quem,
        accao: "Envio sem sucesso — fotografia da edição descartada, edição de novo editável",
      });
    }
    // A página web preparada deixa de ser servida ao público. Os Briefs
    // mantêm estado, texto e histórico: ficam apenas sem edição pública.
    await gravarDestino(opts.edicaoId, "web", { estado: "preparada", erro: null }, sb);
    await sb.from("nl_audit_log").insert({
      quem,
      accao: "Edição web despublicada — os Briefs mantêm-se, sem página pública",
    });
    return { ok: true as const, fechada: false };
  }

  const falhas = listasR.listas
    .filter((l) => !sucessos.some((s) => s.lista_id === l.id))
    .map((l) => ({ lista_id: l.id, lista_nome: l.nome }));

  const { data: edRaw } = await sb.from("nl_edicoes").select("numero, assunto").eq("id", opts.edicaoId).maybeSingle();
  const ed = edRaw as { numero: number; assunto: string | null } | null;
  const assunto = (ed?.assunto ?? "").trim() || `Edição #${ed?.numero ?? ""}`;
  const { html } = await renderEdicaoEmail(opts.edicaoId);

  const fechada = await fecharEdicaoEnviada(sb, opts.edicaoId, { quem, assunto, html, sucessos, falhas });
  if (fechada) await sb.from("nl_edicoes").update({ fecho_pendente_em: null, fecho_pendente_por: null }).eq("id", opts.edicaoId);
  // Derived content: idempotent durable job (no AI here, never affects the send result).
  if (fechada) {
    const { enfileirarCarrossel } = await import("../conteudos/jobs.server.ts");
    await enfileirarCarrossel(opts.edicaoId, "envio");
  }
  return { ok: true as const, fechada };
}

/**
 * Fluxo completo (usado pelo motor agendado e como alternativa ao fluxo
 * passo-a-passo do cockpit): prepara TODAS as campanhas, só depois dispara
 * lista a lista com pausa, e fecha a edição no fim.
 */
export async function dispararEgoi(opts: {
  userId?: string;
  quemNome?: string;
  edicaoId: string;
  listaIds: string[];
  confirmacaoNumero?: number;
  exigirConfirmacao?: boolean;
}) {
  const prep = await prepararEnvio(opts);

  const resultados: ResDisparo[] = [];
  let disparadas = 0;
  for (const l of prep.listas) {
    if (!l.ok) {
      resultados.push({ lista_id: l.lista_id, lista_nome: l.lista_nome, ok: false, erro: l.erro, sincronizada: false, campaign_hash: l.campaign_hash });
      continue;
    }
    if (disparadas > 0) await sleep(DELAY_ENTRE_DISPAROS_MS);
    disparadas++;
    resultados.push(await dispararLista({
      userId: opts.userId, quemNome: opts.quemNome, edicaoId: opts.edicaoId, listaId: l.lista_id,
    }));
  }

  await finalizarEnvio({ userId: opts.userId, quemNome: opts.quemNome, edicaoId: opts.edicaoId, listaIds: opts.listaIds });

  const sucessos = resultados.filter((r) => r.ok);
  const falhas = resultados.filter((r) => !r.ok);

  return {
    ok: sucessos.length > 0 && falhas.length === 0,
    modo: prep.modo,
    resultados,
    sucessos: sucessos.length,
    falhas: falhas.length,
    mensagem: falhas.length > 0
      ? `Aceite pela E-goi para ${sucessos.length} de ${prep.listas.length} lista(s); ${falhas.length} falha(s). ` +
        falhas.map((x) => `${x.lista_nome}: ${x.erro}`).join(" · ")
      : `Aceite pela E-goi para ${sucessos.length} lista(s). A entrega é confirmada quando a E-goi a reportar.`,
  };
}

/* ─────────── WordPress ─────────── */

export async function publicarWordpress(opts: {
  edicaoId: string;
  userId?: string;
  quemNome?: string;
  /** Clássico publica; o backup Revista escreve em `private`. */
  status?: "draft" | "publish" | "private";
  /** Metadados Rank Math defensivos (noindex/canonical) — só no backup Revista. */
  meta?: Record<string, unknown>;
}) {
  const sb = admin();
  const quem = opts.userId ? (await autorizar(sb, opts.userId, "real")).nome : (opts.quemNome ?? "agendamento");

  const siteUrl = process.env.WORDPRESS_SITE_URL ?? "";
  const wpUser = process.env.WORDPRESS_APP_USER ?? "";
  const wpPass = process.env.WORDPRESS_APP_PASSWORD ?? "";
  if (!siteUrl || !wpUser || !wpPass) {
    throw new ErroEnvio("WordPress não configurado (falta WORDPRESS_SITE_URL, WORDPRESS_APP_USER ou WORDPRESS_APP_PASSWORD).");
  }

  const config = await lerConfig(sb);
  const wp = await publicarOuActualizarLicaoEdicao(sb, {
    edicaoId: opts.edicaoId,
    status: opts.status ?? "publish",
    meta: opts.meta,
    config: lerConfigWp(config),
    siteUrl, user: wpUser, password: wpPass,
    quem,
  });
  if (!wp.ok) throw new ErroEnvio(wp.mensagem, 502);

  return {
    ok: true as const,
    post_id: wp.post_id,
    post_url: wp.post_url,
    status: wp.status,
    actualizada: wp.actualizada,
    mensagem: wp.actualizada ? "Página actualizada no WordPress ✓" : "Página escrita no WordPress ✓",
  };
}
