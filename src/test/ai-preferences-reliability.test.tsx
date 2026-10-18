import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AiPreferences } from '@/types/aiEditorial';

const mocks = vi.hoisted(() => ({ read: vi.fn(), tags: vi.fn(), write: vi.fn(), addTags: vi.fn(), removeTags: vi.fn(), changes: [] as string[], payloads: [] as Record<string, unknown>[] }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
vi.mock('@/components/ai/AICreditsBadge', () => ({ AICreditsBadge: () => null }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: (table: string) => table === 'ai_preferences' ? {
  select: () => ({ eq: () => ({ maybeSingle: mocks.read }) }),
  upsert: (payload: Record<string, unknown>) => {
    mocks.changes.push('preferencias'); mocks.payloads.push(payload);
    return { select: () => ({ single: mocks.write }) };
  },
} : {
  select: () => ({ eq: mocks.tags }),
  upsert: (rows: unknown) => { mocks.changes.push('adicionar'); return mocks.addTags(rows); },
  delete: () => ({ eq: () => ({ in: (field: string, values: string[]) => { mocks.changes.push('retirar'); return mocks.removeTags(field, values); } }) }),
} } }));

import { useAiPreferences } from '@/hooks/ai/useAiPreferences';
import AISettings from '@/pages/AISettings';

const preferencias: AiPreferences = { preferred_language: 'pt-PT', default_tone: 'neutro', preferred_model: 'fast', brand_hashtags: ['#anterior'], insights_enabled: true, auto_alt_text: false, auto_first_comment: false, muted_insight_types: [], dismissed_insights: {} };
beforeEach(() => {
  vi.clearAllMocks(); mocks.changes.length = 0; mocks.payloads.length = 0;
  mocks.read.mockResolvedValue({ data: preferencias, error: null });
  mocks.tags.mockResolvedValue({ data: [{ hashtag: '#anterior' }], error: null });
  mocks.write.mockResolvedValue({ data: preferencias, error: null });
  mocks.addTags.mockResolvedValue({ error: null }); mocks.removeTags.mockResolvedValue({ error: null });
});
afterEach(cleanup);
const pronto = async (r: ReturnType<typeof renderHook<ReturnType<typeof useAiPreferences>, unknown>>) => waitFor(() => expect(r.result.current.loading).toBe(false));

describe('preferências de IA: confirmação e recuperação', () => {
  it('uma falha de leitura não permite gravar os valores predefinidos e oferece nova leitura', async () => {
    mocks.read.mockResolvedValueOnce({ data: null, error: { message: 'Sem ligação' } });
    const r = renderHook(() => useAiPreferences()); await pronto(r);
    expect(r.result.current.error).toContain('Sem ligação');
    await expect(r.result.current.savePreferences({ preferred_model: 'smart' })).rejects.toThrow('Carrega as preferências');
    expect(mocks.write).not.toHaveBeenCalled();
    act(() => r.result.current.reload()); await waitFor(() => expect(r.result.current.error).toBeNull());
    expect(r.result.current.preferences.brand_hashtags).toEqual(['#anterior']);
  });
  it('um erro do Supabase rejeita a gravação, mantém a cópia visível e exige nova leitura', async () => {
    mocks.write.mockResolvedValueOnce({ data: null, error: { message: 'Gravação recusada' } });
    const r = renderHook(() => useAiPreferences()); await pronto(r);
    await act(async () => { await expect(r.result.current.savePreferences({ preferred_model: 'smart' })).rejects.toThrow('Gravação recusada'); });
    expect(r.result.current.preferences.preferred_model).toBe('fast');
    expect(r.result.current.error).toContain('Recarrega');
    expect(r.result.current.saving).toBe(false);
    await expect(r.result.current.savePreferences({ preferred_model: 'smart' })).rejects.toThrow('Carrega as preferências');
  });
  it('recusa uma segunda gravação concorrente e só adota a resposta confirmada do servidor', async () => {
    let resolve!: (value: unknown) => void;
    mocks.write.mockReturnValueOnce(new Promise((r) => { resolve = r; }));
    const r = renderHook(() => useAiPreferences()); await pronto(r);
    let primeira!: Promise<void>;
    act(() => { primeira = r.result.current.savePreferences({ preferred_model: 'smart' }); });
    await expect(r.result.current.savePreferences({ default_tone: 'direto' })).rejects.toThrow('alteração anterior');
    expect(r.result.current.preferences.preferred_model).toBe('fast');
    await act(async () => { resolve({ data: { ...preferencias, preferred_model: 'smart' }, error: null }); await primeira; });
    expect(mocks.write).toHaveBeenCalledTimes(1);
    expect(mocks.payloads[0]).toEqual({ user_id: 'u1', preferred_model: 'smart' });
    expect(r.result.current.preferences.preferred_model).toBe('smart');
  });
  it('não apaga hashtags existentes se a inserção das substitutas falhar', async () => {
    mocks.addTags.mockResolvedValueOnce({ error: { message: 'Inserção recusada' } });
    const r = renderHook(() => useAiPreferences()); await pronto(r);
    await act(async () => { await expect(r.result.current.savePreferences({ brand_hashtags: ['#nova'] })).rejects.toThrow('Inserção recusada'); });
    expect(mocks.removeTags).not.toHaveBeenCalled(); expect(mocks.write).not.toHaveBeenCalled();
    expect(r.result.current.preferences.brand_hashtags).toEqual(['#anterior']);
  });
  it('adiciona as substitutas antes de retirar apenas as hashtags antigas e confirma todos os passos', async () => {
    mocks.write.mockResolvedValueOnce({ data: { ...preferencias, brand_hashtags: ['#nova'] }, error: null });
    const r = renderHook(() => useAiPreferences()); await pronto(r);
    await act(async () => { await r.result.current.savePreferences({ brand_hashtags: ['#nova'] }); });
    expect(mocks.changes).toEqual(['adicionar', 'preferencias', 'retirar']);
    expect(mocks.removeTags).toHaveBeenCalledWith('hashtag', ['#anterior']);
    expect(r.result.current.preferences.brand_hashtags).toEqual(['#nova']);
  });
  it('uma falha ao retirar hashtags mantém a cópia visível e nunca anuncia sucesso', async () => {
    mocks.write.mockResolvedValueOnce({ data: { ...preferencias, brand_hashtags: ['#nova'] }, error: null });
    mocks.removeTags.mockResolvedValueOnce({ error: { message: 'Remoção recusada' } });
    const r = renderHook(() => useAiPreferences()); await pronto(r);
    await act(async () => { await expect(r.result.current.savePreferences({ brand_hashtags: ['#nova'] })).rejects.toThrow('Remoção recusada'); });
    expect(r.result.current.preferences.brand_hashtags).toEqual(['#anterior']);
    expect(r.result.current.error).toContain('Recarrega');
  });
  it('conserva hashtags antigas quando cria a primeira linha de preferências a partir de outra alteração', async () => {
    mocks.read.mockResolvedValueOnce({ data: null, error: null });
    const r = renderHook(() => useAiPreferences()); await pronto(r);
    await act(async () => { await r.result.current.savePreferences({ preferred_language: 'en' }); });
    expect(mocks.payloads[0]).toMatchObject({ brand_hashtags: ['#anterior'], preferred_language: 'en' });
  });
  it('a página mantém as opções bloqueadas após uma falha de leitura e deixa recarregar', async () => {
    mocks.tags.mockResolvedValueOnce({ data: null, error: { message: 'Sem acesso às hashtags' } });
    render(<AISettings />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Sem acesso às hashtags');
    expect(screen.getByRole('button', { name: 'Adicionar' })).toBeDisabled();
    screen.getAllByRole('combobox').forEach((control) => expect(control).toBeDisabled());
    fireEvent.click(screen.getByRole('button', { name: 'Recarregar preferências' }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Adicionar' })).toBeEnabled();
  });
});
