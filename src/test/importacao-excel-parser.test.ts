// @vitest-environment node
import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';

describe('parser real dos ficheiros de analítica', () => {
  it.each(['xlsx', 'biff8'] as const)('preserva cabeçalhos, português e zeros em %s', bookType => {
    const livro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(livro, XLSX.utils.aoa_to_sheet([
      ['caption', 'likesCount', 'ownerUsername', 'timestamp'],
      ['Formação em IA — ação prática', 0, 'fredericocarvalho', '2026-10-19T10:00:00Z'],
    ]), 'Publicações');
    const bytes = XLSX.write(livro, { bookType, type: 'array' });
    const reaberto = XLSX.read(bytes);
    expect(XLSX.utils.sheet_to_json(reaberto.Sheets[reaberto.SheetNames[0]])).toEqual([
      { caption: 'Formação em IA — ação prática', likesCount: 0, ownerUsername: 'fredericocarvalho', timestamp: '2026-10-19T10:00:00Z' },
    ]);
  });

  it('devolve zero registos numa folha vazia sem criar dados de analítica', () => {
    const livro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(livro, XLSX.utils.aoa_to_sheet([]), 'Sem dados');
    const reaberto = XLSX.read(XLSX.write(livro, { type: 'array', bookType: 'xlsx' }));
    expect(XLSX.utils.sheet_to_json(reaberto.Sheets[reaberto.SheetNames[0]])).toEqual([]);
  });
});
