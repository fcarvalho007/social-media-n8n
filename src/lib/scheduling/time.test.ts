import { describe, it, expect } from 'vitest';
import { normalizeTime, combineDateAndTime, DEFAULT_TIME } from './time';

describe('normalizeTime', () => {
  it('mantém HH:mm válido', () => {
    expect(normalizeTime('21:00')).toBe('21:00');
    expect(normalizeTime('00:00')).toBe('00:00');
    expect(normalizeTime('23:59')).toBe('23:59');
  });

  it('reduz HH:mm:ss para HH:mm', () => {
    expect(normalizeTime('21:00:00')).toBe('21:00');
    expect(normalizeTime('09:05:42.123')).toBe('09:05');
  });

  it('aceita variações sem zeros à esquerda', () => {
    expect(normalizeTime('9:5')).toBe('09:05');
    expect(normalizeTime('7')).toBe('07:00');
  });

  it('aceita Date', () => {
    const d = new Date();
    d.setHours(14, 7, 0, 0);
    expect(normalizeTime(d)).toBe('14:07');
  });

  it('devolve fallback para inválidos', () => {
    expect(normalizeTime(null)).toBe(DEFAULT_TIME);
    expect(normalizeTime(undefined)).toBe(DEFAULT_TIME);
    expect(normalizeTime('')).toBe(DEFAULT_TIME);
    expect(normalizeTime('abc')).toBe(DEFAULT_TIME);
    expect(normalizeTime('25:00')).toBe(DEFAULT_TIME);
    expect(normalizeTime('10:99')).toBe(DEFAULT_TIME);
    expect(normalizeTime('-1:00')).toBe(DEFAULT_TIME);
  });

  it('respeita fallback custom', () => {
    expect(normalizeTime('xx', '08:00')).toBe('08:00');
  });
});

describe('combineDateAndTime', () => {
  it('combina data e hora corretamente', () => {
    const base = new Date(2026, 4, 15, 0, 0, 0, 0);
    const merged = combineDateAndTime(base, '21:00');
    expect(merged?.getHours()).toBe(21);
    expect(merged?.getMinutes()).toBe(0);
    expect(merged?.getDate()).toBe(15);
  });

  it('aceita HH:mm:ss', () => {
    const base = new Date(2026, 4, 15);
    const merged = combineDateAndTime(base, '21:00:00');
    expect(merged?.getHours()).toBe(21);
  });

  it('devolve null sem data', () => {
    expect(combineDateAndTime(null, '21:00')).toBeNull();
    expect(combineDateAndTime(undefined, '21:00')).toBeNull();
  });

  it('aplica fallback em hora inválida', () => {
    const base = new Date(2026, 4, 15);
    const merged = combineDateAndTime(base, 'xx');
    expect(merged?.getHours()).toBe(12);
  });
});
