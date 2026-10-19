import { z } from 'zod';
import type { EstadoSeo, PoliticaSite } from './contratos';

export const schemaCriarLote = z.object({
  pedidoId: z.string().uuid(), siteId: z.string().min(1).max(80), nome: z.string().trim().min(3).max(120),
  inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), temas: z.array(z.string().trim().min(2).max(80)).min(1).max(20),
  pesquisaId: z.string().uuid().nullable(), contributo: z.string().max(4000), objetivo: z.string().max(2000), cta: z.string().max(1500),
  tetoMicro: z.number().int().positive().max(100000000),
}).strict();
export type CriarLote = z.infer<typeof schemaCriarLote>;
export const schemaLote = z.object({
  id: z.string().uuid(), pedidoId: z.string().uuid(), assinaturaEntrada: z.string(), nome: z.string(), siteId: z.string(),
  pautaIds: z.array(z.string().uuid()).min(1).max(20), ignoradas: z.array(z.string()).max(20),
  criadoEm: z.string().datetime(), revista: z.number().int().positive(), tetoMicro: z.number().int().positive(),
  estado: z.enum(['preparado', 'autorizado', 'pausado']),
  autorizacao: z.object({ politica: z.number(), conhecimento: z.number(), em: z.string().datetime() }).strict().nullable(),
}).strict();
export type LoteEditorial = z.infer<typeof schemaLote>;
export function custoLote(e: Pick<EstadoSeo, 'pedidos'>, l: LoteEditorial) {
  const pedidos = e.pedidos.filter(p => l.pautaIds.includes(p.pautaId ?? '') && p.modo === 'real');
  return { efetivo: pedidos.reduce((n,p) => n + (p.custoMicro ?? 0), 0), reservado: pedidos.reduce((n,p) => n + p.reservaMicro, 0), incertos: pedidos.filter(p => p.custoMicro === null).length };
}
export function bloqueioLote(e: EstadoSeo, pautaId: string, estimativa: number, automatico: boolean): string[] {
  const p = e.pautas.find(p => p.id === pautaId), l = e.lotes?.find(l => l.id === p?.loteId);
  if (!l) return [];
  const s = e.sites.find(s => s.id === l.siteId)!, c = custoLote(e,l), b: string[] = [];
  if (c.incertos) b.push('O lote tem pedidos em curso ou custos por confirmar. Confere-os antes de continuar.');
  if (c.efetivo + c.reservado + estimativa > l.tetoMicro) b.push('O pedido ultrapassa o teto do lote. Revê o orçamento do lote antes de continuar.');
  if (automatico && (l.estado !== 'autorizado' || l.autorizacao?.politica !== s.politica.revista || l.autorizacao?.conhecimento !== (s.conhecimento?.revista ?? 0))) b.push('O lote não tem autorização atual. Revê a política e o conhecimento antes de retomar a cadência.');
  return b;
}
/** Preparation dates only. Publication still follows the destination's approval policy. */
export function calendarizarLote(inicio: string, quantidade: number, politica: PoliticaSite, ocupadas: string[] = []) {
  const data = new Date(`${inicio}T12:00:00Z`);
  if (!Number.isFinite(data.getTime()) || data.toISOString().slice(0,10) !== inicio) throw new Error('Indica uma data inicial válida.');
  const usadas = new Set(ocupadas), semanas = new Map<string,number>();
  const semana = (dia: string) => { const d=new Date(`${dia}T12:00:00Z`); d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7); return d.toISOString().slice(0,10); };
  for (const dia of usadas) if (/^\d{4}-\d{2}-\d{2}$/.test(dia)) semanas.set(semana(dia),(semanas.get(semana(dia))??0)+1);
  const datas: string[] = [];
  for (let i=0;i<730 && datas.length<quantidade;i++,data.setUTCDate(data.getUTCDate()+1)) {
    const dia=data.toISOString().slice(0,10), sem=semana(dia);
    if (!politica.dias.includes(data.getUTCDay()) || usadas.has(dia) || (semanas.get(sem)??0)>=politica.limiteSemanal) continue;
    datas.push(dia); usadas.add(dia); semanas.set(sem,(semanas.get(sem)??0)+1);
  }
  if (datas.length!==quantidade) throw new Error('Não foi possível distribuir o lote nesta cadência. Revê os dias e o limite semanal do site.');
  return datas;
}
