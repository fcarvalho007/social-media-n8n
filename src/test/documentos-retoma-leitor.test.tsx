import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { LeitorDocumento } from '@/features/documentos/LeitorDocumento';
import type { DocumentoAcervo } from '@/features/documentos/modelo';

// Reader recovery does not parse PDFs. Keep the browser worker asset out of
// this UI-only test (the Cloud test runner forbids assets outside its root).
vi.mock('@/lib/carregarPdfJs', () => ({ carregarPdfJs: vi.fn(() => { throw new Error('Este ensaio do leitor não deve iniciar PDF.js.'); }) }));

afterEach(cleanup);
it('permite recuperar preparação interrompida que ainda tem estado a_processar', () => {
  Element.prototype.scrollIntoView = vi.fn();
  const d: DocumentoAcervo = { id: 'pdf', ambito: '["u","p"]', titulo: 'Relatório', origem: null, recolhidoEm: new Date().toISOString(), publicadoEm: null, ficheiro: new Blob(), processamento: { estado: 'a_processar', paginas: 1, total: 2, reextracao: true }, pdf: { ficheiro: 'relatorio.pdf', hash: 'abc', bytes: 100, paginas: [
    { n: 1, estado: 'texto', texto: 'Texto preservado', paragrafos: ['Texto preservado'] },
    { n: 2, estado: 'sem_texto_com_imagem', texto: '', paragrafos: [] },
  ] } };
  const retomar = vi.fn();
  const props = { documento: d, paginas: new Set<number>(), onPaginas: vi.fn(), ocupado: false, voltar: vi.fn(), onTitulo: vi.fn(), onLeitura: vi.fn(), onOriginal: vi.fn(), onCapa: vi.fn(), onDownloadCapa: vi.fn(), onCopiar: vi.fn(), onPreparar: vi.fn(), onReextrair: retomar };
  const view = render(<LeitorDocumento {...props} />);
  fireEvent.click(screen.getByRole('button', { name: 'Verificar e retomar extração' }));
  expect(retomar).toHaveBeenCalledOnce();
  expect(d.pdf.paginas[0].texto).toBe('Texto preservado');
  view.rerender(<LeitorDocumento {...props} ocupado />);
  expect(screen.getByRole('button', { name: 'Verificar e retomar extração' })).toBeDisabled();
});
