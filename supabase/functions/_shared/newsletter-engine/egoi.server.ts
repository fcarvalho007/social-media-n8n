import { linkUmClique } from "../nl-publico-config.ts";
import { consultarEstadoCampanha } from "./egoi-estado.ts";
// Helpers partilhados para chamadas à API E-goi.
// A API separa metadados de campanha (subject, sender, list) do conteúdo HTML.
// Para "actualizar rascunho" fazemos PATCH aos dois recursos.

/** Cabeçalhos de cancelamento de um clique enviados com a campanha. */
const URL_UM_CLIQUE = linkUmClique();
const CABECALHOS_UNSUBSCRIBE = {
  "List-Unsubscribe": `<${URL_UM_CLIQUE}>`,
  "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
};

const BASE = "https://api.egoiapp.com";

export interface EgoiConfig { apiKey: string; }

interface EgoiErro { ok: false; status: number; mensagem: string; detalhe?: unknown; retriavel?: boolean }
interface OkCriacao { ok: true; campaign_hash: string; }
interface OkVoid { ok: true; }

function headers(apiKey: string): HeadersInit {
  return { "Apikey": apiKey, "Accept": "application/json", "Content-Type": "application/json" };
}

/** Estados temporários da E-goi (gateway/indisponibilidade) que compensa repetir. */
const ESTADOS_TEMPORARIOS = new Set([408, 425, 429, 500, 502, 503, 504]);
const PAUSAS_MS = [1000, 3000, 6000];
const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Executa um pedido à E-goi repetindo automaticamente em falhas temporárias
 * (502/503/504, timeouts, erros de rede). Erros 4xx de conteúdo não repetem.
 */
async function pedidoComRepeticao(fazer: () => Promise<Response>): Promise<{ ok: true; resposta: Response } | { ok: false; erroRede: string }> {
  let ultimoErro = "Falha de rede ao contactar a E-goi";
  for (let tentativa = 0; tentativa <= PAUSAS_MS.length; tentativa++) {
    if (tentativa > 0) await pausa(PAUSAS_MS[tentativa - 1]);
    try {
      const r = await fazer();
      if (r.ok || !ESTADOS_TEMPORARIOS.has(r.status) || tentativa === PAUSAS_MS.length) {
        return { ok: true, resposta: r };
      }
      ultimoErro = `E-goi respondeu ${r.status}`;
    } catch (e) {
      ultimoErro = (e as Error).message ?? ultimoErro;
      if (tentativa === PAUSAS_MS.length) return { ok: false, erroRede: ultimoErro };
    }
  }
  return { ok: false, erroRede: ultimoErro };
}

function erroRede(prefixo: string, mensagem: string): EgoiErro {
  return {
    ok: false,
    status: 0,
    retriavel: true,
    mensagem: `${prefixo}: a E-goi não respondeu (falha temporária) — ${mensagem}. Podes repetir esta lista.`,
  };
}


async function parseErro(r: Response, prefixo: string): Promise<EgoiErro> {
  const rawText = await r.text().catch(() => "");
  let body: unknown = {};
  try { body = rawText ? JSON.parse(rawText) : {}; } catch { body = {}; }
  const b = body as {
    message?: string;
    title?: string;
    detail?: string;
    error_description?: string;
    errors?: unknown;
    violations?: Array<{ propertyPath?: string; message?: string }>;
  };
  const base = b.message ?? b.title ?? b.detail ?? b.error_description ?? r.statusText ?? "Erro";

  const partes: string[] = [];

  const descreverValor = (v: unknown): string => {
    if (v == null) return "?";
    if (Array.isArray(v)) return v.map((x) => descreverValor(x)).join("; ");
    if (typeof v === "object") {
      const o = v as Record<string, unknown>;
      if (Array.isArray(o.errors)) return (o.errors as unknown[]).map((x) => descreverValor(x)).join("; ");
      try { return JSON.stringify(o); } catch { return String(o); }
    }
    return String(v);
  };

  const walk = (nodo: unknown, prefixoCampo: string) => {
    if (nodo == null) return;
    if (Array.isArray(nodo)) { partes.push(`${prefixoCampo || "?"}: ${nodo.map(descreverValor).join("; ")}`); return; }
    if (typeof nodo === "object") {
      const o = nodo as Record<string, unknown>;
      if (Array.isArray(o.errors) && o.errors.length) {
        partes.push(`${prefixoCampo || "?"}: ${(o.errors as unknown[]).map(descreverValor).join("; ")}`);
      }
      if (o.children && typeof o.children === "object") {
        for (const [k, v] of Object.entries(o.children as Record<string, unknown>)) {
          walk(v, prefixoCampo ? `${prefixoCampo}.${k}` : k);
        }
      }
      if (!Array.isArray(o.errors) && !o.children) {
        for (const [k, v] of Object.entries(o)) {
          const campo = prefixoCampo ? `${prefixoCampo}.${k}` : k;
          partes.push(`${campo}: ${descreverValor(v)}`);
        }
      }
    } else {
      partes.push(`${prefixoCampo || "?"}: ${descreverValor(nodo)}`);
    }
  };

  if (b.errors) walk(b.errors, "");
  if (Array.isArray(b.violations)) {
    for (const v of b.violations) {
      if (v?.propertyPath || v?.message) partes.push(`${v.propertyPath ?? "?"}: ${v.message ?? "?"}`);
    }
  }

  let detalheLegivel = partes.length ? ` — ${partes.join(" | ")}` : "";
  if (!partes.length && rawText && !base.includes(rawText.slice(0, 40))) {
    detalheLegivel = ` — corpo: ${rawText.slice(0, 400)}`;
  }
  return {
    ok: false,
    status: r.status,
    retriavel: ESTADOS_TEMPORARIOS.has(r.status),
    mensagem: ESTADOS_TEMPORARIOS.has(r.status)
      ? `${prefixo} [${r.status}]: a E-goi não respondeu (falha temporária). Podes repetir esta lista. — ${base}${detalheLegivel}`
      : `${prefixo} [${r.status}]: ${base}${detalheLegivel}`,
    detalhe: body,
  };
}


/** POST /campaigns/email — cria os metadados e envia o HTML no mesmo pedido. Devolve o campaign_hash. */
export async function criarCampanha(cfg: EgoiConfig, opts: {
  listaId: string;
  internalName: string;
  subject: string;
  senderId: string;
  html: string;
  plainText?: string;
}): Promise<OkCriacao | EgoiErro> {
  if (!opts.html || !opts.html.trim()) {
    return { ok: false, status: 400, mensagem: "HTML da newsletter não foi gerado — verifica se a edição tem conteúdo" };
  }
  // O corpo em texto simples melhora a entregabilidade (multipart alternative).
  // Se a API rejeitar o campo, repetimos sem ele — o envio nunca fica bloqueado por isto.
  const corpoPedido = (comTexto: boolean, comCabecalhos: boolean) => JSON.stringify({
    list_id: Number(opts.listaId),
    internal_name: opts.internalName,
    subject: opts.subject,
    sender_id: Number(opts.senderId),
    type: "email",
    // E-goi exige content.body (não content_html) — caso contrário devolve 422 "body isEmpty".
    content: comTexto && opts.plainText
      ? { type: "html", body: opts.html, plain_text: opts.plainText }
      : { type: "html", body: opts.html },
    // Cancelamento de um clique (RFC 8058). Se a conta não aceitar cabeçalhos
    // personalizados, repetimos sem eles — a E-goi injecta o link nativo.
    ...(comCabecalhos ? { headers: CABECALHOS_UNSUBSCRIBE } : {}),
  });

  // Ordem de tentativa: tudo → sem cabeçalhos → sem texto simples.
  const temTexto = Boolean(opts.plainText);
  const variantes: Array<[boolean, boolean]> = temTexto
    ? [[true, true], [true, false], [false, false]]
    : [[false, true], [false, false]];
  let r: Response | null = null;
  for (const [comTexto, comCabecalhos] of variantes) {
    const p = await pedidoComRepeticao(() => fetch(`${BASE}/campaigns/email`, {
      method: "POST", headers: headers(cfg.apiKey), body: corpoPedido(comTexto, comCabecalhos),
    }));
    if (!p.ok) return erroRede("E-goi (criar campanha)", p.erroRede);
    r = p.resposta;
    if (r.ok || r.status !== 422) break;
  }
  if (!r) return { ok: false, status: 502, mensagem: "E-goi: sem resposta ao criar campanha" };
  if (!r.ok) return parseErro(r, "E-goi (criar campanha)");

  const body = await r.json().catch(() => ({}));
  const hash = String((body as { campaign_hash?: string; id?: string | number })?.campaign_hash
    ?? (body as { id?: string | number })?.id ?? "");
  if (!hash) return { ok: false, status: 502, mensagem: "E-goi: resposta sem campaign_hash", detalhe: body };
  return { ok: true, campaign_hash: hash };
}


/** PATCH /campaigns/email/{hash} — actualiza meta e/ou conteúdo num único pedido. */
export async function patchCampanha(cfg: EgoiConfig, hash: string, opts: {
  internalName?: string;
  subject?: string;
  senderId?: string;
  html?: string;
  plainText?: string;
}): Promise<OkVoid | EgoiErro> {
  const payload: Record<string, unknown> = {};
  if (opts.internalName) payload.internal_name = opts.internalName;
  if (opts.subject) payload.subject = opts.subject;
  if (opts.senderId) payload.sender_id = Number(opts.senderId);
  if (opts.html !== undefined) {
    if (!opts.html || !opts.html.trim()) {
      return { ok: false, status: 400, mensagem: "HTML da newsletter não foi gerado — verifica se a edição tem conteúdo" };
    }
    payload.content = opts.plainText
      ? { type: "html", body: opts.html, plain_text: opts.plainText }
      : { type: "html", body: opts.html };
  }
  const p1 = await pedidoComRepeticao(() => fetch(`${BASE}/campaigns/email/${hash}`, {
    method: "PATCH",
    headers: headers(cfg.apiKey),
    body: JSON.stringify(payload),
  }));
  if (!p1.ok) return erroRede("E-goi (patch campanha)", p1.erroRede);
  let r = p1.resposta;
  if (!r.ok && r.status === 422 && opts.plainText && opts.html) {
    // A API pode não aceitar o corpo em texto — repetimos só com HTML.
    const p2 = await pedidoComRepeticao(() => fetch(`${BASE}/campaigns/email/${hash}`, {
      method: "PATCH",
      headers: headers(cfg.apiKey),
      body: JSON.stringify({ ...payload, content: { type: "html", body: opts.html } }),
    }));
    if (!p2.ok) return erroRede("E-goi (patch campanha)", p2.erroRede);
    r = p2.resposta;
  }
  if (!r.ok) return parseErro(r, "E-goi (patch campanha)");
  return { ok: true };
}


/**
 * POST /campaigns/email/{hash}/actions/send — dispara.
 * Sem repetição automática: um 5xx pode significar que o disparo já seguiu,
 * e repetir arriscaria enviar duas vezes para os mesmos contactos.
 */
export async function disparaCampanha(cfg: EgoiConfig, hash: string, listaId: string): Promise<OkVoid | EgoiErro> {
  let r: Response;
  try {
    r = await fetch(`${BASE}/campaigns/email/${hash}/actions/send`, {
      method: "POST",
      headers: headers(cfg.apiKey),
      body: JSON.stringify({ list_id: Number(listaId), segments: { type: "none" } }),
    });
  } catch (e) {
    return { ok: false, status: 0, retriavel: false, mensagem: `E-goi (envio): sem resposta da E-goi — ${(e as Error).message}. Confirma na E-goi antes de repetir.` };
  }
  if (!r.ok) return parseErro(r, "E-goi (envio)");
  return { ok: true };
}

/**
 * GET /campaigns/email/{hash} — lê o estado real da campanha na E-goi.
 * Serve de fonte da verdade quando um disparo não devolveu resposta fiável.
 */
export async function estadoCampanha(
  cfg: EgoiConfig,
  hash: string,
): Promise<{ ok: true; estado: "enviada" | "a_enviar" | "rascunho" | "desconhecido"; bruto: string } | EgoiErro> {
  // Documented lookup: GET /campaigns?channel=email&campaign_hash=… ; only exact hash+channel, status "sent" = delivered.
  return consultarEstadoCampanha(cfg.apiKey, hash);
}




