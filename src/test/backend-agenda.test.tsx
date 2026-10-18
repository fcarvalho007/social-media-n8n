import { afterEach, it, expect, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { AgendaDocumentos } from '@/components/backend/AgendaDocumentos';
import type { apiBackend } from '@/lib/backendHub';
afterEach(cleanup);
it('alterar a agenda não ativa tarefas antes de guardar e uma falha mantém a escolha', async () => { const consultar = vi.fn(async () => { throw new Error('Não foi possível guardar.'); }) as unknown as typeof apiBackend; render(<AgendaDocumentos projeto="p" inicial={null} consultar={consultar} atualizar={vi.fn()}/>); fireEvent.click(screen.getByRole('checkbox')); expect(consultar).not.toHaveBeenCalled(); fireEvent.click(screen.getByRole('button', { name: 'Guardar recolha periódica' })); await screen.findByRole('alert'); expect(screen.getByRole('checkbox')).toBeChecked(); expect(screen.getByText('Alterações por guardar. A agenda anterior mantém-se.')).toBeInTheDocument(); });
