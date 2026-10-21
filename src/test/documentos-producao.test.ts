import { it, expect, vi } from 'vitest';
// A Cloud build must expose the library without enabling the local HTTP/IndexedDB fallback.
vi.mock('@/lib/backendHub', () => ({ MODO_HUB_LOCAL: false, BACKEND_NUVEM: true }));
import { DOCUMENTOS_LOCAL, DOCUMENTOS_DISPONIVEL } from '@/features/documentos/modelo';
import { DESTINOS_NAVEGACAO, migalhasNavegacao } from '@/lib/navegacao';
it('a biblioteca na nuvem aparece na navegação com o modo local desligado', () => {
  expect(DOCUMENTOS_LOCAL).toBe(false);
  expect(DOCUMENTOS_DISPONIVEL).toBe(true);
  expect(DESTINOS_NAVEGACAO.some(d => d.url === '/curadoria/documentos')).toBe(true);
  expect(migalhasNavegacao('/curadoria/documentos').map(m => m.label)).toEqual(['Início', 'Curadoria', 'Documentos e relatórios']);
});
