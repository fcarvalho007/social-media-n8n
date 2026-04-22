import { ValidatorContext, ValidationIssue } from '../types';

/**
 * Validates scheduling intent:
 *  - When `scheduleAsap` is false a date must be selected.
 *  - The selected date/time cannot lie in the past.
 */
export async function scheduleValidator(
  ctx: ValidatorContext,
): Promise<ValidationIssue[]> {
  if (ctx.scheduleAsap) return [];

  if (!ctx.scheduledDate) {
    return [
      {
        id: 'schedule:missing-date',
        severity: 'error',
        category: 'schedule',
        title: 'Data de agendamento em falta',
        description: 'Activa "Publicar imediatamente" ou escolhe uma data/hora futura.',
      },
    ];
  }

  if (ctx.scheduledDate.getTime() < Date.now()) {
    return [
      {
        id: 'schedule:past-date',
        severity: 'error',
        category: 'schedule',
        title: 'Data/hora no passado',
        description: 'A data escolhida já passou. Escolhe um momento futuro.',
      },
    ];
  }

  return [];
}
