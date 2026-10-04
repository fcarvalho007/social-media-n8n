// Gestão de subscrição na E-goi — server-only.
//
// A API da E-goi tem variações entre contas/versões nos endpoints de
// cancelamento. Em vez de assumir um único caminho, cada operação tenta uma
// cascata de endpoints conhecidos e devolve o primeiro que resulta, com o
// registo de qual foi usado (útil para diagnóstico).

const BASE = "https://api.egoiapp.com";

function headers(apiKey: string): HeadersInit {
  return { Apikey: apiKey, Accept: "application/json", "Content-Type": "application/json" };
}

export interface ResultadoEgoi {
  ok: boolean;
  via?: string;
  erro?: string;
  detalhe?: unknown;
}

async function tentar(
  descricao: string,
  fazer: () => Promise<Response>,
): Promise<{ ok: true; via: string } | { ok: false; erro: string }> {
  try {
    const r = await fazer();
    if (r.ok) return { ok: true, via: descricao };
    const texto = await r.text().catch(() => "");
    return { ok: false, erro: `${descricao} [${r.status}] ${texto.slice(0, 200)}` };
  } catch (e) {
    return { ok: false, erro: `${descricao}: ${(e as Error).message}` };
  }
}

/** Procura o contacto pelo email dentro de uma lista. Devolve o id da E-goi. */
export async function procurarContacto(
  apiKey: string,
  listaId: string,
  email: string,
): Promise<{ ok: true; contactoId: string } | { ok: false; erro: string }> {
  const emailQ = encodeURIComponent(email.trim().toLowerCase());
  const caminhos = [
    `${BASE}/lists/${listaId}/contacts/search?email=${emailQ}`,
    `${BASE}/lists/${listaId}/contacts?email=${emailQ}`,
  ];
  const erros: string[] = [];
  for (const url of caminhos) {
    try {
      const r = await fetch(url, { headers: headers(apiKey) });
      if (!r.ok) {
        erros.push(`${url.split("?")[0]} [${r.status}]`);
        continue;
      }
      const body = (await r.json().catch(() => ({}))) as {
        items?: Array<{ contact_id?: string | number; base?: { contact_id?: string | number } }>;
        contact_id?: string | number;
      };
      const item = body.items?.[0];
      const id = item?.contact_id ?? item?.base?.contact_id ?? body.contact_id;
      if (id) return { ok: true, contactoId: String(id) };
      erros.push("contacto não encontrado nesta lista");
    } catch (e) {
      erros.push((e as Error).message);
    }
  }
  return { ok: false, erro: erros.join(" | ") };
}

/** Cancela a subscrição do contacto numa lista (sai mesmo da E-goi). */
export async function cancelarNaEgoi(apiKey: string, listaId: string, email: string): Promise<ResultadoEgoi> {
  const encontrado = await procurarContacto(apiKey, listaId, email);
  if (!encontrado.ok) return { ok: false, erro: encontrado.erro };
  const id = encontrado.contactoId;

  const tentativas: Array<[string, () => Promise<Response>]> = [
    ["actions/unsubscribe", () => fetch(`${BASE}/lists/${listaId}/contacts/actions/unsubscribe`, {
      method: "POST", headers: headers(apiKey), body: JSON.stringify({ contacts: [id] }),
    })],
    ["patch status=unsubscribed", () => fetch(`${BASE}/lists/${listaId}/contacts/${id}`, {
      method: "PATCH", headers: headers(apiKey), body: JSON.stringify({ status: "unsubscribed" }),
    })],
    ["patch status=inactive", () => fetch(`${BASE}/lists/${listaId}/contacts/${id}`, {
      method: "PATCH", headers: headers(apiKey), body: JSON.stringify({ status: "inactive" }),
    })],
  ];

  const erros: string[] = [];
  for (const [descricao, fazer] of tentativas) {
    const r = await tentar(descricao, fazer);
    if (r.ok) return { ok: true, via: r.via };
    erros.push(r.erro);
  }
  return { ok: false, erro: erros.join(" | ") };
}

/** Volta a activar o contacto numa lista (fim de pausa ou reversão imediata). */
export async function reactivarNaEgoi(apiKey: string, listaId: string, email: string): Promise<ResultadoEgoi> {
  const encontrado = await procurarContacto(apiKey, listaId, email);
  if (!encontrado.ok) return { ok: false, erro: encontrado.erro };
  const id = encontrado.contactoId;

  const tentativas: Array<[string, () => Promise<Response>]> = [
    ["patch status=active", () => fetch(`${BASE}/lists/${listaId}/contacts/${id}`, {
      method: "PATCH", headers: headers(apiKey), body: JSON.stringify({ status: "active" }),
    })],
    ["actions/resubscribe", () => fetch(`${BASE}/lists/${listaId}/contacts/actions/resubscribe`, {
      method: "POST", headers: headers(apiKey), body: JSON.stringify({ contacts: [id] }),
    })],
    ["actions/activate", () => fetch(`${BASE}/lists/${listaId}/contacts/actions/activate`, {
      method: "POST", headers: headers(apiKey), body: JSON.stringify({ contacts: [id] }),
    })],
  ];

  const erros: string[] = [];
  for (const [descricao, fazer] of tentativas) {
    const r = await tentar(descricao, fazer);
    if (r.ok) return { ok: true, via: r.via };
    erros.push(r.erro);
  }
  return { ok: false, erro: erros.join(" | ") };
}
