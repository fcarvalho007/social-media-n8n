// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { carregarCatalogo } from '@/features/percurso/catalogo';
import { estadoInicialSeo } from '@/features/seo/catalogo';
import type { SupabaseClient } from '@supabase/supabase-js';
function banco(falhar = '') {
  const leituras: { tabela: string; filtros: Record<string, unknown>; inicio: number }[] = [];
  const tabelas: Record<string, any[]> = {
    art_rascunhos: [{ id: 'a1', project_id: 'p1', created_by: 'u1', titulo: 'Meu artigo', corpo: 'Marketing' }, { id: 'a2', project_id: 'p2', created_by: 'u1', titulo: 'Outro projeto' }, { id: 'a3', project_id: 'p1', created_by: 'u2', titulo: 'Outra conta' }],
    posts_drafts: [{ id: 's1', project_id: 'p1', user_id: 'u1', caption: 'Minha legenda' }, { id: 's2', project_id: 'p1', user_id: 'u2', caption: 'Legenda alheia' }], nl_noticias: [{ id: 'n1', titulo: 'Curadoria autorizada pela RLS', descricao: 'Notícia' }], mc_documentos: [],
  };
  return { leituras, sb: { from: (tabela: string) => {
    const filtros: Record<string, unknown> = {}; let ini = 0, fim = 0;
    const q: any = { select: () => q, eq: (k: string, v: unknown) => { filtros[k] = v; return q; }, order: () => q, range: (i: number, f: number) => { ini = i; fim = f; return q; }, then: (ok: (v: unknown) => void) => { leituras.push({ tabela, filtros, inicio: ini }); return Promise.resolve({ data: (tabelas[tabela] ?? []).filter(r => Object.entries(filtros).every(([k, v]) => r[k] === v)).slice(ini, fim + 1), error: tabela === falhar ? { message: 'falha' } : null }).then(ok); } }; return q;
  } } as unknown as SupabaseClient };
}
describe('limites de acesso do catálogo transversal', () => {
  it('filtra projeto e autor nas peças privadas sem cliente de serviço', async () => {
    const b = banco(); const r = await carregarCatalogo(b.sb, 'u1', 'p1', async () => estadoInicialSeo(), async () => []);
    expect(r.avisos).toEqual([]); expect(r.itens.map(i => i.titulo)).toEqual(expect.arrayContaining(['Meu artigo', 'Minha legenda']));
    expect(r.itens.map(i => i.titulo)).not.toEqual(expect.arrayContaining(['Outro projeto'])); expect(r.itens.some(i => /alheia|Outra conta/.test(i.titulo))).toBe(false);
    expect(b.leituras.find(l => l.tabela === 'art_rascunhos')?.filtros).toEqual({ project_id: 'p1', created_by: 'u1' });
    expect(b.leituras.find(l => l.tabela === 'posts_drafts')?.filtros).toEqual({ project_id: 'p1', user_id: 'u1' });
    expect(b.leituras.find(l => l.tabela === 'mc_documentos')?.filtros).toEqual({ project_id: 'p1' });
  });
  it('uma fonte com falha não elimina as outras nem se transforma em ausência de resultados', async () => {
    const b = banco('nl_noticias'); const r = await carregarCatalogo(b.sb, 'u1', 'p1', async () => estadoInicialSeo(), async () => { throw new Error('PDF indisponível'); });
    expect(r.itens.some(i => i.id === 'artigo:a1')).toBe(true); expect(r.avisos).toHaveLength(2); expect(r.avisos.join(' ')).toMatch(/PDFs indisponíveis/); expect(r.avisos.join(' ')).toMatch(/Notícias indisponíveis/);
  });
});
