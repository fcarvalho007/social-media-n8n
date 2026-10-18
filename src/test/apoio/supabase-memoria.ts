import type { SupabaseClient } from '@supabase/supabase-js';
type Linha = Record<string, unknown>;
type Resposta = {
    data: unknown;
    error: unknown;
};
export function supabaseMemoria(iniciais: Record<string, Linha[]> = {}) {
    const tabelas = structuredClone(iniciais), objetos = new Map<string, Blob>(), chamadas: {
        nome: string;
        args: Record<string, unknown>;
    }[] = [];
    class Consulta {
        private filtros: ((r: Linha) => boolean)[] = [];
        private op = 'select';
        private dados: Linha[] = [];
        private unica = false;
        private opcional = false;
        private max = Infinity;
        private inicio = 0;
        private ordem?: string;
        private ascendente = true;
        constructor(private t: string) { }
        select() { return this; }
        eq(k: string, v: unknown) { this.filtros.push(r => r[k] === v); return this; }
        neq(k: string, v: unknown) { this.filtros.push(r => r[k] !== v); return this; }
        gt(k: string, v: string) { this.filtros.push(r => String(r[k]) > v); return this; }
        in(k: string, v: unknown[]) { this.filtros.push(r => v.includes(r[k])); return this; }
        contains(k: string, v: Record<string, unknown>) { this.filtros.push(r => !!r[k] && Object.entries(v).every(([a, b]) => (r[k] as Record<string, unknown>)[a] === b)); return this; }
        order(k: string, o?: {
            ascending?: boolean;
        }) { this.ordem = k; this.ascendente = o?.ascending !== false; return this; }
        limit(n: number) { this.max = n; return this; }
        range(i: number, f: number) { this.inicio = i; this.max = f - i + 1; return this; }
        insert(d: Linha | Linha[]) { this.op = 'insert'; this.dados = Array.isArray(d) ? d : [d]; return this; }
        upsert(d: Linha) { this.op = 'upsert'; this.dados = [d]; return this; }
        update(d: Linha) { this.op = 'update'; this.dados = [d]; return this; }
        single() { this.unica = true; return this; }
        maybeSingle() { this.unica = true; this.opcional = true; return this; }
        then<R>(resolve: (r: Resposta) => R, reject?: (e: unknown) => unknown) {
            try {
                return Promise.resolve(this.executar()).then(resolve, reject);
            }
            catch (e) {
                return Promise.resolve({ data: null, error: e }).then(resolve, reject);
            }
        }
        private executar(): Resposta {
            const todas = tabelas[this.t] ?? (tabelas[this.t] = []);
            let linhas = todas.filter(r => this.filtros.every(f => f(r)));
            if (this.op === 'insert' || this.op === 'upsert') {
                linhas = [];
                for (const d of this.dados) {
                    const keys = this.t === 'hub_publicacoes' ? ['project_id', 'pauta_id', 'site_id', 'versao', 'destino'] : this.t === 'hub_documentos' ? ['project_id', 'hash'] : ['id'];
                    const existe = todas.find(r => keys.every(k => r[k] === d[k]));
                    if (existe) {
                        if (this.op === 'upsert') {
                            linhas = [existe];
                            continue;
                        }
                        return { data: null, error: { code: '23505' } };
                    }
                    const nova = { ...(this.t === 'hub_documentos' ? { revisao: 1 } : {}), ...structuredClone(d), id: d.id ?? crypto.randomUUID() };
                    todas.push(nova);
                    linhas.push(nova);
                }
            }
            else if (this.op === 'update') {
                for (const r of linhas)
                    Object.assign(r, structuredClone(this.dados[0]));
            }
            if (this.ordem)
                linhas.sort((a, b) => (this.ascendente ? 1 : -1) * String(a[this.ordem!]).localeCompare(String(b[this.ordem!])));
            linhas = linhas.slice(this.inicio, this.inicio + this.max);
            if (this.unica)
                return linhas.length === 1 ? { data: structuredClone(linhas[0]), error: null } : linhas.length === 0 && this.opcional ? { data: null, error: null } : { data: null, error: { code: 'PGRST116' } };
            return { data: structuredClone(linhas), error: null };
        }
    }
    let token = crypto.randomUUID();
    const sb = { from: (t: string) => new Consulta(t), rpc: async (nome: string, args: Record<string, unknown> = {}) => {
            chamadas.push({ nome, args });
            if (nome === 'hub_lease_reservar')
                return { data: token, error: null };
            if (nome === 'hub_lease_renovar')
                return { data: args._token === token, error: null };
            if (nome === 'hub_lease_libertar')
                return { data: null, error: null };
            if (nome === 'hub_estado_guardar') {
                const t = tabelas.hub_editorial_estados ?? (tabelas.hub_editorial_estados = []);
                const r = t.find(r => r.project_id === args._projeto);
                if ((r?.revisao ?? 0) !== args._revisao || args._token !== token)
                    return { data: null, error: { code: 'MC409' } };
                if (r) {
                    r.dados = structuredClone(args._dados);
                    r.revisao = Number(r.revisao) + 1;
                }
                else
                    t.push({ project_id: args._projeto, revisao: 1, dados: structuredClone(args._dados) });
                return { data: r?.revisao ?? 1, error: null };
            }
            return { data: true, error: null };
        }, storage: { from: () => ({ upload: async (p: string, b: Uint8Array) => {
                    if (objetos.has(p))
                        return { data: null, error: { code: '409' } };
                    objetos.set(p, new Blob([new Uint8Array(b)]));
                    return { data: { path: p }, error: null };
                }, download: async (p: string) => ({ data: objetos.get(p) ?? null, error: objetos.has(p) ? null : { code: '404' } }), createSignedUrl: async (p: string) => ({ data: { signedUrl: `https://storage.example/${p}?token=teste` }, error: null }) }) } };
    return { sb: sb as unknown as SupabaseClient, tabelas, objetos, chamadas, perderLease: () => { token = crypto.randomUUID(); } };
}
