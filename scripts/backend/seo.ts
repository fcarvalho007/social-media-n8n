import process from 'node:process';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { MotorSeo, type CredenciaisSeo } from '../seo/motor-local';
import { RepositorioSeoNuvem } from './repositorio-seo';
import { estruturaAtual } from '../seo/editorial';
import { estadoInicialSeo } from '../../src/features/seo/catalogo';
import type { EstadoSeo } from '../../src/features/seo/contratos';
import { exigirEscrita, FalhaHttp, type ContextoBackend } from './seguranca';
import { fonteCampanhaNuvem, lerComposicaoCampanha, operarCampanha } from './campanhas';
import { CampanhasEditorial } from '../seo/campanhas';
export async function operarSeo(m: MotorSeo, acao: string, a: Record<string, unknown>) {
    if(acao.startsWith('campanha-')) return operarCampanha(m,acao,a);
    const id = (v: unknown) => z.string().uuid().parse(v), versao = () => z.number().int().positive().parse(a.versao);
    switch (acao) {
        case 'estado': return m.estado();
        case 'pausar': return m.pausar();
        case 'orcamento': return m.orcamentarPesquisa(a.pesquisa);
        case 'conhecimento': return m.guardarConhecimento(z.string().max(80).parse(a.siteId), a.conhecimento);
        case 'usar-conhecimento': return m.usarConhecimento(id(a.id), versao());
        case 'confirmar-estrutura': return m.confirmarEstrutura(id(a.id), versao(), a.estrutura, a.confirmacao === true);
        case 'orcamento-estrutura': return m.orcamentarTexto(id(a.id), false, 'estrutura');
        case 'orcamento-texto': return m.orcamentarTexto(id(a.id));
        case 'executar': {
            const p = await m.executar(id(a.id), a.confirmar === true);
            return await m.aguardar(p.id);
        }
        case 'resultado': return m.resultado(id(a.id));
        case 'configuracao': return m.guardarConfiguracao(a.configuracao);
        case 'configurar-site': return m.configurarSite(z.string().max(80).parse(a.siteId), z.number().int().positive().parse(a.revista), a.definicao, a.confirmacao === true);
        case 'politica': return m.guardarPolitica(z.string().max(80).parse(a.siteId), a.politica, z.number().int().parse(a.revista), a.identidade);
        case 'pauta': return m.guardarPauta(a.pauta);
        case 'planear': return m.planear(id(a.id), z.array(z.string().max(80)).min(1).max(20).parse(a.palavras), z.string().max(80).parse(a.siteId));
        case 'aplicar': return m.aplicarProposta(id(a.id), versao());
        case 'aprovar': return m.aprovar(id(a.id), versao(), a.confirmacao === true);
        case 'reconciliar': return m.reconciliar(id(a.id), z.number().int().nonnegative().parse(a.micro), z.string().max(4000).parse(a.nota));
        case 'ligacao': return m.verificarLigacao();
        case 'ciclo': return m.preverCiclo();
        default: throw new FalhaHttp('Operação editorial desconhecida.', 404);
    }
}
export class ServicoSeo {
    private ativos = new Map<string, {
        motor: MotorSeo;
        ocupado: boolean;
    }>();
    constructor(private sb: SupabaseClient, private credenciais: () => CredenciaisSeo, private etapas = false) { }
    async executar(ctx: ContextoBackend, acao: string, a: Record<string, unknown>) {
        if (acao === 'estado') {
            const r = await this.sb.from('hub_editorial_estados').select('dados').eq('project_id', ctx.projeto).maybeSingle();
            if (r.error)
                throw new Error('O histórico editorial não pôde ser lido.');
            const { orcamentos: _, ...e } = (r.data?.dados ?? estadoInicialSeo()) as EstadoSeo;
            const c = this.credenciais();
            const campanhas=new CampanhasEditorial(new RepositorioSeoNuvem(this.sb,ctx.projeto));
            return { ...e, revisoesCampanhas:Object.fromEntries(await Promise.all((e.campanhas??[]).map(async p=>[p.id,await campanhas.estadoRevisoes(p,e as EstadoSeo)]))), podeEditar: ctx.escrever, pautas: e.pautas.map(p => ({ ...p, estruturaAtual: estruturaAtual(p, e.sites.find(s => s.id === p.siteId)!) })), ligacao: { dataforseo: !!(c.login && c.password), deepseek: !!c.deepseek, servidorLigado: true }, erroMotor: null };
        }
        if(acao==='campanha-fonte')return fonteCampanhaNuvem(ctx,a.fonte);
        if(acao==='campanha-composicao'){
            const r=await ctx.user.from('hub_editorial_estados').select('dados').eq('project_id',ctx.projeto).maybeSingle();
            if(r.error||!r.data)throw new Error('Não foi possível ler a campanha neste projeto.');
            return lerComposicaoCampanha(ctx,r.data.dados as EstadoSeo,a,this.sb);
        }
        if (acao === 'resultado') {
            const id = z.string().uuid().parse(a.id), r = await this.sb.from('hub_editorial_artefactos').select('dados').eq('project_id', ctx.projeto).eq('tipo', 'resultado').eq('chave', id).single();
            if (r.error || !r.data)
                throw new FalhaHttp('Resultado não encontrado neste projeto.', 404);
            return r.data.dados;
        }
        if (!['ciclo'].includes(acao))
            exigirEscrita(ctx);
        if(acao==='campanha-criar'){
            const fonte=await fonteCampanhaNuvem(ctx,a.fonte);
            if(fonte.hash!==(a.fonte as {hash?:string})?.hash)throw new Error('A descoberta mudou. Reabre a fonte antes de preparar a campanha.');
            a={...a,fonte};
        }
        if (acao === 'executar-ciclo') {
            exigirEscrita(ctx);
            const r = await ctx.user.rpc('hub_enfileirar', { _projeto: ctx.projeto, _tipo: 'seo_ciclo', _dedup: `manual:${z.string().uuid().parse(a.pedidoId)}`, _pedido: {} });
            if (r.error)
                throw new Error('Não foi possível enfileirar o ciclo. Confirma a retoma do serviço.');
            return { iniciado: true, id: r.data };
        }
        if (acao === 'credenciais')
            throw new FalhaHttp('As credenciais são configuradas apenas no servidor, fora do navegador.', 403);
        // A live request never shares a mutable engine with another request/process.
        if (this.ativos.has(ctx.projeto))
            throw new FalhaHttp('Existe uma operação em curso neste projeto. Aguarda e atualiza.', 409);
        const repo = new RepositorioSeoNuvem(this.sb, ctx.projeto), motor = new MotorSeo('', this.credenciais, this.fetchAutorizado(ctx.projeto), () => new Date(), repo);
        this.ativos.set(ctx.projeto, { motor, ocupado: true });
        try {
            await motor.iniciar();
            return await operarSeo(motor, acao, a);
        }
        finally {
            try {
                await motor.fechar();
            }
            finally {
                this.ativos.delete(ctx.projeto);
            }
        }
    }
    private fetchAutorizado(projeto: string): typeof fetch {
        return async (input, init) => {
            const r = await this.sb.from('hub_operacao').select('pausado').eq('project_id', projeto).maybeSingle();
            if (r.error || r.data?.pausado !== false)
                throw new Error('Serviços externos pausados. Nenhum pedido foi enviado.');
            return fetch(input, init);
        };
    }
    async ciclo(projeto: string) {
        if (this.ativos.has(projeto))
            return false;
        const motor = new MotorSeo('', this.credenciais, this.fetchAutorizado(projeto), () => new Date(), new RepositorioSeoNuvem(this.sb, projeto));
        this.ativos.set(projeto, { motor, ocupado: true });
        try {
            await motor.iniciar();
            if (this.etapas)
                await motor.executarEtapaCiclo();
            else
                await motor.executarCiclo();
            return true;
        }
        finally {
            try {
                await motor.fechar();
            }
            finally {
                this.ativos.delete(projeto);
            }
        }
    }
}
