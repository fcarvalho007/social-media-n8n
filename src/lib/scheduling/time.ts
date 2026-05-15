/**
 * Helpers para normalização de hora de agendamento.
 *
 * A UI trabalha sempre em "HH:mm" (24h, fuso de Lisboa). A base de dados
 * guarda `time` como `HH:mm:ss`. Rascunhos antigos podem trazer valores
 * inesperados (Date, null, "9:5", "21:00:00.123"). Este módulo garante
 * que tudo é convertido para "HH:mm" antes de ser usado.
 */

export const DEFAULT_TIME = '12:00';

/**
 * Aceita qualquer entrada e devolve sempre uma string "HH:mm" válida.
 * Se a entrada não conseguir ser interpretada, devolve `DEFAULT_TIME`.
 */
export function normalizeTime(input: unknown, fallback: string = DEFAULT_TIME): string {
  if (input == null) return fallback;

  if (input instanceof Date && !Number.isNaN(input.getTime())) {
    return `${pad(input.getHours())}:${pad(input.getMinutes())}`;
  }

  if (typeof input !== 'string') return fallback;

  const trimmed = input.trim();
  if (!trimmed) return fallback;

  // Match HH, HH:mm, HH:mm:ss, HH:mm:ss.fff
  const match = trimmed.match(/^(\d{1,2})(?::(\d{1,2}))?(?::\d{1,2}(?:\.\d+)?)?$/);
  if (!match) return fallback;

  const hour = Number(match[1]);
  const minute = match[2] != null ? Number(match[2]) : 0;

  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return fallback;
  if (!Number.isFinite(minute) || minute < 0 || minute > 59) return fallback;

  return `${pad(hour)}:${pad(minute)}`;
}

/**
 * Combina uma data (apenas dia) com uma hora "HH:mm" e devolve um Date.
 * Devolve `null` se a data não estiver definida ou inválida.
 */
export function combineDateAndTime(date: Date | null | undefined, time: unknown): Date | null {
  if (!date || Number.isNaN(date.getTime())) return null;
  const normalized = normalizeTime(time);
  const [hh, mm] = normalized.split(':').map(Number);
  const merged = new Date(date);
  merged.setHours(hh, mm, 0, 0);
  return merged;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}
