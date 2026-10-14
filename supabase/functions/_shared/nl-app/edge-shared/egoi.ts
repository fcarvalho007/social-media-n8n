// Helpers partilhados para chamadas à API E-goi.
// A API separa metadados de campanha (subject, sender, list) do conteúdo HTML.
// Para "actualizar rascunho" fazemos PATCH aos dois recursos.

const BASE = "https://api.egoiapp.com";

export interface EgoiConfig { apiKey: string; }

interface EgoiErro { ok: false; status: number; mensagem: string; detalhe?: unknown; }
interface OkCriacao { ok: true; campaign_hash: string; }
interface OkVoid { ok: true; }

function headers(apiKey: string): HeadersInit {
  return { "Apikey": apiKey, "Accept": "application/json", "Content-Type": "application/json" };
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
    mensagem: `${prefixo} [${r.status}]: ${base}${detalheLegivel}`,
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
}): Promise<OkCriacao | EgoiErro> {
  if (!opts.html || !opts.html.trim()) {
    return { ok: false, status: 400, mensagem: "HTML da newsletter não foi gerado — verifica se a edição tem conteúdo" };
  }
  const r = await fetch(`${BASE}/campaigns/email`, {
    method: "POST",
    headers: headers(cfg.apiKey),
    body: JSON.stringify({
      list_id: Number(opts.listaId),
      internal_name: opts.internalName,
      subject: opts.subject,
      sender_id: Number(opts.senderId),
      type: "email",
      // E-goi exige content.body (não content_html) — caso contrário devolve 422 "body isEmpty".
      content: { type: "html", body: opts.html },
    }),
  });
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
}): Promise<OkVoid | EgoiErro> {
  const payload: Record<string, unknown> = {};
  if (opts.internalName) payload.internal_name = opts.internalName;
  if (opts.subject) payload.subject = opts.subject;
  if (opts.senderId) payload.sender_id = Number(opts.senderId);
  if (opts.html !== undefined) {
    if (!opts.html || !opts.html.trim()) {
      return { ok: false, status: 400, mensagem: "HTML da newsletter não foi gerado — verifica se a edição tem conteúdo" };
    }
    payload.content = { type: "html", body: opts.html };
  }
  const r = await fetch(`${BASE}/campaigns/email/${hash}`, {
    method: "PATCH",
    headers: headers(cfg.apiKey),
    body: JSON.stringify(payload),
  });
  if (!r.ok) return parseErro(r, "E-goi (patch campanha)");
  return { ok: true };
}


/** POST /campaigns/email/{hash}/actions/send — dispara. */
export async function disparaCampanha(cfg: EgoiConfig, hash: string, listaId: string): Promise<OkVoid | EgoiErro> {
  const r = await fetch(`${BASE}/campaigns/email/${hash}/actions/send`, {
    method: "POST",
    headers: headers(cfg.apiKey),
    body: JSON.stringify({ list_id: Number(listaId), segments: { type: "none" } }),
  });
  if (!r.ok) return parseErro(r, "E-goi (envio)");
  return { ok: true };
}

