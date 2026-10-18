import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';
import { DESTINOS_NAVEGACAO, itemNavegacaoAtivo, migalhasNavegacao } from '@/lib/navegacao';
import { urlRecarga } from '@/components/ErrorBoundary';
import { AccountQueryProvider } from '@/components/AccountQueryProvider';

describe('contexto coerente de navegação', () => {
  it.each(['/calendar', '/custos', '/media-library', '/drafts', '/publication-history', '/settings/notifications'])('o destino %s tem o seu nome no cabeçalho', (p) => {
    expect(migalhasNavegacao(p).at(-1)?.label).toBe(DESTINOS_NAVEGACAO.find(d => d.url === p)?.label);
  });
  it('distingue Aprovar e Criar no mesmo pathname', () => {
    expect(itemNavegacaoAtivo('/pending', '?tab=create', '/pending')).toBe(false);
    expect(itemNavegacaoAtivo('/pending', '?tab=create', '/pending?tab=create')).toBe(true);
    expect(migalhasNavegacao('/pending', '?tab=create').at(-1)?.label).toBe('Criar SM');
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
