import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
vi.mock('@/features/documentos/modelo', async () => ({...await vi.importActual('@/features/documentos/modelo'),DOCUMENTOS_LOCAL:true,DOCUMENTOS_DISPONIVEL:true}));
vi.mock('@/features/seo/local',()=>({SEO_DISPONIVEL:true}));
import { useQuery } from '@tanstack/react-query';
import { DESTINOS_NAVEGACAO, SECOES_NAVEGACAO, itemNavegacaoAtivo, migalhasNavegacao } from '@/lib/navegacao';
import { urlRecarga } from '@/components/ErrorBoundary';
import { AccountQueryProvider } from '@/components/AccountQueryProvider';

describe('contexto coerente de navegação', () => {
  it('campanhas preservam a lista nas migalhas e a entrada única no menu',()=>{
    expect(migalhasNavegacao('/campanhas/abc').map(m=>m.label)).toEqual(['Início','Campanhas','Detalhe da campanha']);
    expect(migalhasNavegacao('/campanhas/abc/compositor/story').at(-1)?.label).toBe('Compositor');
    expect(migalhasNavegacao('/campanhas/nova').at(-1)?.label).toBe('Nova campanha');
    expect(itemNavegacaoAtivo('/campanhas/abc','?peca=story','/campanhas')).toBe(true);
  });
  it.each(['/calendar', '/custos', '/media-library', '/drafts', '/publication-history', '/settings/notifications'])('o destino %s tem o seu nome no cabeçalho', (p) => {
    expect(migalhasNavegacao(p).at(-1)?.label).toBe(DESTINOS_NAVEGACAO.find(d => d.url === p)?.label);
  });
  it('mantém o contexto do assistente de sites e a volta à lista nas migalhas', () => {
    expect(migalhasNavegacao('/artigos/sites/sms').map(m => m.label)).toEqual(['Início','Artigos','Sites e regras','Configuração guiada']);
    expect(migalhasNavegacao('/artigos/sites/sms').at(-2)?.path).toBe('/artigos/sites');
  });
  it('distingue Aprovar e Criar no mesmo pathname', () => {
    expect(itemNavegacaoAtivo('/pending', '?tab=create', '/pending')).toBe(false);
    expect(itemNavegacaoAtivo('/pending', '?tab=create', '/pending?tab=create')).toBe(true);
    expect(migalhasNavegacao('/pending', '?tab=create').at(-1)?.label).toBe('Criar publicação social');
  });
  it('mantém cada destino acessível uma só vez no menu principal ou na conta', () => {
    const urls = ['/', '/pending?tab=create', ...SECOES_NAVEGACAO.flatMap(s => s.urls), ...DESTINOS_NAVEGACAO.filter(d => d.grupo === 'Conta').map(d => d.url)];
    expect(new Set(urls).size).toBe(urls.length);
    expect([...urls].sort()).toEqual(DESTINOS_NAVEGACAO.map(d => d.url).sort());
  });
  it.each([['/manual-create', '/pending?tab=create'], ['/review/123', '/pending'], ['/failed-publications', '/publication-history']])('mantém o contexto ao abrir %s', (pathname, destino) => {
    expect(DESTINOS_NAVEGACAO.filter(d => itemNavegacaoAtivo(pathname, '', d.url)).map(d => d.url)).toEqual([destino]);
  });
  it.each(['/documentos','/curadoria/documentos'])('seleciona só Documentos ao abrir %s, mantendo a relação com Curadoria', p => {
    expect(DESTINOS_NAVEGACAO.filter(d => itemNavegacaoAtivo(p,'?documento=1',d.url)).map(d => d.url)).toEqual(['/curadoria/documentos']);
    expect(migalhasNavegacao(p).map(m => m.label)).toEqual(['Início','Curadoria','Documentos e relatórios']);
  });
  it('voltar do leitor preserva os filtros e o projeto, sem reabrir o documento', () => {
    const m = migalhasNavegacao('/curadoria/documentos','?projeto=p&q=IA&documento=pdf-1&pagina=2');
    expect(m.at(-1)?.label).toBe('Ler documento');
    expect(m[1]).toEqual({label:'Curadoria',path:'/curadoria'});
    const volta = new URL(m[2].path!, 'http://localhost');
    expect(volta.searchParams.get('q')).toBe('IA');
    expect(volta.searchParams.get('projeto')).toBe('p');
    expect(volta.searchParams.get('pagina')).toBe('2');
    expect(volta.searchParams.has('documento')).toBe(false);
  });
  it('mostra o contexto de fontes, divulgação e preparação de artigos', () => {
    expect(migalhasNavegacao('/curadoria','?separador=fontes').at(-1)?.label).toBe('Fontes de notícias');
    expect(migalhasNavegacao('/estudio/redes-sociais').map(m => m.label)).toEqual(['Início','Newsletter','Divulgação da newsletter']);
    expect(migalhasNavegacao('/artigos/plano','?id=1&secao=texto').at(-1)?.label).toBe('Rever artigo');
    expect(migalhasNavegacao('/artigos/automacao','?secao=conhecimento').at(-1)?.label).toBe('Conhecimento da marca');
  });
  it('recarregar preserva artigo, compositor, filtros e fragmento', () => {
    vi.spyOn(Date, 'now').mockReturnValue(123);
    const url = new URL(urlRecarga('https://example.pt/estudio/redes-sociais/c?compositor=story&peca=story&cb=old#texto'));
    expect(url.searchParams.get('compositor')).toBe('story'); expect(url.searchParams.get('peca')).toBe('story');
    expect(url.hash).toBe('#texto'); expect(url.searchParams.getAll('cb')).toEqual(['123']);
    vi.restoreAllMocks();
  });
  it('uma nova conta não vê resultados em cache da conta anterior, mesmo com a mesma queryKey', async () => {
    const ler = vi.fn(async (conta: string) => conta === 'a' ? 'Artigo privado A' : 'Artigo privado B');
    function Lista({ conta }: { conta: string }) {
      const q = useQuery({ queryKey: ['artigos'], queryFn: () => ler(conta) });
      return <p>{q.data ?? 'A carregar'}</p>;
    }
    const r = render(<AccountQueryProvider accountId="a"><Lista conta="a" /></AccountQueryProvider>);
    await screen.findByText('Artigo privado A');
    r.rerender(<AccountQueryProvider accountId="b"><Lista conta="b" /></AccountQueryProvider>);
    expect(screen.queryByText('Artigo privado A')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Artigo privado B')).toBeInTheDocument());
    expect(ler).toHaveBeenCalledTimes(2);
  });
});
