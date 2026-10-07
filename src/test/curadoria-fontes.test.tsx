import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, it, expect, vi } from 'vitest';
import Curadoria from '@/pages/Curadoria';
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { email: 'equipa@example.org' } }) }));
vi.mock('@/hooks/useUserRoles', () => ({ useCurrentUserRoles: () => ({ isAdmin: true }) }));
vi.mock('@/features/curadoria/CuradoriaNoticias', () => ({ CuradoriaNoticias: () => <p>Lista comum</p> }));
vi.mock('@/newsletter/features/newsletter/data', async (original) => ({
 ...await original<object>(),
 listarFontes: vi.fn().mockResolvedValue([{id:'rss-1',nome:'Fonte existente',url_feed:'https://example.org/feed',tipo:'rss',activa:true}]),
 contarNoticiasPorFonte30d: vi.fn().mockResolvedValue({}), listarEstatisticasFontes: vi.fn().mockResolvedValue({}),
 getCuradoriaConfig: vi.fn().mockResolvedValue({max_insercoes_por_corrida:15,max_por_fonte:2,max_por_categoria:3,max_por_email:4,max_por_dia_email:15,max_por_dia:25}),
 getUltimaCorridaCuradoria: vi.fn().mockResolvedValue(null),
}));
afterEach(cleanup);
it('abre na curadoria o módulo original, as fontes existentes e todos os limites sem recolher nem processar', async () => {
 const qc=new QueryClient({defaultOptions:{queries:{retry:false}}});
 render(<MemoryRouter><QueryClientProvider client={qc}><Curadoria /></QueryClientProvider></MemoryRouter>);
 expect(await screen.findByText('1 de 1 fontes ativas.')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Gerir fontes e RSS'}));
 expect(await screen.findByText('Fonte existente')).toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Adicionar fonte'})).toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Correr agora'})).toBeInTheDocument();
 expect(screen.getByRole('spinbutton',{name:'Máximo por corrida'})).toHaveValue(15);
 expect(screen.getByRole('spinbutton',{name:'Máximo por email'})).toHaveValue(4);
 expect(screen.getByRole('spinbutton',{name:'Máximo por dia (email)'})).toHaveValue(15);
 expect(screen.getByRole('spinbutton',{name:'Máximo por dia'})).toHaveValue(25);
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Adicionar fonte'}));
 expect(screen.getByText('RSS / HTML')).toBeInTheDocument();
 qc.clear();
});
