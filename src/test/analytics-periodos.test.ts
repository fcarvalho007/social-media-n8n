import {describe,expect,it} from 'vitest';
import {chavePeriodoTimeline} from '@/lib/analytics/periodoTimeline';
describe('períodos dos gráficos de contas',()=>{
 it.each([['2021-01-01','2020-W53'],['2021-01-04','2021-W01'],['2024-12-30','2025-W01'],['2026-10-18','2026-W42']])('agrega %s na semana ISO correta', (data,chave)=>expect(chavePeriodoTimeline(new Date(`${data}T12:00:00`),'weekly')).toBe(chave));
 it('mantém os agrupamentos diário e mensal',()=>{const d=new Date('2026-10-18T12:00:00');expect(chavePeriodoTimeline(d,'daily')).toBe('2026-10-18');expect(chavePeriodoTimeline(d,'monthly')).toBe('2026-10');});
});
