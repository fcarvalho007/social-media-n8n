// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { RepositorioSeoNuvem } from '../../scripts/backend/repositorio-seo';
import { ServicoSeo } from '../../scripts/backend/seo';
import { estadoInicialSeo } from '@/features/seo/catalogo';
import { supabaseMemoria } from './apoio/supabase-memoria';
const projeto = '00000000-0000-4000-8000-000000000001';
describe('histórico editorial na nuvem', () => {
    it('reconstitui o estado sem perder reservas de custo e assinala interrupções', async () => {
        const e = estadoInicialSeo();
        e.pedidos.push({ id: crypto.randomUUID(), tipo: 'pesquisa', operacao: 'serp', modo: 'real', estado: 'em_curso', estimativaMicro: 1000, custoMicro: null, reservaMicro: 1000, cambio: 1, criadoEm: new Date().toISOString(), linhas: [] } as typeof e.pedidos[number]);
        const m = supabaseMemoria({ hub_editorial_estados: [{ project_id: projeto, revisao: 1, dados: e }] }), r = new RepositorioSeoNuvem(m.sb, projeto);
        await r.iniciar();
        try {
            const n = await r.ler();
            expect(n.pedidos[0]).toMatchObject({ estado: 'incerto', reservaMicro: 1000, custoMicro: null });
        }
        finally {
            await r.fechar();
        }
    });
    it('recusa qualquer escrita depois de perder a reserva, sem substituir o histórico', async () => {
        const m = supabaseMemoria(), r = new RepositorioSeoNuvem(m.sb, projeto);
        await r.iniciar();
        try {
            m.perderLease();
            await expect(r.alterar(e => { e.configuracao.pausado = false; })).rejects.toThrow('reserva');
            expect(m.tabelas.hub_editorial_estados[0].dados).toEqual(estadoInicialSeo());
        }
        finally {
            await r.fechar();
        }
    });
    it('estado e resultados podem ser consultados enquanto outro processo detém a reserva', async () => {
        const e = estadoInicialSeo(), m = supabaseMemoria({ hub_editorial_estados: [{ project_id: projeto, revisao: 1, dados: e }] }), r = new RepositorioSeoNuvem(m.sb, projeto);
        await r.iniciar();
        try {
            const s = new ServicoSeo(m.sb, () => ({}));
            const x = await s.executar({ projeto, userId: crypto.randomUUID(), escrever: false, user: m.sb }, 'estado', {});
            expect(x).toMatchObject({ versao: 1, ligacao: { dataforseo: false } });
            expect(m.chamadas.filter(c => c.nome === 'hub_lease_reservar')).toHaveLength(1);
        }
        finally {
            await r.fechar();
        }
    });
    it('não tenta reparar um histórico adulterado nem o troca por um plano vazio', async () => { const m = supabaseMemoria({ hub_editorial_estados: [{ project_id: projeto, revisao: 3, dados: { versao: 1 } }] }), r = new RepositorioSeoNuvem(m.sb, projeto); await expect(r.iniciar()).rejects.toThrow('inválidos'); expect(m.tabelas.hub_editorial_estados[0].revisao).toBe(3); expect(m.chamadas.at(-1)?.nome).toBe('hub_lease_libertar'); });
});
