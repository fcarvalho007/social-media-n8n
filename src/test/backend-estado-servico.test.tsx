import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EstadoServicoEditorial } from '@/components/backend/EstadoServicoEditorial';
import type { apiBackend } from '@/lib/backendHub';
afterEach(cleanup);
function montar({ escrever = true, erro = false } = {}) {
    let pausado = true;
    const chamadas: string[] = [];
    const consultar = vi.fn(async (caminho: string) => {
        chamadas.push(caminho);
        if (erro)
            throw new Error('Serviço indisponível.');
        if (caminho === '/operacao/retomar')
            pausado = false;
        if (caminho === '/operacao/pausar')
            pausado = true;
        return { operacao: { pausado }, trabalhos: [], podeEditar: escrever };
    }) as unknown as typeof apiBackend;
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    render(<QueryClientProvider client={client}><EstadoServicoEditorial projeto="projeto" consultar={consultar}/></QueryClientProvider>);
    return { chamadas, consultar };
}
describe('controlo de serviço durável', () => {
    it('exige confirmação de retoma e preserva uma pausa explícita', async () => { const h = montar(); fireEvent.click(await screen.findByRole('button', { name: 'Retomar tarefas' })); expect(h.chamadas).toEqual(['/operacao/estado']); fireEvent.click(screen.getByRole('button', { name: 'Confirmar retoma' })); await screen.findByText('Serviço de tarefas ativo'); expect(h.chamadas.filter(p => p === '/operacao/retomar')).toHaveLength(1); fireEvent.click(screen.getByRole('button', { name: 'Pausar tarefas' })); await screen.findByText('Tarefas em pausa'); });
    it('distingue indisponibilidade de uma fila vazia e permite tentar de novo', async () => { const h = montar({ erro: true }); await screen.findByRole('alert'); expect(screen.queryByText('Tarefas em pausa')).not.toBeInTheDocument(); fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' })); await waitFor(() => expect(h.chamadas.length).toBe(2)); });
    it('não oferece ações de escrita a um leitor', async () => { montar({ escrever: false }); await screen.findByText('Tarefas em pausa'); expect(screen.queryByRole('button', { name: 'Retomar tarefas' })).not.toBeInTheDocument(); });
    it('confirma o ponto de recuperação sem prometer uma exportação de binários', async () => { montar(); fireEvent.click(await screen.findByRole('button', { name: 'Guardar ponto de recuperação' })); await screen.findByText('Ponto de recuperação guardado; os ficheiros foram verificados.'); });
});
