// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { pesquisarCatalogo, textoSocial, type CatalogoPesquisa } from '@/features/percurso/pesquisa';
import { construirPercursos, type EnvioEditorial } from '@/features/percurso/modelo';
import { estadoInicialSeo } from '@/features/seo/catalogo';
import type { PautaEditorial } from '@/features/seo/contratos';
import { assinaturaPauta } from '../../scripts/seo/editorial';
import { projetarEstado } from '../../scripts/backend/percurso';
const em = '2026-10-18T10:00:00Z';
const catalogo: CatalogoPesquisa = { recolhidoEm: em, avisos: [], itens: [
  { id: 'pdf:1', tipo: 'pdf', titulo: 'Relatório europeu', texto: '', contexto: 'Acervo', atualizadoEm: em, url: '/curadoria/documentos?documento=1', paginas: [{ n: 1, texto: 'A introdução do documento' }, { n: 23, texto: 'As inscrições para formação empresarial aumentaram segundo este estudo.' }] },
  { id: 'noticia:1', tipo: 'noticia', titulo: 'Formação empresarial', texto: '<p>Um guia com fontes verificadas.</p>', contexto: 'Curadoria', atualizadoEm: em, url: '/curadoria?noticia=1' },
  { id: 'artigo:1', tipo: 'artigo', titulo: 'Outra perspetiva', texto: 'As inscrições para formação destinam-se a gestores.', contexto: 'digitalfc.pt', atualizadoEm: em, url: '/artigos?id=1' },
  { id: 'social:1', tipo: 'social', titulo: 'Uma ideia para a equipa', texto: 'Inscrições para formação abertas.', contexto: 'Instagram', atualizadoEm: em, url: '/drafts?draft=1' },
] };
describe('pesquisa transversal', () => {
  it('encontra termos sem acentos no interior de um PDF e abre a página com contexto', () => {
    const r = pesquisarCatalogo(catalogo, 'inscricoes formacao');
    expect(r.contagens).toEqual({ pdf: 1, noticia: 0, artigo: 1, social: 1 });
    const pdf = r.itens.find(i => i.tipo === 'pdf')!;
    expect(pdf.pagina).toBe(23); expect(pdf.excerto).toContain('inscrições');
    expect(pdf.url).toContain('termo=inscricoes%20formacao&pagina=23');
    expect(pdf).not.toHaveProperty('paginas'); expect(pdf).not.toHaveProperty('texto');
  });
  it('não combina palavras de páginas diferentes como se fossem uma passagem', () => {
    const r = pesquisarCatalogo(catalogo, 'introducao empresarial', 'pdf'); expect(r.total).toBe(0);
  });
  it('mantém contagens globais e paginação estável quando se filtra um tipo', () => {
    const r = pesquisarCatalogo(catalogo, 'formacao', 'noticia', 999, 1);
    expect(r.total).toBe(1); expect(r.contagens.pdf).toBe(1); expect(r.pagina).toBe(1); expect(r.itens[0].excerto).not.toContain('<p>');
  });
  it('devolve excerto perto da correspondência, sem HTML executável', () => {
    const c = structuredClone(catalogo); c.itens[1].texto = 'A'.repeat(800) + '<script>formação</script>';
    const r = pesquisarCatalogo(c, 'formação', 'noticia'); expect(r.itens[0].excerto).toContain('formação'); expect(r.itens[0].excerto.length).toBeLessThan(250); expect(r.itens[0].excerto).not.toContain('<');
  });
  it('não pesquisa com entradas vazias ou demasiado curtas, e conserva avisos de falha parcial', () => {
    const c = { ...catalogo, avisos: ['PDFs indisponíveis'] };
    expect(pesquisarCatalogo(c, ' ').total).toBe(0); expect(pesquisarCatalogo(c, 'x').total).toBe(0); expect(pesquisarCatalogo(c, 'formação').avisos).toEqual(c.avisos);
  });
  it('indexa o texto dos slides, excluindo URLs de imagens e metadados opacos', () => {
    const t = textoSocial({ paginas: [{ camadas: [{ tipo: 'texto', texto: 'Ideia importante' }, { tipo: 'imagem', url: 'https://privado/imagem?token=segredo' }] }], metadados: { token: 'segredo' } });
    expect(t).toContain('Ideia importante'); expect(t).not.toContain('segredo'); expect(t).not.toContain('https');
  });
});
const pauta = (): PautaEditorial => ({ id: '00000000-0000-4000-8000-000000000001', versao: 2, siteId: 'sms', titulo: 'Campanhas úteis', palavra: 'sms marketing', origem: 'topico', contributo: '', objetivo: '', cta: '', fontes: [], dataPretendida: '', pesquisaId: null, producaoAutomaticaAutorizada: false, modoOrigem: 'manual', estado: 'planeado', criadoEm: em, alteradoEm: em, texto: null, proposta: null, aprovacao: null, motivo: null });
const envio = (p: PautaEditorial, extra: Partial<EnvioEditorial> = {}): EnvioEditorial => ({ id: 'envio1', pauta_id: p.id, site_id: p.siteId, versao: p.versao, destino: 'publish', estado: 'enviado', remoto_url: 'https://smsonline.pt/artigo', atualizado_em: em, ...extra });
describe('percurso editorial baseado em evidência', () => {
  it('não considera pesquisa não associada como evidência do artigo', () => {
    const e = estadoInicialSeo(); e.pautas = [pauta()]; e.pautas[0].pesquisaId = 'desconhecida';
    expect(projetarEstado(e).percursos[0].etapas[1].estado).toBe('atencao');
  });
  it('separa rascunho de publicação, ignorando envios de outro artigo ou destino', () => {
    const e = estadoInicialSeo(); const p = pauta(); e.pautas = [p];
    const r = projetarEstado(e, [envio(p, { destino: 'draft' }), envio(p, { site_id: 'frederico' }), envio(p, { pauta_id: 'outro' })], true).percursos[0];
    expect(r.etapas[4]).toMatchObject({ estado: 'pendente' }); expect(r.etapas[4].detalhe).toContain('Rascunho confirmado'); expect(r.publicacoes).toHaveLength(1);
  });
  it('não apresenta versão anterior publicada como publicação da atual', () => {
    const e = estadoInicialSeo(); const p = pauta(); e.pautas = [p];
    const r = projetarEstado(e, [envio(p, { versao: 1 })], true).percursos[0]; expect(r.etapas[4].estado).toBe('pendente'); expect(r.etapas[4].detalhe).toContain('versão anterior');
  });
  it('um envio incerto continua a exigir reconciliação mesmo após nova versão', () => {
    const e = estadoInicialSeo(); const p = pauta(); e.pautas = [p];
    const r = projetarEstado(e, [envio(p, { versao: 1, estado: 'incerto' })], true).percursos[0]; expect(r.etapas[4].estado).toBe('atencao'); expect(r.proxima.id).toBe('publicacao');
  });
  it('revalida a assinatura da aprovação contra texto, fontes e política', () => {
    const e = estadoInicialSeo(); const p = pauta(); const site = e.sites.find(s => s.id === p.siteId)!; e.pautas = [p]; p.aprovacao = { versao: 2, em, assinatura: assinaturaPauta(p, site) };
    expect(projetarEstado(e).percursos[0].etapas[3].estado).toBe('concluida'); site.politica.revista++;
    expect(projetarEstado(e).percursos[0].etapas[3].estado).toBe('atencao');
  });
  it('acompanha a fila e trata resultado incerto como bloqueio sem repetir pedidos', () => {
    const e = estadoInicialSeo(); const p = pauta(); e.pautas = [p];
    const j = { id: 'j1', estado: 'fila', pedido: { pautaId: p.id, versao: p.versao } };
    expect(projetarEstado(e, [], true, false, [j]).percursos[0].etapas[4].detalhe).toContain('na fila');
    expect(projetarEstado(e, [], true, false, [{ ...j, estado: 'incerto' }]).percursos[0].etapas[4].estado).toBe('atencao');
  });
  it('nunca fabrica métricas nem confunde indisponibilidade com zero publicações', () => {
    const e = estadoInicialSeo(); const p = pauta(); e.pautas = [p];
    const r = construirPercursos(e, [envio(p)], new Set(), true).percursos[0]; expect(r.etapas[4].estado).toBe('concluida'); expect(r.etapas[5].estado).toBe('indisponivel');
    expect(construirPercursos(e, [], new Set(), false).percursos[0].etapas[4].estado).toBe('indisponivel');
  });
});
