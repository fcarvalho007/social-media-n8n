import { criarNoticiasHub, criarTabelasHub, DEMO_USER_ID, demoSession, demoUser, type DemoRow } from "./hubFixtures";

const CHAVE = "hub:demo:plataforma:v1";
const erroLocal = (acao: string) => ({ message: `Demonstração local: ${acao} está desligado. Nenhum pedido foi enviado ao Cloud.`, code: "LOCAL_ONLY" });
type Resposta = { data: unknown; error: { message: string; code: string } | null; count?: number };
const ok = (data: unknown): Resposta => ({ data: structuredClone(data), error: null });
const falha = (acao: string): Resposta => ({ data: null, error: erroLocal(acao) });
const gravaveis = new Set(["art_rascunhos", "posts_drafts", "estudio_preferencias"]);

/** A fresh, isolated adapter is also used by tests; it never imports the Cloud client. */
export function criarClienteHubLocal(storage?: Pick<Storage, "getItem" | "setItem">) {
  const tabelas = criarTabelasHub();
  const noticias = criarNoticiasHub();
  try {
    const salvo = JSON.parse(storage?.getItem(CHAVE) ?? "null");
    for (const t of gravaveis) if (Array.isArray(salvo?.[t])) tabelas[t] = t === 'art_rascunhos' ? salvo[t].map((r: DemoRow) => ({ ...r, created_by: r.created_by ?? r.user_id ?? DEMO_USER_ID })) : salvo[t];
  } catch { /* A malformed local demo starts from its synthetic fixtures. */ }
  const guardar = () => { try { storage?.setItem(CHAVE, JSON.stringify(Object.fromEntries([...gravaveis].map((t) => [t, tabelas[t]])))); } catch { /* Memory still works with unavailable browser storage. */ } };

  class Consulta {
    private filtros: ((row: DemoRow) => boolean)[] = [];
    private ordens: { coluna: string; asc: boolean }[] = [];
    private inicio = 0;
    private fim = Infinity;
    private uma = false;
    private head = false;
    private erro: string | null = null;
    private operacao: "select" | "insert" | "update" | "upsert" | "delete" = "select";
    private valores: DemoRow[] = [];
    constructor(private tabela: string, private dados?: unknown) {}
    select(_colunas?: string, opcoes?: { head?: boolean; count?: string }) { this.head = opcoes?.head ?? false; return this; }
    eq(c: string, v: unknown) { this.filtros.push((r) => r[c] === v); return this; }
    filter(c: string, op: string, v: unknown) {
      if (op === 'eq') return this.eq(c, v);
      if (op === 'is') return this.is(c, v === 'null' ? null : v);
      this.erro = `o filtro ${op}`; return this;
    }
    neq(c: string, v: unknown) { this.filtros.push((r) => r[c] !== v); return this; }
    in(c: string, vs: unknown[]) { this.filtros.push((r) => vs.includes(r[c])); return this; }
    match(v: DemoRow) { Object.entries(v).forEach(([c, x]) => this.eq(c, x)); return this; }
    is(c: string, v: unknown) { this.filtros.push((r) => (r[c] ?? null) === v); return this; }
    not(c: string, op: string, v: unknown) { if (op === "is") this.filtros.push((r) => (r[c] ?? null) !== v); else this.erro = `o filtro ${op}`; return this; }
    gt(c: string, v: string | number) { this.filtros.push((r) => (r[c] as string | number) > v); return this; }
    gte(c: string, v: string | number) { this.filtros.push((r) => (r[c] as string | number) >= v); return this; }
    lt(c: string, v: string | number) { this.filtros.push((r) => (r[c] as string | number) < v); return this; }
    lte(c: string, v: string | number) { this.filtros.push((r) => (r[c] as string | number) <= v); return this; }
    ilike(c: string, v: string) { const q = v.replace(/%/g, "").toLowerCase(); this.filtros.push((r) => String(r[c] ?? "").toLowerCase().includes(q)); return this; }
    or(expr: string) {
      const partes = expr.split(",").map((p) => p.match(/^([\w]+)\.ilike\.(.*)$/));
      if (partes.some((p) => !p)) this.erro = "este filtro de pesquisa";
      else this.filtros.push((r) => partes.some((p) => String(r[p![1]] ?? "").toLowerCase().includes(p![2].replace(/%/g, "").toLowerCase())));
      return this;
    }
    order(coluna: string, o?: { ascending?: boolean; nullsFirst?: boolean }) { this.ordens.push({ coluna, asc: o?.ascending !== false }); return this; }
    limit(n: number) { this.fim = n - 1; return this; }
    range(inicio: number, fim: number) { this.inicio = inicio; this.fim = fim; return this; }
    single() { this.uma = true; return this; }
    maybeSingle() { this.uma = true; return this; }
    insert(v: DemoRow | DemoRow[]) { this.operacao = "insert"; this.valores = Array.isArray(v) ? v : [v]; return this; }
    update(v: DemoRow) { this.operacao = "update"; this.valores = [v]; return this; }
    upsert(v: DemoRow | DemoRow[]) { this.operacao = "upsert"; this.valores = Array.isArray(v) ? v : [v]; return this; }
    delete() { this.operacao = "delete"; return this; }
    private executar(): Resposta {
      if (this.erro) return falha(this.erro);
      if (!(this.tabela in tabelas) && this.dados === undefined) return falha(`a consulta de ${this.tabela}`);
      if (this.dados !== undefined) {
        const d = Array.isArray(this.dados) ? this.dados.slice(this.inicio, this.fim + 1) : this.dados;
        return ok(d);
      }
      const base = tabelas[this.tabela];
      let rows = base.filter((r) => this.filtros.every((f) => f(r)));
      if (this.operacao !== "select") {
        if (!gravaveis.has(this.tabela)) return falha(`alterar ${this.tabela}`);
        const novos = () => this.valores.map((v) => ({ id: `hub-local-${crypto.randomUUID()}`, user_id: DEMO_USER_ID, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...v }));
        if (this.operacao === "insert") { rows = novos(); base.push(...rows); }
        if (this.operacao === "upsert") { rows = this.valores.map((v) => { const row = base.find((r) => v.id ? r.id === v.id : r.user_id === v.user_id); if (row) { Object.assign(row, v); return row; } const n = { ...v }; base.push(n); return n; }); }
        if (this.operacao === "update") rows.forEach((r) => Object.assign(r, this.valores[0], { updated_at: new Date().toISOString() }));
        if (this.operacao === "delete") tabelas[this.tabela] = base.filter((r) => !rows.includes(r));
        guardar();
      }
      const count = rows.length;
      rows = [...rows].sort((a, b) => { for (const o of this.ordens) { const av = a[o.coluna] ?? "", bv = b[o.coluna] ?? ""; if (av === bv) continue; return (av < bv ? -1 : 1) * (o.asc ? 1 : -1); } return 0; }).slice(this.inicio, this.fim + 1);
      return { ...ok(this.head ? null : this.uma ? rows[0] ?? null : rows), count };
    }
    then<TResult1 = Resposta, TResult2 = never>(onfulfilled?: ((v: Resposta) => TResult1 | PromiseLike<TResult1>) | null, onrejected?: ((r: unknown) => TResult2 | PromiseLike<TResult2>) | null) { return Promise.resolve().then(() => this.executar()).then(onfulfilled, onrejected); }
  }

  const canal = { on: () => canal, subscribe: () => canal, unsubscribe: async () => "ok" };
  return {
    from: (t: string) => new Consulta(t),
    rpc: (nome: string, args: Record<string, unknown> = {}) => {
      if (nome === "nl_is_admin") return new Consulta("", true);
      if (nome === "custos_registos") return new Consulta("", [{ id: "hub-local-custo", criado_em: new Date().toISOString(), fornecedor: "deepseek", modelo: "exemplo", acao: "Dado fictício de demonstração", estado: "concluido", unidades: {}, custo_eur: 0.18, custo_origem: "estimado" }]);
      if (nome === "nl_curadoria_listar") {
        const itens = noticias.filter((n) => n.editorial_estado === (args._estado ?? "aprovada") && (!args._categoria || n.categoria === args._categoria) && `${n.titulo} ${n.descricao}`.toLowerCase().includes(String(args._query ?? "").toLowerCase()));
        return new Consulta("", { total: itens.length, itens });
      }
      if (nome === "nl_curadoria_snapshot") { const n = noticias.find((n) => n.id === args._id && n.editorial_estado === "aprovada"); if (n) return new Consulta("", { noticia_id: n.id, hash: "hub-local-fixture", titulo: n.titulo, texto: n.descricao, url: n.url, categoria: n.categoria, origem: n.origem, nivel: n.nivel, parcial: false }); }
      // Deliberately refuse editorial/AI jobs: the demo must not imply their real completion.
      return Promise.resolve(falha(`a operação ${nome}`));
    },
    functions: { invoke: async <T = unknown>(fn: string, opts?: { body?: Record<string, unknown> }): Promise<{ data: T | null; error: Resposta["error"] }> => {
      if (fn === "nl-api" && opts?.body?.id === "fila-curadoria:contarFilaCuradoria") return ok({ total: 3, falhados: 0, antigas: 0, rss: 2, email: 1, modo_manual: true }) as { data: T; error: null };
      return falha(`a função ${fn}`) as { data: null; error: NonNullable<Resposta["error"]> };
    } },
    auth: {
      getUser: async () => ({ data: { user: demoUser }, error: null }),
      getSession: async () => ({ data: { session: demoSession }, error: null }),
      refreshSession: async () => ({ data: { session: demoSession }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signOut: async () => falha("a saída de uma sessão real"),
      updateUser: async () => falha("a alteração de credenciais"),
      signInWithPassword: async () => falha("a entrada real"),
      signInWithOtp: async () => falha("o envio de um código de entrada"),
      verifyOtp: async () => falha("a confirmação de um código real"),
    },
    channel: () => canal, removeChannel: async () => {},
    storage: { from: (t: string) => ({ upload: async () => falha(`o envio para ${t}`), download: async () => falha(`a transferência de ${t}`), remove: async () => falha(`apagar ficheiros de ${t}`), list: async () => falha(`listar ${t}`), getPublicUrl: () => ({ data: { publicUrl: "" } }), createSignedUrl: async () => falha("a assinatura de ficheiros") }) },
  };
}

export const supabase = criarClienteHubLocal(typeof localStorage !== "undefined" ? localStorage : undefined);
