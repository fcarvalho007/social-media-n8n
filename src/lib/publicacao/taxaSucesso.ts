// Publication success rate: a network counts as success only with an external reference from that network.
export interface PostTaxa { selected_networks: string[] | null; external_post_ids: Record<string, string> | null; status: string | null }
export interface TaxaRede { rede: string; sucesso: number; total: number; pct: number }
export interface Taxa { sucesso: number; total: number; pct: number; redes: TaxaRede[] }

// Still in progress or only scheduled: not an attempt yet.
const EM_CURSO = new Set(["scheduled", "pending", "waiting_for_approval", "publishing", "draft"]);
const pct = (s: number, t: number) => (t ? Math.round((s / t) * 100) : 0);

export function taxaSucesso(posts: PostTaxa[]): Taxa {
  const m = new Map<string, { s: number; t: number }>();
  for (const p of posts) {
    if (p.status && EM_CURSO.has(p.status)) continue;
    for (const r of p.selected_networks ?? []) {
      const e = m.get(r) ?? { s: 0, t: 0 };
      e.t++;
      if (p.external_post_ids?.[r]) e.s++;
      m.set(r, e);
    }
  }
  const redes = [...m].map(([rede, e]) => ({ rede, sucesso: e.s, total: e.t, pct: pct(e.s, e.t) }));
  const sucesso = redes.reduce((a, r) => a + r.sucesso, 0);
  const total = redes.reduce((a, r) => a + r.total, 0);
  return { sucesso, total, pct: pct(sucesso, total), redes };
}
