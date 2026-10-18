import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useNotifications } from '@/hooks/useNotifications';

const m = vi.hoisted(() => ({ user: { id: 'u1' } as { id: string } | null, from: vi.fn(), channel: vi.fn(), removeChannel: vi.fn(), success: vi.fn(), error: vi.fn(), info: vi.fn(), writes: [] as { action: string; filters: [string, unknown][] }[] }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: m.user }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: m.from, channel: m.channel, removeChannel: m.removeChannel } }));
vi.mock('sonner', () => ({ toast: Object.assign(m.info, { success: m.success, error: m.error }) }));
beforeEach(() => {
  m.user = { id: 'u1' }; m.writes.length = 0;
  m.from.mockImplementation(() => {
    let dono = '';
    let escrita: { action: string; filters: [string, unknown][] } | null = null;
    const q = {
      select: () => q,
      update: () => { escrita = { action: 'update', filters: [] }; m.writes.push(escrita); return q; },
      delete: () => { escrita = { action: 'delete', filters: [] }; m.writes.push(escrita); return q; },
      eq: (k: string, v: unknown) => { if (k === 'user_id') dono = String(v); escrita?.filters.push([k, v]); return q; },
      order: () => q,
      limit: async () => ({ data: [{ id: `n-${dono}`, user_id: dono, read: false, title: 'Aviso', type: 'info' }], error: null }),
      then: (resolve: (v: { error: null }) => unknown) => Promise.resolve({ error: null }).then(resolve),
    };
    return q;
  });
  m.channel.mockImplementation(() => { const q = { on: () => q, subscribe: () => q }; return q; });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return renderHook(() => useNotifications(), { wrapper });
}
describe('notificações por sessão', () => {
  it('acompanha troca de conta e cancela a subscrição anterior sem mostrar notificações da conta antiga', async () => {
    const { result, rerender } = setup();
    await waitFor(() => expect(result.current.notifications[0]?.id).toBe('n-u1'));
    m.user = { id: 'u2' }; rerender();
    expect(result.current.notifications).toEqual([]);
    await waitFor(() => expect(result.current.notifications[0]?.id).toBe('n-u2'));
    expect(m.removeChannel).toHaveBeenCalledTimes(1);
    expect(m.channel).toHaveBeenLastCalledWith('notifications-changes:u2');
    m.user = null; rerender();
    expect(result.current.notifications).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
  });
  it('limita marcar e apagar ao utilizador atual além da proteção RLS', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.notifications.length).toBe(1));
    await act(async () => { await result.current.markAsRead.mutateAsync('n-u1'); await result.current.deleteNotification.mutateAsync('n-u1'); });
    expect(m.writes).toEqual([
      { action: 'update', filters: [['id', 'n-u1'], ['user_id', 'u1']] },
      { action: 'delete', filters: [['id', 'n-u1'], ['user_id', 'u1']] },
    ]);
  });
  it('uma ação sem sessão falha sem consultar ou alterar notificações', async () => {
    m.user = null;
    const { result } = setup();
    await act(async () => { await expect(result.current.markAllAsRead.mutateAsync()).rejects.toThrow('É necessário entrar'); });
    expect(m.from).not.toHaveBeenCalled();
    expect(m.error).toHaveBeenCalledWith('A notificação não foi alterada. Tenta de novo.');
    expect(m.success).not.toHaveBeenCalled();
  });
});
