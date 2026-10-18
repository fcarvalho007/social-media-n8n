// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { MotorSeo } from '../../scripts/seo/motor-local';
import { operarSeo, ServicoSeo } from '../../scripts/backend/seo';
import { promptEditorial } from '../../scripts/seo/editorial';
import { definicaoDoSite, estadoConfiguracaoSite, schemaDefinicaoSite, problemasDefinicao } from '@/features/seo/configuracaoSite';
import type { PautaEditorial } from '@/features/seo/contratos';
import { supabaseMemoria } from './apoio/supabase-memoria';
const agora = new Date('2026-10-18T18:00:00Z');
const motores: MotorSeo[] = [];
async function preparar() {
  const fornecedor = vi.fn(async () => { throw new Error('Nenhuma API deve ser chamada ao configurar um site.'); });
  const m = new MotorSeo(await mkdtemp(path.join(tmpdir(), 'hub-config-site-')), () => ({}), fornecedor, () => agora);
  await m.iniciar(); motores.push(m); const s = (await m.estado()).sites[0];
  return { m, s, d: definicaoDoSite(s), fornecedor };
}
afterEach(async () => { await Promise.all(motores.splice(0).map(m => m.fechar())); });
describe('configuração guiada: persistência e regras do motor', () => {
  it('guarda todos os campos numa revisão, conserva limites e não inicia fornecedores', async () => {
    const { m, s, d, fornecedor } = await preparar(); const antes = await m.repo.ler();
    const novo = { ...d, publico: 'Gestores de empresas que procuram melhorar as suas campanhas.', voz: 'Português de Portugal, direto e claro; exemplos sempre identificados.', objetivo: 'Aumentar o tráfego orgânico relevante para empresas.', oferta: 'Consultoria para avaliar a estratégia de comunicação da empresa.', temasPermitidos: ['Campanhas segmentadas', 'Fidelização'], dias: [1, 4], hora: '10:30', publicacao: 'automatica' as const, producao: 'automatica' as const };
    const salvo = await m.configurarSite(s.id, s.politica.revista, novo, true);
    expect(salvo).toMatchObject({ publico: novo.publico, oferta: novo.oferta, configuracaoGuiada: { concluidaEm: agora.toISOString(), revista: 2 }, politica: { dias: [1,4], hora: '10:30', limiteSemanal: 2, producao: 'automatica', publicacao: 'automatica', ativa: false } });
    expect(salvo.politica.mensalMicro).toBe(s.politica.mensalMicro); expect(salvo.politica.pesquisarAutomaticamente).toBe(false);
    const estado = await m.repo.ler(); expect(estado.configuracao).toEqual(antes.configuracao); expect(estado.pedidos).toEqual([]); expect(estado.slots).toEqual([]); expect(estado.auditoria.at(-1)?.acao).toBe('site_configurado');
    expect(fornecedor).not.toHaveBeenCalled(); expect(estadoConfiguracaoSite(salvo)).toBe('Configuração revista');
  });
  it('reabre as definições guardadas após reiniciar o motor', async () => {
    const { m, s, d } = await preparar(); await m.configurarSite(s.id, 1, { ...d, voz: 'Uma voz empresarial sóbria com linguagem simples e rigorosa.' }, true);
    const raiz = m.repo.raiz; await m.fechar(); const novo = new MotorSeo(raiz, () => ({})); await novo.iniciar(); motores.push(novo);
    expect((await novo.estado()).sites[0].voz).toContain('sóbria'); expect((await novo.estado()).sites[0].configuracaoGuiada?.revista).toBe(2);
  });
  it('exige confirmação final antes de mudar o estado', async () => {
    const { m, s, d } = await preparar(); const e = await m.repo.ler();
    await expect(m.configurarSite(s.id, 1, d)).rejects.toThrow('Confirma'); expect(await m.repo.ler()).toEqual(e);
  });
  it('recusa alteração concorrente de forma atómica e preserva a primeira versão', async () => {
    const { m, s, d } = await preparar(); await m.configurarSite(s.id, 1, { ...d, oferta: 'A primeira oferta aprovada para esta marca.' }, true);
    await expect(m.configurarSite(s.id, 1, { ...d, oferta: 'A segunda oferta de uma versão antiga.' }, true)).rejects.toThrow('noutro separador');
    expect((await m.estado()).sites[0].oferta).toContain('primeira'); expect((await m.repo.ler()).auditoria.filter(a => a.acao === 'site_configurado')).toHaveLength(1);
  });
  it('o site pessoal recusa publicação automática mesmo num pedido direto', async () => {
    const { m } = await preparar(); const s = (await m.estado()).sites.find(s => s.id === 'frederico')!;
    await expect(m.configurarSite(s.id, 1, { ...definicaoDoSite(s), publicacao: 'automatica' }, true)).rejects.toThrow('aprovação humana');
    expect((await m.estado()).sites.find(x => x.id === 'frederico')?.configuracaoGuiada).toBeUndefined();
  });
  it('destinos planeados podem ser preparados mas não automatizados', async () => {
    const { m } = await preparar(); const s = (await m.estado()).sites.find(s => s.id === 'ensino')!;
    const d = { ...definicaoDoSite(s), publico: 'Famílias que procuram informação educativa acessível.', voz: 'Educativo e rigoroso, com referências verificáveis.', objetivo: 'Reunir informação útil sobre educação e aprendizagem.', oferta: 'Guias educativos e recursos, sem oferta comercial confirmada.', temasPermitidos: ['Aprendizagem'] };
    const salvo = await m.configurarSite(s.id, 1, d, true); expect(salvo.estado).toBe('planeado'); expect(salvo.politica.ativa).toBe(false);
    await expect(m.configurarSite(s.id, 2, { ...d, producao: 'automatica' }, true)).rejects.toThrow('planeado');
  });
  it('não aceita campos ocultos para ativar serviços, alargar orçamento ou mudar domínio', async () => {
    const { m, s, d } = await preparar();
    for (const extra of [{ ativa: true }, { mensalMicro: 999999999 }, { dominio: 'alheio.pt' }, { revisaoObrigatoria: false }]) await expect(m.configurarSite(s.id, 1, { ...d, ...extra }, true)).rejects.toThrow();
    expect((await m.estado()).sites[0]).toEqual(s);
  });
  it('preserva as autorizações avançadas já ativas e o conhecimento da marca', async () => {
    const { m, s, d } = await preparar(); await m.repo.alterar(e => { e.sites[0].politica.ativa = true; e.sites[0].politica.sequenciaCompleta = true; e.sites[0].politica.pesquisarAutomaticamente = true; e.sites[0].conhecimento = { revista: 3, instrucoes: 'Instruções próprias desta marca.', evitar: ['jargão'], paginas: [], referencias: [] }; });
    const antes = (await m.estado()).sites[0]; const salvo = await m.configurarSite(s.id, 1, d, true);
    expect(salvo.politica.ativa).toBe(true); expect(salvo.politica.sequenciaCompleta).toBe(true); expect(salvo.politica.pesquisarAutomaticamente).toBe(true); expect(salvo.conhecimento).toEqual(antes.conhecimento);
  });
  it('alterar a definição invalida aprovações do destino e preserva artigos dos outros sites', async () => {
    const { m, s, d } = await preparar(); const a = { id:'a1', siteId:s.id, estado:'aprovado', aprovacao:{assinatura:'assinatura', versao:1, em:agora.toISOString()}, texto:{corpo:'Texto humano preservado'} } as unknown as PautaEditorial;
    await m.repo.alterar(e => { e.pautas.push({ ...a, versao: 1, fontes: [] }, { ...a, id:'a2', versao: 1, fontes: [], siteId:'digitalfc' }); });
    await m.configurarSite(s.id, 1, d, true); const estado = await m.repo.ler();
    expect(estado.pautas[0]).toMatchObject({ aprovacao:null, estado:'aguarda_revisao', texto:{corpo:'Texto humano preservado'} }); expect(estado.pautas[1].aprovacao).not.toBeNull();
  });
  it('os campos gravados entram no pedido editorial de produção', async () => {
    const { m, s, d } = await preparar(); const salvo = await m.configurarSite(s.id, 1, { ...d, voz: 'A voz exclusiva aprovada para a marca.' }, true);
    const p = { siteId: s.id, titulo: 'Campanhas', palavra: 'sms', contributo: '', objetivo: '', cta: '', fontes: [] } as unknown as PautaEditorial;
    expect(promptEditorial(p, salvo).utilizador).toContain('A voz exclusiva aprovada');
  });
  it('uma alteração avançada posterior pede revisão da configuração guiada', async () => {
    const { m, s, d } = await preparar(); const salvo = await m.configurarSite(s.id, 1, d, true);
    const outro = await m.guardarPolitica(s.id, { ...salvo.politica, hora: '11:30' }, 2); expect(estadoConfiguracaoSite(outro)).toBe('Rever alterações');
  });
  it('a rota do serviço chama a mesma gravação atómica', async () => {
    const { m, s, d } = await preparar(); const r = await operarSeo(m, 'configurar-site', { siteId:s.id, revista:1, definicao:d, confirmacao:true }); expect(r).toHaveProperty('configuracaoGuiada');
  });
});
describe('validação partilhada e permissões', () => {
  it('não aceita público genérico por definir nem ritmo sem dias correspondentes', async () => {
    const { s, d } = await preparar(); expect(schemaDefinicaoSite.safeParse({ ...d, publico:'A definir antes de ativar.' }).success).toBe(false);
    const erros = problemasDefinicao({ ...d, dias:[1], limiteSemanal:2 }, s); expect(erros.some(e => e.campo === 'dias')).toBe(true);
  });
  it('o serviço cloud recusa gravação por leitor antes de reservar qualquer escrita', async () => {
    const mem = supabaseMemoria(); const servico = new ServicoSeo(mem.sb, () => ({}));
    await expect(servico.executar({ userId:'u1', projeto:'p1', escrever:false, user:mem.sb }, 'configurar-site', {})).rejects.toMatchObject({ status:403 }); expect(mem.chamadas).toEqual([]);
  });
});
