import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ client: {} as unknown, config: vi.fn(), confirmar: vi.fn() }));
vi.mock('npm:@supabase/supabase-js@2.57.4', () => ({ createClient: () => h.client }));
vi.mock('../../supabase/functions/_shared/conteudos/fonte.server.ts', () => ({ carregarFonteCronica: vi.fn(), carregarFonteTeste: vi.fn(), ErroFonte: class extends Error {} }));
vi.mock('../../supabase/functions/_shared/newsletter-engine/sincronizar-egoi.server.ts', () => ({ lerConfig: h.config }));
vi.mock('../../supabase/functions/_shared/newsletter-engine/egoi-estado.ts', () => ({ consultarEstadoCampanha: h.confirmar }));
const MODULO = '../../supabase/functions/_shared/conteudos/jobs.server.ts';
const { processarJobs } = await import(/* @vite-ignore */ MODULO);

function banco() {
  const job = { id: 'j', lease_token: 'lease', edicao_id: 'ed', conteudo_id: 'c', estado: 'aguarda_confirmacao', tentativas: 2, max_tentativas: 3, campanhas: [{ lista_id: 'real', campaign_hash: 'camp', confirmada: false }] };
  const tabelas: string[] = [];
  const patches: Record<string, unknown>[] = [];
  const sb = {
    rpc: vi.fn(async () => ({ data: [structuredClone(job)], error: null })),
    from: (table: string) => {
      tabelas.push(table);
      let patch: Record<string, unknown> | null = null;
      const run = () => {
        if (patch) { patches.push(patch); Object.assign(job, patch); return { data: [{ id: job.id }], error: null }; }
        return { data: [{ id: 'real', tipo: 'real' }], error: null };
      };
      const q = { select: () => q, eq: () => q, in: () => q, update: (p: Record<string, unknown>) => { patch = p; return q; }, then: (ok: (r: unknown) => unknown) => Promise.resolve(run()).then(ok) };
      return q;
    },
  };
  h.client = sb;
  return { job, tabelas, patches };
}

beforeEach(() => { vi.resetAllMocks(); vi.stubEnv('DEEPSEEK_API_KEY', 'local-fake-never-used'); });
afterEach(() => vi.unstubAllEnvs());
describe('falhas de confirmação não autorizam IA nem consomem as suas tentativas', () => {
  it('uma configuração que lança erro continua por confirmar em execuções seguintes', async () => {
    const b = banco(); h.config.mockRejectedValue(new Error('Rede indisponível'));
    await processarJobs(); await processarJobs();
    expect(b.job.estado).toBe('aguarda_confirmacao');
    expect(b.job.tentativas).toBe(2);
    expect(b.patches).toHaveLength(2);
    expect(b.tabelas).not.toContain('nl_conteudos_derivados');
    expect(b.patches.every(p => p.lease_token === null && p.reservado_ate === null)).toBe(true);
  });
  it('uma exceção na consulta E-goi preserva o limite de tentativas e a confirmação', async () => {
    const b = banco(); h.config.mockResolvedValue({ egoi_api_key: 'fake' }); h.confirmar.mockRejectedValue(new Error('Timeout'));
    await processarJobs();
    expect(b.job.estado).toBe('aguarda_confirmacao');
    expect(b.job.tentativas).toBe(2);
    expect(b.tabelas).not.toContain('nl_conteudos_derivados');
  });
});
