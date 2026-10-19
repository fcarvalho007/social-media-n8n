import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { NavegacaoArtigos } from '@/features/seo/ComponentesSeo';
vi.mock('@/features/seo/local', () => ({ SEO_DISPONIVEL: true }));
afterEach(cleanup);
describe('navegação de artigos com opções secundárias', () => {
 it('mantém o trabalho principal acessível e as opções secundárias num menu identificado', async () => {
  render(<MemoryRouter initialEntries={['/artigos/pesquisa']}><NavegacaoArtigos/></MemoryRouter>);
  expect(screen.getByRole('link', { name: 'Pesquisa SEO' })).toHaveAttribute('aria-current', 'page');
  await userEvent.click(screen.getByRole('button', { name: 'Mais opções dos artigos' }));
  expect(screen.getByRole('menuitem', { name: 'Automação editorial' })).toHaveAttribute('href', '/artigos/automacao');
  expect(screen.getByRole('menuitem', { name: 'Rascunhos livres' })).toHaveAttribute('href', '/artigos?livres=1');
 });
 it('identifica a página ativa mesmo quando pertence às opções secundárias', async () => {
  render(<MemoryRouter initialEntries={['/artigos/automacao']}><NavegacaoArtigos/></MemoryRouter>);
  await userEvent.click(screen.getByRole('button', { name: 'Mais opções dos artigos: Automação editorial' }));
  expect(screen.getByRole('menuitem', { name: 'Automação editorial' })).toHaveAttribute('aria-current', 'page');
 });
});
