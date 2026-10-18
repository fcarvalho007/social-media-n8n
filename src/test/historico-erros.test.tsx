import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import PublicationHistory from '@/pages/PublicationHistory';
import { PendingThumbnail } from '@/components/PendingThumbnail';
const h = vi.hoisted(() => ({ tentativa: 0 }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  from: (table: string) => { const q = { select: () => q, order: () => q, limit: async () => { h.tentativa++; return table === 'posts' ? { data: [], error: null } : { data: null, error: { message: 'Rede indisponível' } }; } }; return q; },
} }));
afterEach(cleanup);
describe('histórico e ações independentes no painel', () => {
  it('uma consulta parcial falhada não mostra totais como se o histórico estivesse completo', async () => {
    h.tentativa = 0;
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><MemoryRouter><PublicationHistory /></MemoryRouter></QueryClientProvider>);
    await screen.findByText('Não foi possível carregar o histórico completo');
    expect(screen.queryByText('Nenhuma publicação encontrada')).not.toBeInTheDocument();
    const antes = h.tentativa;
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    await vi.waitFor(() => expect(h.tentativa).toBeGreaterThan(antes));
    client.clear();
  });
  it('abrir e eliminar são botões separados, sem navegação acidental', () => {
    const abrir = vi.fn(); const apagar = vi.fn();
    const r = render(<PendingThumbnail id="d" type="draft" thumbnail={null} mediaType="image" mediaCount={1} caption="Uma leitura" createdAt="2026-10-18" route="/drafts" onNavigate={abrir} onDelete={apagar} />);
    const eliminar = screen.getByRole('button', { name: 'Eliminar rascunho' });
    expect(eliminar.closest('button')?.parentElement?.closest('button')).toBeNull();
    fireEvent.click(eliminar); expect(apagar).toHaveBeenCalledOnce(); expect(abrir).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir Rascunho: Uma leitura' })); expect(abrir).toHaveBeenCalledWith('/drafts');
    r.unmount();
  });
});
