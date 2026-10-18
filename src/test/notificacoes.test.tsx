import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { NotificationBell } from '@/components/NotificationBell';
import { destinoNotificacao } from '@/lib/notificacoes';

const m = vi.hoisted(() => ({ hook: vi.fn(), read: vi.fn(), all: vi.fn(), remove: vi.fn(), refetch: vi.fn(), task: vi.fn(), from: vi.fn(), toastError: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'dono' } }) }));
vi.mock('@/hooks/useNotifications', () => ({ useNotifications: m.hook }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: m.from } }));
vi.mock('sonner', () => ({ toast: { error: m.toastError } }));
const notificacao = { id: 'n1', title: 'Projeto revisto', message: 'Pode continuar', type: 'info', read: false, created_at: '2026-10-18T10:00:00Z', related_entity_type: 'project', related_entity_id: 'p1' };
function setup(overrides = {}) {
  m.hook.mockReturnValue({ notifications: [notificacao], unreadCount: 1, isLoading: false, isFetching: false, error: null, refetch: m.refetch, markAsRead: { mutate: m.read, isPending: false }, markAllAsRead: { mutate: m.all, isPending: false }, deleteNotification: { mutate: m.remove, isPending: false }, ...overrides });
  function Page() { const location = useLocation(); return <><output>{location.pathname}</output><NotificationBell /></>; }
  render(<MemoryRouter><Page /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Notificações · 1 por ler' }));
}
beforeEach(() => {
  m.from.mockImplementation(() => ({ select: () => ({ eq: () => ({ maybeSingle: m.task }) }) }));
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe('destinos de notificações', () => {
  it('corrige a rota plural de projetos sem consultar todas as tarefas', async () => {
    const query = vi.fn();
    await expect(destinoNotificacao(notificacao, query)).resolves.toBe('/projects/p1');
    expect(query).not.toHaveBeenCalled();
  });
  it('exige um projeto acessível para tarefa e não inventa uma rota', async () => {
    const n = { related_entity_type: 'task', related_entity_id: 't1' };
    await expect(destinoNotificacao(n, async () => 'p2')).resolves.toBe('/projects/p2');
    await expect(destinoNotificacao(n, async () => null)).rejects.toThrow('não tens acesso');
  });
});
describe('centro de notificações', () => {
  it('abre o projeto por um botão acessível e apresenta ações nomeadas separadas', async () => {
    setup();
    expect(screen.getByRole('button', { name: 'Apagar notificação: Projeto revisto' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir Projeto revisto' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('/projects/p1'));
    expect(m.read).toHaveBeenCalledWith('n1');
    expect(m.from).not.toHaveBeenCalled();
  });
  it('resolve apenas a tarefa pedida através do cliente autenticado', async () => {
    m.task.mockResolvedValue({ data: { project_id: 'p2' }, error: null });
    setup({ notifications: [{ ...notificacao, related_entity_type: 'task', related_entity_id: 't2' }] });
    fireEvent.click(screen.getByRole('button', { name: 'Abrir Projeto revisto' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('/projects/p2'));
    expect(m.from).toHaveBeenCalledWith('tasks');
    expect(m.task).toHaveBeenCalledTimes(1);
  });
  it('uma tarefa inacessível apresenta erro, preserva a notificação por ler e não navega', async () => {
    m.task.mockResolvedValue({ data: null, error: null });
    setup({ notifications: [{ ...notificacao, related_entity_type: 'task', related_entity_id: 't2' }] });
    fireEvent.click(screen.getByRole('button', { name: 'Abrir Projeto revisto' }));
    await waitFor(() => expect(m.toastError).toHaveBeenCalledWith(expect.stringContaining('não tens acesso')));
    expect(m.read).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('/');
  });
  it('mostra erro com repetição em vez de um falso vazio', () => {
    setup({ error: new Error('offline'), notifications: [] });
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar');
    expect(screen.queryByText('Sem notificações')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(m.refetch).toHaveBeenCalledTimes(1);
  });
});
