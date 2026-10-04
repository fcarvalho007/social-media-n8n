// Durable, resumable sync of signed subscription tokens into an E-goi extra field.
// Pure core (E-goi client and progress store are injected) so it is testable with fictitious contacts.
// E-goi API v3 (developers.e-goi.com/api/v3): GET /lists/{id}/fields (type/field_id/format),
// GET /lists/{id}/contacts?offset&limit (total_items, items[].base/extra),
// GET|PATCH /lists/{id}/contacts/{contact_id} with { extra: [{ field_id, value }] }.

export const PAGINA = 50;
/** Re-read window when resuming a finished list, so deletions that shift offsets never skip a contact. */
export const SOBREPOSICAO = 50;
export const MAX_TENTATIVAS_FALHA = 5;

export type ContactoEgoi = { id: string; email: string | null; valorCampo: string | null };
export type CampoEgoi = { field_id: string; name: string; format: string; type: string };

export interface ClienteEgoi {
  lerCampos(lista: string): Promise<CampoEgoi[]>;
  listar(lista: string, offset: number, limit: number, campo: number): Promise<{ total: number | null; itens: ContactoEgoi[] }>;
  lerContacto(lista: string, id: string, campo: number): Promise<ContactoEgoi | null>;
  escrever(lista: string, id: string, campo: number, valor: string): Promise<{ ok: boolean; status: number }>;
}

export type Progresso = {
  egoi_lista_id: string;
  campo_id: number;
  estado: "por_iniciar" | "em_curso" | "concluida" | "campo_invalido";
  campo_validado: boolean;
  campo_meta: unknown;
  segredo_fp: string;
  offset_proximo: number;
  processados: number;
  actualizados: number;
  ja_correctos: number;
  ignorados: number;
  total_egoi: number | null;
  verificado_leitura: boolean;
  ultimo_erro: string | null;
  concluido_em: string | null;
};

export type Falha = { contact_id: string; motivo: string; tentativas: number };

export interface ArmazemProgresso {
  ler(lista: string, campo: number): Promise<Progresso | null>;
  /** Creates (or resets, when `recomecar`) the row; returns it. */
  iniciar(lista: string, campo: number, fp: string, recomecar: boolean): Promise<Progresso>;
  /** Acquires the per-list lease; null when another run holds it. */
  reservar(lista: string, campo: number, segundos: number): Promise<string | null>;
  /** Writes progress only while `token` still holds the lease (CAS); false otherwise. */
  guardar(token: string, p: Progresso): Promise<boolean>;
  libertar(lista: string, campo: number, token: string): Promise<void>;
  registarFalha(lista: string, campo: number, contactId: string, motivo: string): Promise<void>;
  resolverFalha(lista: string, campo: number, contactId: string): Promise<void>;
  falhasPendentes(lista: string, campo: number, limite: number): Promise<Falha[]>;
  contarFalhas(lista: string, campo: number): Promise<number>;
}

export type Deps = { egoi: ClienteEgoi; armazem: ArmazemProgresso; criarToken: (email: string) => string; agora?: () => number };

export type ResultadoLote = {
  lista: string;
  estado: Progresso["estado"] | "ocupada" | "segredo_mudou";
  offset: number;
  total: number | null;
  escritos: number;
  ja_correctos: number;
  falhas_novas: number;
  falhas_pendentes: number;
  terminou: boolean;
  erro?: string;
};

/** E-goi merge code for an extra field (helpdesk "Using merge codes": `!extra_field_X`). */
export function tagCampo(campo: number): string {
  return `!extra_field_${campo}`;
}

async function validarCampo(deps: Deps, p: Progresso): Promise<string | null> {
  const campos = await deps.egoi.lerCampos(p.egoi_lista_id);
  const f = campos.find((c) => c.type === "extra" && Number(c.field_id) === p.campo_id);
  if (!f) return `O campo extra ${p.campo_id} não existe nesta lista da E-goi.`;
  if (f.format !== "text") return `O campo extra ${p.campo_id} tem o formato «${f.format}»; tem de ser texto.`;
  p.campo_validado = true;
  p.campo_meta = { field_id: f.field_id, name: f.name, format: f.format };
  return null;
}

/**
 * Processes at most `limite` contacts of one list from the durable offset, page by page.
 * Never restarts from zero unless `recomecar`; failures are recorded per contact and the offset still advances.
 */
export async function executarLote(deps: Deps, o: {
  lista: string; campo: number; fp: string; recomecar?: boolean; limite?: number; prazoMs?: number;
}): Promise<ResultadoLote> {
  const agora = deps.agora ?? Date.now;
  const inicio = agora();
  const limite = o.limite ?? 500;
  const prazo = o.prazoMs ?? 40_000;
  const a = deps.armazem;

  let p = await a.ler(o.lista, o.campo);
  if (!p || o.recomecar) p = await a.iniciar(o.lista, o.campo, o.fp, Boolean(o.recomecar));
  const base = (estado: ResultadoLote["estado"], extra: Partial<ResultadoLote> = {}): ResultadoLote => ({
    lista: o.lista, estado, offset: p!.offset_proximo, total: p!.total_egoi, escritos: 0, ja_correctos: 0,
    falhas_novas: 0, falhas_pendentes: 0, terminou: false, ...extra,
  });
  if (p.segredo_fp !== o.fp) {
    return base("segredo_mudou", { erro: "O segredo das subscrições mudou: é preciso recomeçar esta lista." });
  }

  const token = await a.reservar(o.lista, o.campo, Math.ceil(prazo / 1000) + 30);
  if (!token) return base("ocupada", { erro: "Já está a decorrer uma sincronização nesta lista." });

  let escritos = 0, correctos = 0, novas = 0;
  try {
    if (!p.campo_validado) {
      const erro = await validarCampo(deps, p);
      if (erro) {
        p.estado = "campo_invalido"; p.ultimo_erro = erro;
        await a.guardar(token, p);
        return base("campo_invalido", { erro });
      }
    }
    // Resuming a finished list re-reads a small overlap (cheap: correct values are skipped, not rewritten).
    if (p.estado === "concluida") p.offset_proximo = Math.max(0, p.offset_proximo - SOBREPOSICAO);
    p.estado = "em_curso"; p.ultimo_erro = null;
    let tratados = 0;
    while (tratados < limite && agora() - inicio < prazo) {
      const pag = await deps.egoi.listar(o.lista, p.offset_proximo, PAGINA, o.campo);
      if (pag.total !== null) p.total_egoi = pag.total;
      for (const c of pag.itens) {
        if (!c.email) { p.ignorados++; continue; }
        const valor = deps.criarToken(c.email);
        if (c.valorCampo === valor) { p.ja_correctos++; correctos++; await a.resolverFalha(o.lista, o.campo, c.id); continue; }
        const w = await deps.egoi.escrever(o.lista, c.id, o.campo, valor);
        if (!w.ok) { novas++; await a.registarFalha(o.lista, o.campo, c.id, `HTTP ${w.status}`); continue; }
        if (!p.verificado_leitura) {
          // Read back once per list: proves the field stores the full token (no truncation/transformation).
          const lido = await deps.egoi.lerContacto(o.lista, c.id, o.campo);
          if (!lido || lido.valorCampo !== valor) {
            p.estado = "campo_invalido";
            p.ultimo_erro = "A E-goi não devolveu o token igual ao escrito (campo truncado ou alterado).";
            await a.guardar(token, p);
            return base("campo_invalido", { erro: p.ultimo_erro, escritos: escritos + 1 });
          }
          p.verificado_leitura = true;
        }
        p.actualizados++; escritos++;
        await a.resolverFalha(o.lista, o.campo, c.id);
      }
      p.offset_proximo += pag.itens.length;
      p.processados = Math.max(p.processados, p.offset_proximo);
      tratados += pag.itens.length;
      if (pag.itens.length < PAGINA) { p.estado = "concluida"; p.concluido_em = new Date(agora()).toISOString(); break; }
      if (!(await a.guardar(token, p))) return base("ocupada", { erro: "A reserva expirou; o progresso guardado mantém-se." });
    }
    if (!(await a.guardar(token, p))) return base("ocupada", { erro: "A reserva expirou; o progresso guardado mantém-se." });
    const pendentes = await a.contarFalhas(o.lista, o.campo);
    return base(p.estado, { escritos, ja_correctos: correctos, falhas_novas: novas, falhas_pendentes: pendentes, terminou: p.estado === "concluida" });
  } finally {
    await a.libertar(o.lista, o.campo, token);
  }
}

/** Retries recorded failures (by contact id) without touching the offset. */
export async function repetirFalhas(deps: Deps, o: { lista: string; campo: number; fp: string; limite?: number }) {
  const a = deps.armazem;
  const p = await a.ler(o.lista, o.campo);
  if (!p || p.segredo_fp !== o.fp || !p.campo_validado) return { resolvidas: 0, mantidas: 0, erro: "Sincronização desta lista por iniciar ou inválida." };
  const token = await a.reservar(o.lista, o.campo, 90);
  if (!token) return { resolvidas: 0, mantidas: 0, erro: "Já está a decorrer uma sincronização nesta lista." };
  let resolvidas = 0, mantidas = 0;
  try {
    for (const f of await a.falhasPendentes(o.lista, o.campo, o.limite ?? 100)) {
      const c = await deps.egoi.lerContacto(o.lista, f.contact_id, o.campo);
      if (!c) { mantidas++; await a.registarFalha(o.lista, o.campo, f.contact_id, "Contacto não encontrado"); continue; }
      if (!c.email) { resolvidas++; await a.resolverFalha(o.lista, o.campo, f.contact_id); continue; }
      const valor = deps.criarToken(c.email);
      if (c.valorCampo === valor) { resolvidas++; await a.resolverFalha(o.lista, o.campo, f.contact_id); continue; }
      const w = await deps.egoi.escrever(o.lista, f.contact_id, o.campo, valor);
      if (w.ok) { resolvidas++; await a.resolverFalha(o.lista, o.campo, f.contact_id); }
      else { mantidas++; await a.registarFalha(o.lista, o.campo, f.contact_id, `HTTP ${w.status}`); }
    }
  } finally {
    await a.libertar(o.lista, o.campo, token);
  }
  return { resolvidas, mantidas };
}

/** Pre-send gate: every real list must be fully synced, validated, failure-free and not grown since. */
export async function verificarProntidao(deps: Pick<Deps, "egoi" | "armazem">, o: { listas: Array<{ egoi_lista_id: string; nome: string }>; campo: number; fp: string }): Promise<string[]> {
  const problemas: string[] = [];
  for (const l of o.listas) {
    const p = await deps.armazem.ler(l.egoi_lista_id, o.campo);
    const n = `Lista «${l.nome}»`;
    if (!p) { problemas.push(`${n}: tokens por sincronizar.`); continue; }
    if (p.segredo_fp !== o.fp) { problemas.push(`${n}: o segredo das subscrições mudou; recomeçar a sincronização.`); continue; }
    if (!p.campo_validado || p.estado === "campo_invalido") { problemas.push(`${n}: campo do token não validado${p.ultimo_erro ? ` (${p.ultimo_erro})` : ""}.`); continue; }
    if (p.estado !== "concluida") { problemas.push(`${n}: sincronização incompleta (${p.offset_proximo}${p.total_egoi !== null ? ` de ${p.total_egoi}` : ""}).`); continue; }
    if (!p.verificado_leitura && p.actualizados > 0) { problemas.push(`${n}: escrita do token não confirmada por leitura.`); continue; }
    const falhas = await deps.armazem.contarFalhas(l.egoi_lista_id, o.campo);
    if (falhas > 0) { problemas.push(`${n}: ${falhas} contacto(s) com falha por repetir.`); continue; }
    try {
      const vivo = await deps.egoi.listar(l.egoi_lista_id, 0, 1, o.campo);
      if (vivo.total === null) problemas.push(`${n}: a E-goi não indicou o total de contactos.`);
      else if (vivo.total > p.offset_proximo) problemas.push(`${n}: há ${vivo.total - p.offset_proximo} contacto(s) novos; retomar a sincronização.`);
    } catch {
      problemas.push(`${n}: não foi possível confirmar o total de contactos na E-goi.`);
    }
  }
  return problemas;
}

/* ─────────── real adapters ─────────── */

type ItemApi = { base?: { contact_id?: string; email?: string | null }; extra?: Array<{ field_id?: number | string; value?: unknown }> };

function paraContacto(i: ItemApi, campo: number): ContactoEgoi | null {
  const id = i.base?.contact_id;
  if (!id) return null;
  const e = (i.extra ?? []).find((x) => Number(x.field_id) === campo);
  return { id: String(id), email: i.base?.email ? String(i.base.email) : null, valorCampo: typeof e?.value === "string" ? e.value : null };
}

export function clienteEgoiHttp(apiKey: string, f: typeof fetch = fetch): ClienteEgoi {
  const h = { Apikey: apiKey, Accept: "application/json", "Content-Type": "application/json" };
  const base = "https://api.egoiapp.com";
  const L = (l: string) => encodeURIComponent(l);
  return {
    async lerCampos(lista) {
      const r = await f(`${base}/lists/${L(lista)}/fields`, { headers: h });
      if (!r.ok) throw new Error(`E-goi campos HTTP ${r.status}`);
      const j = await r.json() as Array<Partial<CampoEgoi> & { field_id?: string | number }>;
      return (Array.isArray(j) ? j : []).map((c) => ({ field_id: String(c.field_id ?? ""), name: String(c.name ?? ""), format: String(c.format ?? ""), type: String(c.type ?? "") }));
    },
    async listar(lista, offset, limit, campo) {
      const r = await f(`${base}/lists/${L(lista)}/contacts?offset=${offset}&limit=${limit}`, { headers: h });
      if (!r.ok) throw new Error(`E-goi contactos HTTP ${r.status}`);
      const j = await r.json() as { total_items?: number; items?: ItemApi[] };
      return {
        total: typeof j.total_items === "number" ? j.total_items : null,
        itens: (j.items ?? []).map((i) => paraContacto(i, campo)).filter((c): c is ContactoEgoi => c !== null),
      };
    },
    async lerContacto(lista, id, campo) {
      const r = await f(`${base}/lists/${L(lista)}/contacts/${encodeURIComponent(id)}`, { headers: h });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(`E-goi contacto HTTP ${r.status}`);
      return paraContacto(await r.json() as ItemApi, campo);
    },
    async escrever(lista, id, campo, valor) {
      const r = await f(`${base}/lists/${L(lista)}/contacts/${encodeURIComponent(id)}`, {
        method: "PATCH", headers: h, body: JSON.stringify({ extra: [{ field_id: campo, value: valor }] }),
      });
      await r.body?.cancel();
      return { ok: r.ok, status: r.status };
    },
  };
}

/** Fingerprint of the signing secret: a rotation invalidates previously written tokens. */
export async function impressaoSegredo(segredo: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`nl-tokens:${segredo}`));
  return Array.from(new Uint8Array(d)).slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
}
