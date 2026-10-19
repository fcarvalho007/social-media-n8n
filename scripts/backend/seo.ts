import { recuperarIdeiasCampanha } from '../seo/ideias-campanha';
import { emitirEvento } from '../seo/eventos';
import { ImagensArtigoNuvem } from './imagens-artigo';
import { IntegracoesEditorais, lerDestinosWebhook } from '../seo/integracoes';
import { GlossariosEditorial } from '../seo/glossarios';
import { criarPlano, bibliotecaPesquisas } from '../seo/planeamento';
import { InventarioEditorial } from '../seo/inventario';
import { LotesEditorial } from '../seo/lotes';
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
import { conferirReferenciasDocumento, documentoConhecimentoNuvem } from './conhecimento';
import type { FonteEditorial } from '../../src/features/seo/contratos';
export async function operarSeo(m: MotorSeo, acao: string, a: Record<string, unknown>) {
    if(acao.startsWith('campanha-')) return operarCampanha(m,acao,a);
    const id = (v: unknown) => z.string().uuid().parse(v), versao = () => z.number().int().positive().parse(a.versao);
    switch (acao) {
        case 'inventario-descobrir': return new InventarioEditorial(m.repo).descobrir(z.string().max(80).parse(a.siteId));
        case 'inventario-verificar': return new InventarioEditorial(m.repo).verificar(z.string().max(80).parse(a.siteId),z.number().int().nonnegative().parse(a.revista),z.array(z.string().max(2000)).min(1).max(10).parse(a.urls),a.importar===true);
        case 'lote-proxima-etapa': return new LotesEditorial(m).proximaEtapa(id(a.id));
        case 'lote-criar': return new LotesEditorial(m).criar(a.lote);
        case 'lote-configurar': return new LotesEditorial(m).configurar(id(a.id), z.number().int().positive().parse(a.revista), z.number().int().positive().parse(a.tetoMicro), a.autorizar===true, a.confirmacao===true);
        case 'plano-criar': return criarPlano(m.repo,a.plano);
        case 'biblioteca-pesquisas': return bibliotecaPesquisas(m.repo);
        case 'glossario-guardar': return new GlossariosEditorial(m.repo).guardar(a.glossario);
        case 'glossario-preparar': return new GlossariosEditorial(m.repo).preparar(id(a.id),versao(),a.termoId?id(a.termoId):null);
        case 'estado': return m.estado();
        case 'pausar': return m.pausar();
        case 'orcamento': return m.orcamentarPesquisa(a.pesquisa);
        case 'conhecimento': return m.guardarConhecimento(z.string().max(80).parse(a.siteId), a.conhecimento);
        case 'conhecimento-documento': return m.adicionarDocumentoConhecimento(z.string().max(80).parse(a.siteId),z.number().int().nonnegative().parse(a.revista),a.documento,a.confirmacao===true);
        case 'usar-conhecimento': return m.usarConhecimento(id(a.id), versao());
        case 'confirmar-estrutura': return m.confirmarEstrutura(id(a.id), versao(), a.estrutura, a.confirmacao === true);
        case 'orcamento-estrutura': return m.orcamentarTexto(id(a.id), false, 'estrutura');
        case 'orcamento-refinamento': return m.orcamentarTexto(id(a.id),false,'texto',a.revisao);
        case 'descartar-proposta': return m.descartarProposta(id(a.id),versao());
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
    constructor(private sb: SupabaseClient, private credenciais: () => CredenciaisSeo, private etapas = false,private webhooks=()=>process.env.HUB_WEBHOOKS_EDITORIAIS) { }
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
        if(acao==='campanha-ideias-recuperar'){const r=await ctx.user.from('hub_editorial_estados').select('dados').eq('project_id',ctx.projeto).maybeSingle();if(r.error||!r.data)throw new FalhaHttp('Pedido não encontrado neste projeto.',404);return recuperarIdeiasCampanha(r.data.dados as EstadoSeo,z.string().uuid().parse(a.id));}
        if (acao === 'resultado') {
            const id = z.string().uuid().parse(a.id), r = await this.sb.from('hub_editorial_artefactos').select('dados').eq('project_id', ctx.projeto).eq('tipo', 'resultado').eq('chave', id).single();
            if (r.error || !r.data)
                throw new FalhaHttp('Resultado não encontrado neste projeto.', 404);
            return r.data.dados;
        }
        if (!['ciclo','biblioteca-pesquisas','integracoes-estado'].includes(acao))
            exigirEscrita(ctx);
        if(acao==='conhecimento-documento'){
            const d=a.documento as {id?:unknown;hash?:unknown;paginas?:unknown[]};
            a={...a,documento:await documentoConhecimentoNuvem(ctx,{id:d?.id,hash:d?.hash,paginas:d?.paginas})};
        }
        if(acao==='conhecimento'||acao==='pauta'||acao==='glossario-guardar'){
            const lista=acao==='conhecimento'?(a.conhecimento as {referencias?:unknown})?.referencias:acao==='glossario-guardar'?(a.glossario as {fontes?:unknown})?.fontes:(a.pauta as {fontes?:unknown})?.fontes;
            if(Array.isArray(lista))await conferirReferenciasDocumento(ctx,lista as FonteEditorial[]);
        }
        if(acao==='pauta'&&(a.pauta as {texto?:{imagem?:{id?:string}}})?.texto?.imagem?.id)await new ImagensArtigoNuvem(this.sb).ficheiro(ctx.projeto,(a.pauta as {texto:{imagem:{id:string}}}).texto.imagem.id);
        if(acao==='campanha-criar'||acao==='campanha-ideias-orcamento'&&!(a.contexto as {campanhaId?:string})?.campanhaId){
            const bruta=acao==='campanha-criar'?a.fonte:(a.contexto as {fonte:unknown}).fonte;
            const fonte=await fonteCampanhaNuvem(ctx,bruta);
            if(fonte.hash!==(bruta as {hash?:string})?.hash)throw new Error('A descoberta mudou. Reabre a fonte antes de preparar a campanha.');
            a=acao==='campanha-criar'?{...a,fonte}:{...a,contexto:{...a.contexto as Record<string,unknown>,fonte}};
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
            if(acao.startsWith('integracoes-')){const i=new IntegracoesEditorais(repo,ctx.projeto,()=>lerDestinosWebhook(this.webhooks()));if(acao==='integracoes-estado')return {...await i.estado(),podeEditar:ctx.escrever};if(acao==='integracoes-guardar')return i.guardar(a.configuracao);if(acao==='integracoes-repetir')return i.repetir(z.string().parse(a.eventoId),z.string().parse(a.destinoId));if(acao==='integracoes-processar'){await this.confirmarOperacao(ctx.projeto);await this.sincronizarPublicacoes(repo,ctx.projeto);return i.processar();}}
            if(acao==='campanha-ideias-executar')await this.confirmarOperacao(ctx.projeto);
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
    private async confirmarOperacao(projeto:string){const r=await this.sb.from('hub_operacao').select('pausado').eq('project_id',projeto).maybeSingle();if(r.error||r.data?.pausado!==false)throw new Error('Serviços externos pausados neste projeto.');}
    private async sincronizarPublicacoes(repo:RepositorioSeoNuvem,projeto:string){
        const r=await this.sb.from('hub_publicacoes').select('*').eq('project_id',projeto).in('estado',['enviado','incerto']).is('evento_estado',null).order('atualizado_em',{ascending:true}).limit(20);
        if(r.error)throw new Error('Não foi possível consultar as confirmações WordPress. Verifica a migração do bloco de artigos.');
        for(const v of r.data??[]){await repo.alterar(e=>{const p=e.pautas.find(p=>p.id===v.pauta_id&&p.siteId===v.site_id);if(!p)return;const tipo=v.estado==='incerto'?'artigo.publicacao_incerta':v.destino==='publish'?'artigo.publicado':'artigo.rascunho_wordpress';emitirEvento(e,{tipo,siteId:v.site_id,artigoId:p.id,versao:v.versao,titulo:p.texto?.titulo||p.titulo,estado:v.estado==='enviado'?v.destino:'por_confirmar',url:v.estado==='enviado'?v.remoto_url:null},`wordpress:${v.id}:${v.estado}`,new Date(v.atualizado_em));});
            const q=await this.sb.from('hub_publicacoes').update({evento_estado:v.estado}).eq('project_id',projeto).eq('id',v.id).eq('estado',v.estado).eq('atualizado_em',v.atualizado_em);if(q.error)throw new Error('O evento ficou guardado; a confirmação do recibo será repetida com o mesmo identificador.');
        }
    }
    async notificar(projeto:string){
        if(this.ativos.has(projeto))return false;
        const repo=new RepositorioSeoNuvem(this.sb,projeto),motor=new MotorSeo('',this.credenciais,this.fetchAutorizado(projeto),()=>new Date(),repo);
        this.ativos.set(projeto,{motor,ocupado:true});
        try{await this.confirmarOperacao(projeto);await motor.iniciar();await this.sincronizarPublicacoes(repo,projeto);const i=new IntegracoesEditorais(repo,projeto,()=>lerDestinosWebhook(this.webhooks()));await i.processar();return true;}
        finally{try{await motor.fechar();}finally{this.ativos.delete(projeto);}}
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
