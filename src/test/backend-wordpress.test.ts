// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { PublicadorWordPress, credencialWordPress, htmlArtigo, type pedidoWordPress } from '../../scripts/backend/wordpress';
import { assinaturaPauta } from '../../scripts/seo/editorial';
import { estadoInicialSeo } from '@/features/seo/catalogo';
import type { PautaEditorial } from '@/features/seo/contratos';
import type { JobHub } from '../../scripts/backend/worker';
import { supabaseMemoria } from './apoio/supabase-memoria';
const projeto = '00000000-0000-4000-8000-000000000001', pautaId = '00000000-0000-4000-8000-000000000002';
function base(siteId = 'sms', aprovar = true) {
    const e = estadoInicialSeo(), s = e.sites.find(s => s.id === siteId)!;
    e.configuracao.pausado = false;
    e.configuracao.automacaoPausada = false;
    const p: PautaEditorial = { id: pautaId, siteId, titulo: 'Procedimento para comunicar com clientes', palavra: 'comunicação', origem: 'topico', contributo: 'Um procedimento próprio para preparar mensagens relevantes e organizar a comunicação da equipa.', objetivo: 'Preparar a comunicação da equipa.', cta: 'Avaliar o contexto da empresa.', fontes: [{ id: 'f1', titulo: 'Guia de referência', url: 'https://example.org/guia', excerto: 'Um guia que explica como identificar o público e as necessidades de comunicação antes de preparar mensagens. '.repeat(3), aprovada: true, verificadaEm: '2026-10-18T10:00:00Z' }], dataPretendida: '', pesquisaId: null, modoOrigem: 'manual', estado: 'aprovado', versao: 1, criadoEm: '2026-10-18', alteradoEm: '2026-10-18', texto: { titulo: 'Procedimento para comunicar com clientes', slug: 'procedimento-comunicar-clientes', resumo: 'Um procedimento prático para organizar a comunicação da equipa.', corpo: '## Escolher um objetivo\n\n' + ('A equipa deve definir a necessidade concreta e a utilidade de cada mensagem antes de escolher o canal. '.repeat(4)) + '[fonte:f1]\n\n## Preparar a execução\n\n' + ('Definir quem revê a mensagem permite organizar o processo e verificar se a informação está correta. '.repeat(4)), afirmacoes: [{ trecho: 'A equipa deve definir a necessidade concreta e a utilidade de cada mensagem.', fonteIds: ['f1'] }], alertas: [] }, proposta: null, aprovacao: null, motivo: null, producaoAutomaticaAutorizada: false };
    if (aprovar)
        p.aprovacao = { assinatura: assinaturaPauta(p, s), versao: 1, em: '2026-10-18' };
    e.pautas = [p];
    const mem = supabaseMemoria({ hub_editorial_estados: [{ project_id: projeto, revisao: 1, dados: e }], hub_operacao: [{ project_id: projeto, pausado: false }] });
    let remoto: Record<string, unknown> | null = null;
    const pedir = vi.fn(async (_c: unknown, caminho: string, method = 'GET', dados?: unknown) => {
        if (method === 'GET')
            return caminho.includes('/posts/99?') ? remoto : remoto ? [remoto] : [];
        remoto = { id: 99, link: `https://${s.dominio}/procedimento-comunicar-clientes/`, status: (dados as {
                status: string;
            }).status, modified_gmt: '2026-10-18T12:00:00', content: { raw: (dados as {
                    content: string;
                }).content } };
        return remoto;
    }) as unknown as typeof pedidoWordPress;
    const publicador = new PublicadorWordPress(mem.sb, () => ({ url: `https://${s.dominio}`, user: 'utilizador-teste', password: 'senha-teste' }), () => true, pedir);
    const job: JobHub = { id: crypto.randomUUID(), project_id: projeto, tipo: 'wordpress', pedido: { pautaId, versao: 1, destino: 'publish', confirmar: true }, lease_token: crypto.randomUUID() };
    return { ...mem, e, p, s, job, pedir, publicador, remoto: () => remoto, alterarRemoto: () => {
            if (remoto)
                remoto.modified_gmt = '2026-10-18T13:00:00';
        } };
}
describe('WordPress por destino, versão e aprovação', () => {
    it('recusa personal sem aprovação mesmo com um pedido direto', async () => { const b = base('frederico', false); await expect(b.publicador.executar(b.job)).rejects.toThrow('aprovação humana'); expect(b.pedir).not.toHaveBeenCalled(); });
    it('recusa uma assinatura desatualizada', async () => { const b = base('frederico'); (b.tabelas.hub_editorial_estados[0].dados as typeof b.e).pautas[0].texto!.corpo += ' Alteração humana posterior.'; await expect(b.publicador.executar(b.job)).rejects.toThrow('aprovação humana'); expect(b.pedir).not.toHaveBeenCalled(); });
    it('uma repetição não cria outro artigo nem volta a chamar o WordPress', async () => { const b = base(); expect(await b.publicador.executar(b.job)).toMatchObject({ id: 99, estado: 'publish' }); const chamadas = vi.mocked(b.pedir).mock.calls.length; expect(await b.publicador.executar(b.job)).toMatchObject({ reutilizado: true, id: 99 }); expect(b.pedir).toHaveBeenCalledTimes(chamadas); });
    it('pode passar do rascunho para publicação aprovada usando o mesmo id remoto', async () => { const b = base(); await b.publicador.executar({ ...b.job, pedido: { ...b.job.pedido, destino: 'draft' } }); await b.publicador.executar(b.job); const posts = vi.mocked(b.pedir).mock.calls.filter(c => c[2] === 'POST'); expect(posts.map(c => c[1])).toEqual(['/wp-json/wp/v2/posts', '/wp-json/wp/v2/posts/99']); });
    it('não substitui alterações feitas diretamente no WordPress', async () => { const b = base(); await b.publicador.executar({ ...b.job, pedido: { ...b.job.pedido, destino: 'draft' } }); b.alterarRemoto(); await expect(b.publicador.executar(b.job)).rejects.toThrow('alterado no WordPress'); expect(vi.mocked(b.pedir).mock.calls.filter(c => c[2] === 'POST')).toHaveLength(1); });
    it('uma resposta perdida fica incerta e nunca repete o POST automaticamente', async () => {
        const b = base();
        vi.mocked(b.pedir).mockImplementation(async (_c, _u, metodo) => {
            if (metodo === 'POST')
                throw new Error('Resposta perdida');
            return [];
        });
        await expect(b.publicador.executar(b.job)).rejects.toThrow('Resposta perdida');
        expect(b.tabelas.hub_publicacoes[0].estado).toBe('incerto');
        await expect(b.publicador.executar(b.job)).rejects.toThrow('incerto');
        expect(vi.mocked(b.pedir).mock.calls.filter(c => c[2] === 'POST')).toHaveLength(1);
    });
    it('reconcilia uma resposta perdida apenas por leitura e sem novo POST', async () => {
        const b = base(), original = b.pedir;
        let perder = true;
        const chamada = vi.mocked(b.pedir).getMockImplementation()!;
        vi.mocked(original).mockImplementation(async (...args) => {
            const r = await chamada(...args);
            if (args[2] === 'POST' && perder) {
                perder = false;
                throw new Error('Resposta perdida depois de guardar');
            }
            return r;
        });
        await expect(b.publicador.executar(b.job)).rejects.toThrow('Resposta perdida');
        const envio = b.tabelas.hub_publicacoes[0];
        expect(await b.publicador.reconciliar(projeto, String(envio.id))).toMatchObject({ confirmado: true });
        expect(vi.mocked(b.pedir).mock.calls.filter(c => c[2] === 'POST')).toHaveLength(1);
    });
    it('mudar a versão depois de uma resposta perdida não contorna a reserva',async()=>{
        const b=base();vi.mocked(b.pedir).mockImplementation(async (_c,_u,m)=>{if(m==='POST')throw new Error('Resposta perdida');return [];});
        await expect(b.publicador.executar(b.job)).rejects.toThrow('Resposta perdida');
        const p=(b.tabelas.hub_editorial_estados[0].dados as typeof b.e).pautas[0];p.versao=2;p.aprovacao={assinatura:assinaturaPauta(p,b.s),versao:2,em:'2026-10-18'};
        await expect(b.publicador.executar({...b.job,pedido:{...b.job.pedido,versao:2}})).rejects.toThrow('incerto');
        expect(vi.mocked(b.pedir).mock.calls.filter(c=>c[2]==='POST')).toHaveLength(1);
    });
    it('mudar o slug de uma nova versão atualiza o id remoto em vez de duplicar',async()=>{
        const b=base();await b.publicador.executar(b.job);
        const p=(b.tabelas.hub_editorial_estados[0].dados as typeof b.e).pautas[0];p.versao=2;p.texto!.slug='nova-url';p.aprovacao={assinatura:assinaturaPauta(p,b.s),versao:2,em:'2026-10-18'};
        await b.publicador.executar({...b.job,pedido:{...b.job.pedido,versao:2}});
        expect(vi.mocked(b.pedir).mock.calls.filter(c=>c[2]==='POST').map(c=>c[1])).toEqual(['/wp-json/wp/v2/posts','/wp-json/wp/v2/posts/99']);
    });
    it('não mistura credenciais entre os domínios nem aceita redirecionamentos configurados', () => { expect(() => credencialWordPress('sms', { HUB_WP_SMS_URL: 'https://fredericocarvalho.pt', HUB_WP_SMS_USER: 'u', HUB_WP_SMS_PASSWORD: 'p' })).toThrow('domínio'); expect(credencialWordPress('ensino', {})).toBeNull(); });
    it('renderiza fontes e markdown com HTML escapado', () => { const b = base(); b.p.texto!.corpo = '## Um título\n\nTexto **destacado** [fonte:f1] <script>erro</script>\n\n- Uma tarefa\n- Outra tarefa'; const html = htmlArtigo(b.p, 'marcador-teste'); expect(html).toContain('<strong>destacado</strong>'); expect(html).toContain('href="https://example.org/guia"'); expect(html).toContain('&lt;script&gt;'); expect(html).not.toContain('<script>'); expect(html).toContain('<ul><li>Uma tarefa</li>'); });
});


describe('metadados e imagem completa antes da confirmação remota',()=>{
    it('sem ponte SEO não reserva nem escreve um artigo',async()=>{const b=base('sms',false),p=(b.tabelas.hub_editorial_estados[0].dados as typeof b.e).pautas[0];p.texto!.seo={titulo:'Título SEO',descricao:'Descrição SEO que acompanha o artigo.',schema:'Article',enviar:true};p.aprovacao={assinatura:assinaturaPauta(p,b.s),versao:p.versao,em:new Date().toISOString()};await expect(b.publicador.executar(b.job)).rejects.toThrow('ponte');expect(b.tabelas.hub_publicacoes??[]).toHaveLength(0);expect(vi.mocked(b.pedir).mock.calls.some(c=>c[2]==='POST')).toBe(false);});
    it('aplica título SEO e descrição através do contrato autenticado e verifica a resposta',async()=>{const b=base('sms',false),p=(b.tabelas.hub_editorial_estados[0].dados as typeof b.e).pautas[0];p.texto!.seo={titulo:'Título para pesquisa',descricao:'Descrição SEO específica para a pesquisa.',schema:'Article',enviar:true};p.aprovacao={assinatura:assinaturaPauta(p,b.s),versao:p.versao,em:new Date().toISOString()};const original=vi.mocked(b.pedir).getMockImplementation()!;vi.mocked(b.pedir).mockImplementation(async(...args)=>{if(args[1].includes('/capabilities'))return{versao:1,metadados:true};const r=await original(...args);return args[2]==='POST'?{...r as object,hub_editorial:(args[3] as {hub_editorial:unknown}).hub_editorial}:r;});await expect(b.publicador.executar(b.job)).resolves.toMatchObject({estado:'publish'});expect(b.tabelas.hub_publicacoes[0].estado).toBe('enviado');});
    it('não confirma uma imagem destacada diferente da esperada, nem contorna o bloqueio ao reconciliar',async()=>{const b=base(),job={...b.job,pedido:{...b.job.pedido,featuredMedia:44}};await expect(b.publicador.executar(job)).rejects.toThrow('imagem destacada');expect(b.tabelas.hub_publicacoes[0].imagem_esperada).toBe(44);expect(await b.publicador.reconciliar(projeto,String(b.tabelas.hub_publicacoes[0].id))).toMatchObject({confirmado:false});expect(vi.mocked(b.pedir).mock.calls.filter(c=>c[2]==='POST')).toHaveLength(1);});
});

it('uma falha conhecida antes do POST permite nova preparação sem criar outro artigo',async()=>{const b=base(),original=vi.mocked(b.pedir).getMockImplementation()!;vi.mocked(b.pedir).mockRejectedValueOnce(new Error('Consulta de preparação falhou'));await expect(b.publicador.executar(b.job)).rejects.toThrow('preparação');expect(b.tabelas.hub_publicacoes[0]).toMatchObject({estado:'falhou',escrita_iniciada:false});vi.mocked(b.pedir).mockImplementation(original);await expect(b.publicador.executar(b.job)).resolves.toMatchObject({id:99});expect(b.tabelas.hub_publicacoes).toHaveLength(1);expect(vi.mocked(b.pedir).mock.calls.filter(c=>c[2]==='POST')).toHaveLength(1);});
