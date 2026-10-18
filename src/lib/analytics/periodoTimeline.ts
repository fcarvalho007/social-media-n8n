import {getISOWeek,getISOWeekYear} from 'date-fns';

/** ISO weeks belong to their week-year, which may differ from the calendar year. */
export function chavePeriodoTimeline(date: Date, granularidade: 'daily'|'weekly'|'monthly'): string {
  if (granularidade === 'weekly') return `${getISOWeekYear(date)}-W${String(getISOWeek(date)).padStart(2,'0')}`;
  const ano = date.getFullYear(),mes = String(date.getMonth()+1).padStart(2,'0');
  return granularidade === 'daily' ? `${ano}-${mes}-${String(date.getDate()).padStart(2,'0')}` : `${ano}-${mes}`;
}
