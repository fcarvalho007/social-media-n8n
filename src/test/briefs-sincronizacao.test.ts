import { describe, expect, it, vi } from "vitest";
import { guardarAntesDeSincronizar } from "../newsletter/lib/newsletter-engine/revista/brief/sincronizacao";

const MODULO = "../../supabase/functions/_shared/newsletter-engine/revista/brief/modelo.server.ts";
const { associarBriefAEdicao, reconciliarDestaquesBrief, sincronizarPapelBrief } = await import(/* @vite-ignore */ MODULO);
const FINGERPRINT = "../../supabase/functions/_shared/newsletter-engine/revista/brief/fingerprint.ts";
const { calcularFingerprint } = await import(/* @vite-ignore */ FINGERPRINT);

type Row = Record<string, unknown>;
type Result = { data: Row | Row[] | null; error: Error | null; count?: number };

/** In-memory PostgREST double: every filter and write is executed, no real calls. */
function fixture() {
  const tables: Record<string, Row[]> = {
    nl_edicoes: [{ id: "e", estado: "rascunho" }],
    nl_configuracoes: [], nl_noticias: [], nl_briefs: [], nl_brief_edicoes: [], nl_revista_itens: [],
  };
  const writes: string[] = [];
  const failures = new Set<string>();
  class Query {
    filters: Array<[string, unknown]> = [];
    columns = "";
    count = false;
    mode: "select" | "update" | "insert" = "select";
    payload: Row = {};
    one = false;
    constructor(readonly table: string) {}
    select(columns: string, options?: { count?: string }) { this.columns = columns; this.count = !!options?.count; return this; }
    eq(key: string, value: unknown) { this.filters.push([key, value]); return this; }
    maybeSingle() { this.one = true; return this; }
    single() { this.one = true; return this; }
    update(payload: Row) { this.mode = "update"; this.payload = payload; return this; }
    insert(payload: Row) { this.mode = "insert"; this.payload = payload; return this; }
    execute(): Result {
      if (failures.has(this.table)) return { data: null, error: new Error("read failed") };
      const rows = tables[this.table];
      if (!rows) throw new Error(`Unexpected table ${this.table}`);
      const matches = rows.filter(row => this.filters.every(([key, value]) => row[key] === value));
      if (this.mode === "insert") { rows.push({ id: `link-${rows.length}`, ...this.payload }); writes.push(this.table); }
      if (this.mode === "update") { matches.forEach(row => Object.assign(row, this.payload)); writes.push(this.table); }
      const data = this.columns.includes("brief:")
        ? matches.map(row => ({ ...row, brief: tables.nl_briefs.find(b => b.id === row.brief_id) ?? null }))
        : matches;
      return { data: this.one ? data[0] ?? null : data, count: this.count ? matches.length : undefined, error: null };
    }
    then(resolve: (result: Result) => unknown) { return Promise.resolve(this.execute()).then(resolve); }
  }
  const db = { from: (table: string) => new Query(table) };
  function add(id: string, papel: "destaque" | "radar" = "destaque", selected = true) {
    const url = `https://fonte.pt/${id}`;
    tables.nl_noticias.push({ id, titulo: id, url, repeticao_de: null });
    tables.nl_briefs.push({ id, noticia_id: id, fingerprint: calcularFingerprint({ url, titulo: id }), leitura_aprovada: `Leitura ${id}` });
    tables.nl_brief_edicoes.push({ id: `link-${id}`, brief_id: id, edicao_id: "e", papel });
    if (selected) tables.nl_revista_itens.push({ noticia_id: id, edicao_id: "e", papel });
  }
  return { db, tables, writes, failures, add };
}

describe("sincronização dos três Destaques", () => {
  it("três lugares ocupados devolvem bloqueio editorial, sem lançar erro interno", async () => {
    const f = fixture(); ["a", "b", "c"].forEach(id => f.add(id));
    const result = await associarBriefAEdicao({ briefId: "novo", edicaoId: "e", papel: "destaque" }, f.db as never);
    expect(result.bloqueio).toBeDefined();
    expect(f.tables.nl_brief_edicoes.filter(r => r.papel === "destaque")).toHaveLength(3);
    expect(f.writes).toEqual([]);
  });

  it("promover um Radar também respeita os três lugares", async () => {
    const f = fixture(); ["a", "b", "c"].forEach(id => f.add(id)); f.add("r", "radar");
    const result = await associarBriefAEdicao({ briefId: "r", edicaoId: "e", papel: "destaque" }, f.db as never);
    expect(result.bloqueio).toBeDefined();
    expect(f.tables.nl_brief_edicoes.find(r => r.brief_id === "r")?.papel).toBe("radar");
  });

  it("uma associação antiga liberta o lugar sem apagar o Brief ou a leitura", async () => {
    const f = fixture(); f.add("antigo", "destaque", false); f.add("a"); f.add("b"); f.add("novo", "radar");
    const item = f.tables.nl_revista_itens.find(r => r.noticia_id === "novo");
    if (!item) throw new Error("Missing fixture"); item.papel = "destaque";
    const content = JSON.stringify(f.tables.nl_briefs);
    const result = await associarBriefAEdicao({ briefId: "novo", edicaoId: "e", papel: "destaque" }, f.db as never);
    expect(result.bloqueio).toBeUndefined();
    expect(f.tables.nl_brief_edicoes).toHaveLength(4);
    expect(f.tables.nl_brief_edicoes.find(r => r.brief_id === "antigo")?.papel).toBe("radar");
    expect(f.tables.nl_brief_edicoes.filter(r => r.papel === "destaque")).toHaveLength(3);
    // Only the new Brief's role/indexability may change; all editorial text is preserved.
    expect(f.tables.nl_briefs.map(b => b.leitura_aprovada)).toEqual(JSON.parse(content).map((b: Row) => b.leitura_aprovada));
  });

  it("passar um Destaque a Novidade permite escolher outro", async () => {
    const f = fixture(); ["a", "b", "c"].forEach(id => f.add(id)); f.add("novo", "radar");
    const item = f.tables.nl_revista_itens.find(r => r.noticia_id === "c");
    if (!item) throw new Error("Missing fixture"); item.papel = "radar";
    await associarBriefAEdicao({ briefId: "c", edicaoId: "e", papel: "radar" }, f.db as never);
    const novo = f.tables.nl_revista_itens.find(r => r.noticia_id === "novo");
    if (!novo) throw new Error("Missing fixture"); novo.papel = "destaque";
    const result = await associarBriefAEdicao({ briefId: "novo", edicaoId: "e", papel: "destaque" }, f.db as never);
    expect(result.bloqueio).toBeUndefined();
    expect(f.tables.nl_brief_edicoes.filter(r => r.papel === "destaque").map(r => r.brief_id)).toEqual(["a", "b", "novo"]);
  });

  it("repetir o mesmo Destaque com os três lugares ocupados é idempotente", async () => {
    const f = fixture(); ["a", "b", "c"].forEach(id => f.add(id));
    for (let i = 0; i < 2; i++) {
      const result = await associarBriefAEdicao({ briefId: "a", edicaoId: "e", papel: "destaque" }, f.db as never);
      expect(result.bloqueio).toBeUndefined();
    }
    expect(f.tables.nl_brief_edicoes).toHaveLength(3);
  });

  it("reconciliação não modifica uma edição enviada", async () => {
    const f = fixture(); f.add("antigo", "destaque", false); f.add("a"); f.tables.nl_edicoes[0].estado = "enviada";
    await reconciliarDestaquesBrief("e", f.db as never);
    expect(f.writes).toEqual([]);
    expect(f.tables.nl_brief_edicoes[0].papel).toBe("destaque");
  });

  it("retirar o último Destaque liberta o lugar mas preserva a associação e o conteúdo", async () => {
    const f = fixture(); f.add("ultimo", "destaque", false);
    const content = JSON.stringify(f.tables.nl_briefs);
    await sincronizarPapelBrief({ edicaoId: "e", noticiaId: "ultimo", papel: null }, f.db as never);
    expect(f.tables.nl_brief_edicoes).toHaveLength(1);
    expect(f.tables.nl_brief_edicoes[0].papel).toBe("radar");
    expect(JSON.stringify(f.tables.nl_briefs)).toBe(content);
  });

  it("uma repetição atrasada usa o papel guardado, não promove novamente a notícia", async () => {
    const f = fixture(); f.add("a", "radar");
    await sincronizarPapelBrief({ edicaoId: "e", noticiaId: "a", papel: "destaque" }, f.db as never);
    expect(f.tables.nl_brief_edicoes[0].papel).toBe("radar");
  });

  it("sincronização preserva também as associações de uma edição enviada", async () => {
    const f = fixture(); f.add("a"); f.tables.nl_edicoes[0].estado = "enviada";
    const result = await sincronizarPapelBrief({ edicaoId: "e", noticiaId: "a", papel: null }, f.db as never);
    expect(result.bloqueio).toBeDefined();
    expect(f.writes).toEqual([]);
  });

  it("uma falha ao ler a notícia não despromove associações existentes", async () => {
    const f = fixture(); f.add("a"); f.failures.add("nl_noticias");
    await expect(reconciliarDestaquesBrief("e", f.db as never)).rejects.toThrow("read failed");
    expect(f.writes).toEqual([]);
    expect(f.tables.nl_brief_edicoes[0].papel).toBe("destaque");
  });

  it("espera pela gravação antes de iniciar a sincronização", async () => {
    let finish: (() => void) | undefined;
    const saved = new Promise<void>(resolve => { finish = resolve; });
    const sync = vi.fn(async () => undefined);
    const flow = guardarAntesDeSincronizar(() => saved, sync);
    expect(sync).not.toHaveBeenCalled();
    finish?.(); await flow;
    expect(sync).toHaveBeenCalledTimes(1);
  });

  it("uma falha de gravação não sincroniza o Brief", async () => {
    const sync = vi.fn(async () => undefined);
    await expect(guardarAntesDeSincronizar(async () => { throw new Error("save failed"); }, sync)).rejects.toThrow("save failed");
    expect(sync).not.toHaveBeenCalled();
  });
});