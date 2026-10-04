// E-goi campaign status lookup via the documented GET /campaigns?channel=email&campaign_hash=…
// (official SDK CampaignsApi.getAllCampaigns). Dependency-free: imported by edge functions and tests.
// Only an item with the exact hash, channel "email" and status "sent" confirms delivery.

const BASE = "https://api.egoiapp.com";
const HASH_VALIDO = /^[A-Za-z0-9_-]{1,64}$/;

export type EstadoEgoi = "enviada" | "a_enviar" | "rascunho" | "desconhecido";
export type ResultadoEstado =
  | { ok: true; estado: EstadoEgoi; bruto: string }
  | { ok: false; status: number; mensagem: string; retriavel?: boolean };

export function mapearEstado(bruto: string): EstadoEgoi {
  if (bruto === "sent") return "enviada";
  if (bruto === "sending" || bruto === "processing" || bruto === "queued") return "a_enviar";
  if (bruto === "draft" || bruto === "scheduled") return "rascunho";
  return "desconhecido";
}

/** Picks the item with the exact hash and channel; anything else is "not found", never "sent". */
export function interpretarResposta(body: unknown, hash: string): ResultadoEstado {
  const items = (body && typeof body === "object" && Array.isArray((body as { items?: unknown }).items))
    ? (body as { items: unknown[] }).items : null;
  if (!items) return { ok: false, status: 502, mensagem: "E-goi (estado da campanha): resposta sem lista de campanhas." };
  const item = items.find((i): i is Record<string, unknown> =>
    !!i && typeof i === "object" &&
    (i as Record<string, unknown>).campaign_hash === hash &&
    String((i as Record<string, unknown>).channel ?? "").toLowerCase() === "email");
  if (!item) return { ok: false, status: 404, mensagem: `E-goi (estado da campanha): campanha de email ${hash} não encontrada.` };
  const bruto = String(item.status ?? "").toLowerCase();
  return { ok: true, estado: mapearEstado(bruto), bruto };
}

export async function consultarEstadoCampanha(
  apiKey: string,
  hash: string,
  fazerFetch: typeof fetch = fetch,
): Promise<ResultadoEstado> {
  if (!HASH_VALIDO.test(hash)) return { ok: false, status: 400, mensagem: "E-goi (estado da campanha): identificador de campanha inválido." };
  const url = `${BASE}/campaigns?channel=email&campaign_hash=${encodeURIComponent(hash)}&limit=10`;
  let r: Response;
  try {
    r = await fazerFetch(url, { method: "GET", headers: { Apikey: apiKey, Accept: "application/json" } });
  } catch (e) {
    return { ok: false, status: 0, retriavel: true, mensagem: `E-goi (estado da campanha): sem resposta — ${(e as Error).message}` };
  }
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    const motivo = r.status === 401 || r.status === 403 ? "chave recusada" : r.status === 404 ? "recurso não encontrado" : "erro";
    return {
      ok: false, status: r.status, retriavel: r.status === 429 || r.status >= 500,
      mensagem: `E-goi (estado da campanha) respondeu ${r.status} (${motivo}): ${t.slice(0, 160)}`,
    };
  }
  const body = await r.json().catch(() => null);
  return interpretarResposta(body, hash);
}
