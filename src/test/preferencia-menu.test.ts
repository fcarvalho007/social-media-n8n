import { describe, it, expect, beforeEach } from 'vitest';
import { lerMenuAberto, guardarMenuAberto } from '@/lib/preferenciaMenu';

describe('preferência do menu', () => {
  beforeEach(() => localStorage.clear());
  it('usa a omissão sem escolha guardada', () => { expect(lerMenuAberto(true)).toBe(true); });
  it('lembra o menu oculto', () => { guardarMenuAberto(false); expect(lerMenuAberto(true)).toBe(false); });
});
