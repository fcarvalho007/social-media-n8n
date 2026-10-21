import { useState } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GlobalSearch } from '@/components/GlobalSearch';

const mocks = vi.hoisted(() => ({ projects: vi.fn(), tasks: vi.fn() }));
vi.mock('@/hooks/useProjects', () => ({ useProjects: mocks.projects }));
vi.mock('@/hooks/useTasks', () => ({ useTasks: mocks.tasks }));
beforeAll(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });
function setup(open = true, projectOverrides = {}, taskOverrides = {}) {
  mocks.projects.mockReturnValue({ projects: [], isLoading: false, error: null, ...projectOverrides });
  mocks.tasks.mockReturnValue({ tasks: [], isLoading: false, error: null, ...taskOverrides });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Page() {
    const [aberto, setAberto] = useState(open);
    const location = useLocation();
    return <><output>{location.pathname}</output><GlobalSearch open={aberto} onOpenChange={setAberto} /></>;
  }
  render(<QueryClientProvider client={client}><MemoryRouter><Page /></MemoryRouter></QueryClientProvider>);
  return client;
}
describe('pesquisa na aplicação', () => {
  it('não consulta projetos ou tarefas enquanto fechada; Cmd+K abre a pesquisa com atalhos', () => {
    setup(false);
    expect(mocks.projects).not.toHaveBeenCalled();
    expect(mocks.tasks).not.toHaveBeenCalled();
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(screen.getByRole('dialog', { name: 'Pesquisa na aplicação' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Divulgação da newsletter/ })).toBeInTheDocument();
    expect(mocks.projects).toHaveBeenCalled();
  });
  it('encontra nomes sem acentos e abre com teclado sem depender de cliques', async () => {
    setup();
    const input = screen.getByRole('combobox', { name: 'Pesquisar na aplicação' });
    fireEvent.change(input, { target: { value: 'divulgacao' } });
    expect(screen.getByRole('option', { name: /Divulgação da newsletter/ })).toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'roteiros' } });
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(1));
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('/estudio/roteiros'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it.each([['analytics','Resultados'],['insights','Sugestões'],['benchmark','Comparar contas']])('mantém o nome anterior %s pesquisável', (termo,nome) => {
    setup();
    fireEvent.change(screen.getByRole('combobox',{name:'Pesquisar na aplicação'}),{target:{value:termo}});
    expect(screen.getByRole('option',{name:new RegExp(`^${nome}`)})).toBeInTheDocument();
  });
  it('distingue erro de ausência de resultados e permite repetir preservando os atalhos', () => {
    const client = setup(true, { error: new Error('offline') });
    const repetir = vi.spyOn(client, 'refetchQueries');
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar os projetos');
    expect(screen.queryByText(/Nenhum resultado/)).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: /^Newsletter/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(repetir).toHaveBeenCalledWith({ queryKey: ['projects'], type: 'active' });
  });
  it('abre o projeto de uma tarefa e identifica esse contexto na pesquisa', () => {
    setup(true, { projects: [{ id: 'projeto1', name: 'Marca principal' }] }, { tasks: [{ id: 'tarefa1', title: 'Rever crónica', project_id: 'projeto1' }] });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'cronica' } });
    fireEvent.click(screen.getByRole('option', { name: /Rever crónica Marca principal/ }));
    expect(screen.getByRole('status')).toHaveTextContent('/projects/projeto1');
  });
});
