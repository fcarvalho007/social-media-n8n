import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { FontesDocumentos } from '@/features/documentos/FontesDocumentos';
import type { TarefaDocumentos } from '@/features/documentos/contratos';

const m = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('@/features/documentos/apiLocal', () => ({ apiDocumentos: m.api, binarioDocumento: vi.fn() }));
const job = (id: string, estado: TarefaDocumentos['estado'] = 'concluida'): TarefaDocumentos => ({
  id, ambito: 'a', modo: 'diagnostico', estado, iniciadaEm: '2026-10-19T10:00:00Z',
  atual: 'A verificar', total: 1, fontes: [], erros: [], descobertas: [], pdfs: [],
});
const props = { ambito: 'a', ocupado: false, onGuardar: vi.fn(), onAbrir: vi.fn(), onPrepararArtigo: vi.fn() };
afterEach(() => { cleanup(); vi.restoreAllMocks(); m.api.mockReset(); });

it('abrir 34 recolhas históricas não pede 34 recarregamentos do acervo, nem ao mudar a identidade do callback', async () => {
  m.api.mockImplementation(async (acao: string) => acao === 'tarefas' ? Array.from({ length: 34 }, (_, i) => job(String(i))) : acao === 'fontes' ? [] : null);
  const onConcluido = vi.fn();
  const view = render(<FontesDocumentos {...props} onConcluido={onConcluido} />);
  await act(async () => {});
  await waitFor(() => expect(m.api).toHaveBeenCalledWith('tarefas', { ambito: 'a' }));
  expect(onConcluido).not.toHaveBeenCalled();
  const novoCallback = vi.fn(); view.rerender(<FontesDocumentos {...props} onConcluido={novoCallback} />);
  expect(novoCallback).not.toHaveBeenCalled();
});

it('duas tarefas que acabam no mesmo poll atualizam uma vez; uma tarefa retomada pode voltar a concluir', async () => {
  let tarefas = [job('antiga'), job('nova-1', 'em_curso'), job('nova-2', 'em_curso')];
  m.api.mockImplementation(async (acao: string) => acao === 'tarefas' ? structuredClone(tarefas) : acao === 'fontes' ? [] : null);
  const intervalos = vi.spyOn(globalThis, 'setInterval'); const onConcluido = vi.fn();
  render(<FontesDocumentos {...props} onConcluido={onConcluido} />);
  await waitFor(() => expect(intervalos.mock.calls.some(([, ms]) => ms === 1800)).toBe(true));
  const poll = intervalos.mock.calls.find(([, ms]) => ms === 1800)![0] as () => void;
  expect(onConcluido).not.toHaveBeenCalled();
  tarefas = tarefas.map(t => ({ ...t, estado: 'concluida' }));
  await act(async () => { poll(); }); expect(onConcluido).toHaveBeenCalledTimes(1);
  await act(async () => { poll(); }); expect(onConcluido).toHaveBeenCalledTimes(1);
  tarefas = [job('antiga', 'em_curso'), job('nova-1'), job('nova-2')];
  await act(async () => { poll(); }); expect(onConcluido).toHaveBeenCalledTimes(1);
  tarefas = tarefas.map(t => ({ ...t, estado: 'concluida' }));
  await act(async () => { poll(); }); expect(onConcluido).toHaveBeenCalledTimes(2);
});
