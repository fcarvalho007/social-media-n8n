import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MediaLibrary from '@/pages/MediaLibrary';
const m = vi.hoisted(() => ({ from: vi.fn(), read: vi.fn(), invoke: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: m.from, functions: { invoke: m.invoke } } }));
beforeEach(() => { m.from.mockImplementation(() => ({ select: () => ({ order: m.read }) })); });
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const ficheiro = { id: 'f1', user_id: 'u1', file_name: 'capa-newsletter.png', file_type: 'image', file_url: 'https://example.com/capa.png', source: 'upload', is_favorite: false, created_at: '2026-10-18T10:00:00Z', file_size: 1024 };
function setup(cachedEmpty = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  if (cachedEmpty) client.setQueryData(['media-library'], []);
  render(<QueryClientProvider client={client}><MediaLibrary /></QueryClientProvider>);
}
describe('biblioteca: leitura falhada', () => {
  it('mostra erro com repetição em vez de um falso vazio e recupera a lista', async () => {
    m.read.mockResolvedValueOnce({ data: null, error: new Error('offline') }).mockResolvedValue({ data: [ficheiro], error: null });
    setup();
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar a biblioteca');
    expect(screen.queryByText('Nenhum ficheiro encontrado')).not.toBeInTheDocument();
    expect(screen.queryByText(/0 ficheiros/)).not.toBeInTheDocument();
    expect(m.invoke).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(screen.getByText('capa-newsletter.png')).toBeInTheDocument();
    expect(m.read).toHaveBeenCalledTimes(2);
  });
  it('não sincroniza ou importa a partir de uma cache vazia enquanto confirma a leitura que falha', async () => {
    m.read.mockResolvedValue({ data: null, error: new Error('offline') });
    setup(true);
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar a biblioteca');
    expect(m.invoke).not.toHaveBeenCalled();
    expect(m.from.mock.calls.map(([table]) => table)).toEqual(['media_library']);
  });
});
