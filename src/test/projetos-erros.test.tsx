import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Projects from '@/pages/Projects';
const m = vi.hoisted(() => ({ projects: vi.fn(), tasks: vi.fn(), reload: vi.fn(), reloadTasks: vi.fn() }));
vi.mock('@/hooks/useProjects', () => ({ useProjects: m.projects }));
vi.mock('@/hooks/useTasks', () => ({ useTasks: m.tasks }));
vi.mock('@/components/projects/CreateProjectModal', () => ({ CreateProjectModal: () => null }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const projeto = { id: 'p1', name: 'DIGITAL SPRINT', description: 'Marca principal', status: 'active', icon: 'DS', color: '#0077b6', owner_id: 'owner-123', due_date: null };
function setup(projectOverrides = {}, taskOverrides = {}) {
  m.projects.mockReturnValue({ projects: [], isLoading: false, isFetching: false, error: null, refetch: m.reload, ...projectOverrides });
  m.tasks.mockReturnValue({ tasks: [], isLoading: false, isFetching: false, error: null, refetch: m.reloadTasks, ...taskOverrides });
  render(<MemoryRouter><Projects /></MemoryRouter>);
}
describe('projetos: erro não é um estado vazio', () => {
  it('mostra erro e repetição sem sugerir criar outro primeiro projeto', () => {
    setup({ error: new Error('offline') });
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar os projetos');
    expect(screen.queryByText('Ainda não tens projetos')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Criar/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(m.reload).toHaveBeenCalledTimes(1);
  });
  it('mantém o projeto acessível quando as tarefas falham e não mostra métricas falsas de zero', () => {
    setup({ projects: [projeto] }, { error: new Error('offline') });
    expect(screen.getByRole('alert')).toHaveTextContent('As estatísticas das tarefas estão indisponíveis');
    expect(screen.getByRole('link', { name: /DIGITAL SPRINT/ })).toHaveAttribute('href', '/projects/p1');
    expect(screen.getByText('Estatísticas indisponíveis')).toBeInTheDocument();
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
    expect(screen.queryByText('Tarefas')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar carregar tarefas' }));
    expect(m.reloadTasks).toHaveBeenCalledTimes(1);
    expect(m.reload).not.toHaveBeenCalled();
  });
});
