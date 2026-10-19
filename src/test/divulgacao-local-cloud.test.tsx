import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ConteudosSociais from '@/pages/ConteudosSociais';

const m = vi.hoisted(() => ({ local: false, listar: vi.fn(), processar: vi.fn() }));
vi.mock('@/lib/backendHub', () => ({ get MODO_HUB_LOCAL() { return m.local; } }));
vi.mock('@/contexts/ProjetoContext', () => ({ useProjeto: () => ({ estado: 'pronto', projetoId: 'projeto-1', projeto: { name: 'Projeto de teste' } }) }));
vi.mock('@/services/conteudos', () => ({
  ESTADOS_JOB: {}, ORIGENS_JOB: {}, listarConteudos: m.listar, processarFila: m.processar,
  prepararCarrossel: vi.fn(), retomarJob: vi.fn(),
}));
const vazio = { conteudos: [], jobs: [], edicoes: [], sem_identidade: false, credenciais: { egoi: true, deepseek: true } };
beforeEach(() => { m.local = false; m.listar.mockReset(); m.processar.mockReset(); });
afterEach(cleanup);
const montar = () => render(<MemoryRouter><ConteudosSociais /></MemoryRouter>);

it('explica o isolamento local sem fingir uma falha de rede nem consultar envios ou processar filas', async () => {
  m.local = true; montar();
  expect(screen.getByText('Os envios reais estão na aplicação Cloud')).toBeVisible();
  expect(screen.getByRole('link', { name: /Abrir divulgação na aplicação Cloud/ })).toHaveAttribute('href', 'https://hub-conteudo.lovable.app/estudio/redes-sociais');
  expect(screen.getByRole('button', { name: 'Atualizar lista' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Processar fila agora' })).toBeDisabled();
  expect(screen.queryByText('Não foi possível carregar os carrosséis')).not.toBeInTheDocument();
  await waitFor(() => expect(m.listar).not.toHaveBeenCalled());
  expect(m.processar).not.toHaveBeenCalled();
});

it('mantém erros reais visíveis no Cloud e recupera por leitura, sem executar a fila', async () => {
  m.listar.mockRejectedValueOnce(new Error('Serviço temporariamente indisponível.'));
  montar();
  expect(await screen.findByText('Não foi possível carregar os carrosséis')).toBeVisible();
  expect(screen.getByText('Serviço temporariamente indisponível.')).toBeVisible();
  expect(screen.queryByText('Os envios reais estão na aplicação Cloud')).not.toBeInTheDocument();
  m.listar.mockResolvedValue(vazio);
  fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
  await screen.findByText(/Ainda não há edições enviadas/);
  expect(m.listar).toHaveBeenCalledTimes(2);
  expect(m.listar).toHaveBeenLastCalledWith('projeto-1');
  expect(screen.queryByText('Não foi possível carregar os carrosséis')).not.toBeInTheDocument();
  expect(m.processar).not.toHaveBeenCalled();
});
