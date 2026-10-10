import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, it, expect, vi } from 'vitest';
import Curadoria from '@/pages/Curadoria';
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { email: 'equipa@example.org' } }) }));
vi.mock('@/hooks/useUserRoles', () => ({ useCurrentUserRoles: () => ({ isAdmin: true }) }));
vi.mock('@/features/curadoria/CuradoriaNoticias', () => ({ CuradoriaNoticias: () => <p>Lista</p> }));
vi.mock('@/newsletter/features/newsletter/partilhado/FilaEntrada', () => ({ FilaEntrada: () => null }));
vi.mock('@/newsletter/features/newsletter/data', async (o) => ({ ...await o<object>(),
  listarFontes: vi.fn().mockResolvedValue([]), getEdicaoAtual: vi.fn().mockResolvedValue(null) }));
afterEach(cleanup);
it('Curadoria tem «Colar notícias» que abre a janela de colar texto', async () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<MemoryRouter><QueryClientProvider client={qc}><Curadoria /></QueryClientProvider></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Colar notícias' }));
  expect(await screen.findByText('Adicionar notícias')).toBeInTheDocument();
  expect(screen.getByText(/Colar texto/)).toBeInTheDocument();
});
