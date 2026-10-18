import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn(), invoke: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.read }) }), upsert: mocks.write }),
  functions: { invoke: mocks.invoke },
} }));
import NotificationSettings from '@/pages/NotificationSettings';

const guardadas = { reminder_channel: 'email', reminder_minutes_before: 60, quiet_hours_start: '21:00', quiet_hours_end: '09:00', reminder_weekdays: [2, 5], email_tested_at: null };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.read.mockResolvedValue({ data: guardadas, error: null });
  mocks.write.mockResolvedValue({ error: null });
  mocks.invoke.mockResolvedValue({ data: { ok: true, sent: 1 }, error: null });
});
afterEach(cleanup);

describe('notificações: preferências confirmadas', () => {
  it('uma falha de leitura nunca permite substituir as preferências por valores predefinidos', async () => {
    mocks.read.mockResolvedValueOnce({ data: null, error: { message: 'Sem ligação' } });
    render(<NotificationSettings />);
    expect(await screen.findByRole('alert')).toHaveTextContent('sem as substituir');
    expect(screen.getByRole('button', { name: 'Guardar preferências' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Enviar email de teste' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar preferências' }));
    expect(mocks.write).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Recarregar preferências' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar preferências' })).toBeEnabled());
    expect(screen.getByText('60 minutos')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Ter' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Seg' })).not.toBeChecked();
  });
  it('uma exceção de gravação desbloqueia o formulário, mantém escolhas e permite uma nova tentativa', async () => {
    mocks.write.mockRejectedValueOnce(new Error('Ligação interrompida'));
    render(<NotificationSettings />);
    const guardar = screen.getByRole('button', { name: 'Guardar preferências' });
    await waitFor(() => expect(guardar).toBeEnabled());
    fireEvent.click(screen.getByRole('checkbox', { name: 'Seg' }));
    fireEvent.click(guardar);
    expect(await screen.findByRole('alert')).toHaveTextContent('As tuas escolhas continuam no formulário');
    expect(guardar).toBeEnabled();
    expect(screen.getByRole('checkbox', { name: 'Seg' })).toBeChecked();
    fireEvent.click(guardar);
    await waitFor(() => expect(mocks.write).toHaveBeenCalledTimes(2));
    expect(mocks.write).toHaveBeenLastCalledWith(expect.objectContaining({ reminder_minutes_before: 60, reminder_weekdays: [1, 2, 5] }));
  });
  it('não marca o email como testado quando a resposta não confirma o envio e recupera de exceções', async () => {
    mocks.invoke.mockResolvedValueOnce({ data: { ok: true, sent: 0 }, error: null }).mockRejectedValueOnce(new Error('Rede indisponível'));
    render(<NotificationSettings />);
    const enviar = screen.getByRole('button', { name: 'Enviar email de teste' });
    await waitFor(() => expect(enviar).toBeEnabled());
    fireEvent.click(enviar);
    expect(await screen.findByRole('alert')).toHaveTextContent('não foi confirmado');
    expect(screen.queryByText('Testado com sucesso')).not.toBeInTheDocument();
    fireEvent.click(enviar);
    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(enviar).toBeEnabled());
    expect(screen.queryByText('Testado com sucesso')).not.toBeInTheDocument();
  });
  it('impede gravações repetidas e alterações do formulário enquanto a gravação está em curso', async () => {
    let resolve!: (value: unknown) => void;
    mocks.write.mockReturnValueOnce(new Promise((r) => { resolve = r; }));
    render(<NotificationSettings />);
    const guardar = screen.getByRole('button', { name: 'Guardar preferências' });
    await waitFor(() => expect(guardar).toBeEnabled());
    fireEvent.click(guardar); fireEvent.click(guardar);
    expect(mocks.write).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('checkbox', { name: 'Ter' })).toBeDisabled();
    await act(async () => { resolve({ error: null }); });
    expect(guardar).toBeEnabled();
  });
});
