import process from "node:process";
// Gestão de subscrição (cancelar / pausar / receber só o essencial) — server-only.
//
// O link no rodapé da newsletter traz um token assinado (HMAC) com o email do
// subscritor. O token não expira — um link de cancelamento tem de funcionar
// meses depois — mas não pode ser forjado nem alterado.

import { createHmac, timingSafeEqual } from "node:crypto";
import { cancelarNaEgoi, reactivarNaEgoi } from "../../newsletter-engine/subscricao-egoi.server.ts";

export type Accao = "cancelar" | "pausar" | "mensal" | "reverter";
export type AccaoRegisto = "cancelado" | "pausado" | "mensal" | "reactivado" | "revertido";

export interface EstadoSubscricao {
  ok: boolean;
  email: string | null;
  /** Estado actual conhecido a partir do último evento registado. */
  estado: "activa" | "cancelada" | "pausada" | "mensal";
  /** Data em que a subscrição volta sozinha (pausa ou ciclo mensal). */
  retomaEm: string | null;
  mensagem?: string;
}

const B64 = {
  encode: (s: string) => Buffer.from(s, "utf8").toString("base64url"),
  decode: (s: string) => Buffer.from(s, "base64url").toString("utf8"),
};

function segredo(): string {
  const s = process.env.SUBSCRICAO_SEGREDO;
  if (!s) throw new Error("SUBSCRICAO_SEGREDO em falta");
  return s;
}

function assinar(payload: string): string {
  return createHmac("sha256", segredo()).update(payload).digest("base64url");
}

/** Gera o token para o link do rodapé. */
export function criarToken(email: string): string {
  const corpo = B64.encode(JSON.stringify({ e: email.trim().toLowerCase(), v: 1 }));
  return `${corpo}.${assinar(corpo)}`;
}

/** Valida o token e devolve o email; `null` se for inválido. */
export function lerToken(token: string): string | null {
  const [corpo, assinatura] = (token ?? "").split(".");
  if (!corpo || !assinatura) return null;
  const esperada = Buffer.from(assinar(corpo));
  const recebida = Buffer.from(assinatura);
  if (esperada.length !== recebida.length || !timingSafeEqual(esperada, recebida)) return null;
  try {
    const dados = JSON.parse(B64.decode(corpo)) as { e?: string };
    const email = (dados.e ?? "").trim().toLowerCase();
    return email.includes("@") ? email : null;
  } catch {
    return null;
  }
}

/** Chave partilhada para o webhook da E-goi (derivada do segredo, nunca o segredo). */
export function chaveWebhookEgoi(): string {
  return assinar("webhook:egoi:v1").slice(0, 32);
}

/** Regista um cancelamento feito fora da aplicação (link nativo da E-goi). */
export async function registarCancelamentoExterno(
  emailBruto: string,
  detalhe: Record<string, unknown> = {},
): Promise<void> {
  const email = emailBruto.trim().toLowerCase();
  if (!emailValido(email)) return;
  const actual = await estadoPorEmail(email);
  if (actual.estado === "cancelada") return; // já registado
  await registar({ email, accao: "cancelado", origem: "egoi", motivo: "Cancelado na E-goi", detalhe });
}

function emailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

async function admin() {
  const { supabaseAdmin } = await import("../_shim/admin.ts");
  return supabaseAdmin;
}

async function listasReais(): Promise<Array<{ id: string; nome: string; egoi_lista_id: string }>> {
  const db = await admin();
  const { data } = await db
    .from("nl_egoi_listas")
    .select("id, nome, egoi_lista_id, tipo, activa")
    .eq("tipo", "real")
    .eq("activa", true);
  return (data ?? []).map((l) => ({ id: l.id, nome: l.nome, egoi_lista_id: l.egoi_lista_id }));
}

async function chaveEgoi(): Promise<string | null> {
  const daEnv = process.env.EGOI_API_KEY;
  if (daEnv) return daEnv;
  const db = await admin();
  const { data } = await db.from("nl_configuracoes").select("valor").eq("chave", "egoi_api_key").maybeSingle();
  return data?.valor ?? null;
}

/** Primeiro dia do mês seguinte, às 08:00 UTC. */
function primeiroDoMesSeguinte(base = new Date()): Date {
  return new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 1, 8, 0, 0));
}

function daquiADias(dias: number, base = new Date()): Date {
  return new Date(base.getTime() + dias * 24 * 60 * 60 * 1000);
}

/** Lê o estado actual a partir do último evento registado para o email. */
export async function estadoSubscricao(token: string): Promise<EstadoSubscricao> {
  const email = lerToken(token);
  if (!email) {
    return { ok: false, email: null, estado: "activa", retomaEm: null, mensagem: "Ligação inválida ou incompleta." };
  }
  return estadoPorEmail(email);
}

export async function estadoPorEmail(emailBruto: string): Promise<EstadoSubscricao> {
  const email = emailBruto.trim().toLowerCase();
  if (!emailValido(email)) {
    return { ok: false, email: null, estado: "activa", retomaEm: null, mensagem: "Email inválido." };
  }
  const db = await admin();
  const { data } = await db
    .from("nl_subscricao_eventos")
    .select("accao, retoma_em, retomado_em, criado_em")
    .eq("email", email)
    .order("criado_em", { ascending: false })
    .limit(1);

  const ultimo = data?.[0];
  if (!ultimo) return { ok: true, email, estado: "activa", retomaEm: null };

  const mapa: Record<string, EstadoSubscricao["estado"]> = {
    cancelado: "cancelada",
    pausado: "pausada",
    mensal: "mensal",
    reactivado: "activa",
    revertido: "activa",
  };
  return {
    ok: true,
    email,
    estado: mapa[ultimo.accao] ?? "activa",
    retomaEm: ultimo.retomado_em ? null : (ultimo.retoma_em ?? null),
  };
}

interface ResultadoAccao {
  ok: boolean;
  estado: EstadoSubscricao["estado"];
  retomaEm: string | null;
  mensagem: string;
  /** Verdadeiro quando a E-goi não confirmou a operação em nenhuma lista. */
  avisoEgoi?: boolean;
}

async function aplicarNaEgoi(
  email: string,
  operacao: "cancelar" | "reactivar",
): Promise<{ algumaOk: boolean; detalhe: Record<string, unknown> }> {
  const apiKey = await chaveEgoi();
  if (!apiKey) return { algumaOk: false, detalhe: { erro: "EGOI_API_KEY em falta" } };

  const listas = await listasReais();
  const detalhe: Record<string, unknown> = {};
  let algumaOk = false;
  for (const lista of listas) {
    const r = operacao === "cancelar"
      ? await cancelarNaEgoi(apiKey, lista.egoi_lista_id, email)
      : await reactivarNaEgoi(apiKey, lista.egoi_lista_id, email);
    detalhe[lista.nome] = r.ok ? { ok: true, via: r.via } : { ok: false, erro: r.erro };
    if (r.ok) algumaOk = true;
  }
  return { algumaOk, detalhe };
}

async function registar(row: {
  email: string;
  accao: AccaoRegisto;
  motivo?: string | null;
  retoma_em?: string | null;
  origem?: string;
  detalhe?: Record<string, unknown>;
}): Promise<void> {
  const db = await admin();
  const { error } = await db.from("nl_subscricao_eventos").insert({
    email: row.email,
    accao: row.accao,
    motivo: row.motivo ?? null,
    retoma_em: row.retoma_em ?? null,
    origem: row.origem ?? "email",
    detalhe: (row.detalhe ?? {}) as never,
  });
  if (error) console.error("[subscricao] falha a registar evento:", error);
}

/** Executa a acção escolhida pelo subscritor. */
export async function aplicarAccao(input: {
  token?: string | null;
  email?: string | null;
  accao: Accao;
  motivo?: string | null;
  /** De onde veio o pedido: página, um clique no cliente de email, E-goi, automático. */
  origem?: string;
}): Promise<ResultadoAccao> {
  const email = input.token ? lerToken(input.token) : (input.email ?? "").trim().toLowerCase();
  if (!email || !emailValido(email)) {
    return { ok: false, estado: "activa", retomaEm: null, mensagem: "Não foi possível identificar o teu email." };
  }
  const origem = input.origem ?? "email";


  if (input.accao === "reverter") {
    const r = await aplicarNaEgoi(email, "reactivar");
    await registar({ email, accao: "revertido", origem, detalhe: r.detalhe });
    return {
      ok: true,
      estado: "activa",
      retomaEm: null,
      mensagem: "Subscrição reposta. Continuas a receber a Digital Sprint.",
      avisoEgoi: !r.algumaOk,
    };
  }

  const r = await aplicarNaEgoi(email, "cancelar");

  if (input.accao === "cancelar") {
    await registar({ email, accao: "cancelado", motivo: input.motivo ?? null, origem, detalhe: r.detalhe });
    return {
      ok: true,
      estado: "cancelada",
      retomaEm: null,
      mensagem: "Pronto. Já não vais receber a Digital Sprint.",
      avisoEgoi: !r.algumaOk,
    };
  }

  if (input.accao === "pausar") {
    const retoma = daquiADias(30);
    await registar({ email, accao: "pausado", retoma_em: retoma.toISOString(), origem, detalhe: r.detalhe });
    return {
      ok: true,
      estado: "pausada",
      retomaEm: retoma.toISOString(),
      mensagem: "Pausa activa. Voltas a receber daqui a um mês, sem fazeres nada.",
      avisoEgoi: !r.algumaOk,
    };
  }

  // mensal: fica de fora e volta no primeiro dia de cada mês, automaticamente.
  const retoma = primeiroDoMesSeguinte();
  await registar({
    email,
    accao: "mensal",
    origem,
    retoma_em: retoma.toISOString(),
    detalhe: { ...r.detalhe, fase: "reactivar" },
  });
  return {
    ok: true,
    estado: "mensal",
    retomaEm: retoma.toISOString(),
    mensagem: "Combinado. Passas a receber só a primeira edição de cada mês.",
    avisoEgoi: !r.algumaOk,
  };
}

/**
 * Tarefa diária: reactiva pausas terminadas e faz rodar o ciclo mensal.
 * Idempotente — cada evento é marcado como tratado (`retomado_em`).
 */
export async function processarRetomas(): Promise<{ tratados: number; falhas: number }> {
  const db = await admin();
  const agora = new Date().toISOString();
  const { data } = await db
    .from("nl_subscricao_eventos")
    .select("id, email, accao, retoma_em, detalhe")
    .lte("retoma_em", agora)
    .is("retomado_em", null)
    .in("accao", ["pausado", "mensal"])
    .limit(200);

  let tratados = 0;
  let falhas = 0;

  for (const ev of data ?? []) {
    // Quem cancelou entretanto (na página, num clique ou na própria E-goi)
    // nunca é reactivado automaticamente.
    const actual = await estadoPorEmail(ev.email);
    if (actual.estado === "cancelada") {
      await db.from("nl_subscricao_eventos").update({ retomado_em: new Date().toISOString() }).eq("id", ev.id);
      continue;
    }
    const fase = ((ev.detalhe as { fase?: string } | null)?.fase) ?? "reactivar";
    const operacao = fase === "pausar" ? "cancelar" : "reactivar";
    const r = await aplicarNaEgoi(ev.email, operacao);
    if (!r.algumaOk) falhas += 1;

    await db.from("nl_subscricao_eventos").update({ retomado_em: new Date().toISOString() }).eq("id", ev.id);

    if (ev.accao === "pausado") {
      await registar({ email: ev.email, accao: "reactivado", origem: "automatico", detalhe: r.detalhe });
    } else if (fase === "reactivar") {
      // Recebeu a edição do mês: agenda nova pausa daqui a 5 dias.
      await registar({
        email: ev.email,
        accao: "mensal",
        origem: "automatico",
        retoma_em: daquiADias(5).toISOString(),
        detalhe: { ...r.detalhe, fase: "pausar" },
      });
    } else {
      // Saiu outra vez: volta no primeiro dia do mês seguinte.
      await registar({
        email: ev.email,
        accao: "mensal",
        origem: "automatico",
        retoma_em: primeiroDoMesSeguinte().toISOString(),
        detalhe: { ...r.detalhe, fase: "reactivar" },
      });
    }
    tratados += 1;
  }

  return { tratados, falhas };
}

export interface PassoTeste { passo: string; ok: boolean; detalhe: string }

/**
 * Teste controlado do fluxo completo com um email real:
 * pausa → lê estado → reverte. Não deixa o subscritor fora da lista.
 */
export async function testarFluxo(emailBruto: string): Promise<{ ok: boolean; passos: PassoTeste[] }> {
  const email = emailBruto.trim().toLowerCase();
  const passos: PassoTeste[] = [];
  if (!emailValido(email)) {
    return { ok: false, passos: [{ passo: "Email", ok: false, detalhe: "Email inválido." }] };
  }

  const apiKey = await chaveEgoi();
  passos.push({
    passo: "Chave da E-goi",
    ok: Boolean(apiKey),
    detalhe: apiKey ? "Disponível." : "Em falta — as chamadas à E-goi vão falhar.",
  });

  const inicial = await estadoPorEmail(email);
  passos.push({ passo: "Estado inicial", ok: true, detalhe: `Estado registado: ${inicial.estado}.` });

  const pausa = await aplicarAccao({ email, accao: "pausar", origem: "teste" });
  passos.push({
    passo: "Pausar 30 dias",
    ok: pausa.ok && !pausa.avisoEgoi,
    detalhe: pausa.avisoEgoi
      ? "Registado na aplicação, mas a E-goi não confirmou em nenhuma lista."
      : "Pausa aplicada e confirmada na E-goi.",
  });

  const depois = await estadoPorEmail(email);
  passos.push({
    passo: "Confirmar estado",
    ok: depois.estado === "pausada",
    detalhe: `Estado lido: ${depois.estado}.`,
  });

  const reposto = await aplicarAccao({ email, accao: "reverter", origem: "teste" });
  passos.push({
    passo: "Repor subscrição",
    ok: reposto.ok && !reposto.avisoEgoi,
    detalhe: reposto.avisoEgoi
      ? "Registado na aplicação, mas a E-goi não confirmou a reactivação."
      : "Subscrição reposta na E-goi.",
  });

  return { ok: passos.every((p) => p.ok), passos };
}
