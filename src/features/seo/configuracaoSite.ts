import { z } from 'zod';
import type { PoliticaSite, SiteEditorial } from './contratos';

const texto = (nome: string) => z.string().trim().min(10, `${nome}: escreve pelo menos 10 caracteres.`).max(6000, `${nome}: usa até 6 000 caracteres.`).refine(v => !/^a (definir|confirmar|desenvolver)/i.test(v), `${nome}: substitui o texto por definir por uma orientação concreta.`);
const temas = z.array(z.string().trim().min(2, 'Cada tema precisa de pelo menos 2 caracteres.').max(100, 'Cada tema pode ter até 100 caracteres.')).max(30, 'Usa até 30 temas.');
export const schemaDefinicaoSite = z.object({
  publico: texto('Público'), objetivo: texto('Objetivo'), voz: texto('Voz'), oferta: texto('Oferta'),
  temasPermitidos: temas.min(1, 'Define pelo menos um tema para este site.'), temasExcluidos: temas,
  dias: z.array(z.number().int().min(0).max(6)).min(1, 'Escolhe pelo menos um dia.').max(7).refine(v => new Set(v).size === v.length, 'Não repitas dias.'),
  hora: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Indica uma hora válida.'),
  limiteSemanal: z.number().int().min(1, 'Escolhe entre 1 e 7 artigos por semana.').max(7, 'Escolhe entre 1 e 7 artigos por semana.'),
  producao: z.enum(['manual', 'automatica']), publicacao: z.enum(['humana', 'automatica']),
}).strict().superRefine((v, ctx) => {
  if (v.dias.length !== v.limiteSemanal) ctx.addIssue({ code: 'custom', path: ['dias'], message: `Escolhe ${v.limiteSemanal} ${v.limiteSemanal === 1 ? 'dia' : 'dias'} para o ritmo semanal definido.` });
});
export type DefinicaoSite = z.infer<typeof schemaDefinicaoSite>;
export const PASSOS_SITE = ['Público e objetivo', 'Voz', 'Temas', 'Oferta', 'Frequência e aprovação', 'Rever e guardar'] as const;
const camposPorPasso: string[][] = [['publico', 'objetivo'], ['voz'], ['temasPermitidos', 'temasExcluidos'], ['oferta'], ['dias', 'hora', 'limiteSemanal', 'producao', 'publicacao']];
export interface ProblemaSite { campo: string; mensagem: string; passo: number }
export function problemasDefinicao(d: DefinicaoSite, site: SiteEditorial): ProblemaSite[] {
  const p = schemaDefinicaoSite.safeParse(d);
  const erros: ProblemaSite[] = p.success ? [] : p.error.issues.map(i => ({ campo: String(i.path[0]), mensagem: i.message, passo: Math.max(0, camposPorPasso.findIndex(c => c.includes(String(i.path[0])))) }));
  if (site.revisaoObrigatoria && d.publicacao !== 'humana') erros.push({ campo: 'publicacao', mensagem: 'Este site exige aprovação humana de cada artigo.', passo: 4 });
  if (site.estado === 'planeado' && (d.producao !== 'manual' || d.publicacao !== 'humana')) erros.push({ campo: 'producao', mensagem: 'Um site planeado só pode guardar preparação manual e aprovação humana.', passo: 4 });
  return erros;
}
export function definicaoDoSite(s: SiteEditorial): DefinicaoSite {
  return { publico: s.publico, objetivo: s.objetivo, voz: s.voz, oferta: s.oferta, temasPermitidos: [...s.politica.temasPermitidos], temasExcluidos: [...s.politica.temasExcluidos], dias: [...s.politica.dias], hora: s.politica.hora, limiteSemanal: s.politica.limiteSemanal, producao: s.politica.producao, publicacao: s.politica.publicacao };
}
/** The guide can change only its visible fields, preserving budgets, leases and advanced permissions. */
export function politicaComDefinicao(p: PoliticaSite, d: DefinicaoSite): PoliticaSite {
  return { ...p, temasPermitidos: d.temasPermitidos, temasExcluidos: d.temasExcluidos, dias: d.dias, hora: d.hora, limiteSemanal: d.limiteSemanal, producao: d.producao, publicacao: d.publicacao };
}
export function estadoConfiguracaoSite(s: SiteEditorial) {
  if (!s.configuracaoGuiada) return 'Por rever';
  return s.configuracaoGuiada.revista === s.politica.revista && !problemasDefinicao(definicaoDoSite(s), s).length ? 'Configuração revista' : 'Rever alterações';
}
export const DIAS_SITE = [{ n: 1, nome: 'Segunda-feira', curto: 'Seg' }, { n: 2, nome: 'Terça-feira', curto: 'Ter' }, { n: 3, nome: 'Quarta-feira', curto: 'Qua' }, { n: 4, nome: 'Quinta-feira', curto: 'Qui' }, { n: 5, nome: 'Sexta-feira', curto: 'Sex' }, { n: 6, nome: 'Sábado', curto: 'Sáb' }, { n: 0, nome: 'Domingo', curto: 'Dom' }];
export function ritmoDoSite(d: Pick<DefinicaoSite, 'dias' | 'hora' | 'limiteSemanal'>) { return `${d.limiteSemanal} ${d.limiteSemanal === 1 ? 'artigo por semana' : 'artigos por semana'} · ${DIAS_SITE.filter(x => d.dias.includes(x.n)).map(x => x.curto).join(', ')} · ${d.hora} (Lisboa)`; }
export interface FormularioSite extends Omit<DefinicaoSite, 'temasPermitidos' | 'temasExcluidos'> { temas: string; excluidos: string }
export function formularioSite(s: SiteEditorial): FormularioSite { const { temasPermitidos, temasExcluidos, ...d } = definicaoDoSite(s); return { ...d, temas: temasPermitidos.join('\n'), excluidos: temasExcluidos.join('\n') }; }
export function definicaoFormulario(f: FormularioSite): DefinicaoSite { const { temas, excluidos, ...d } = f; return { ...d, temasPermitidos: temas.split('\n').map(t => t.trim()).filter(Boolean), temasExcluidos: excluidos.split('\n').map(t => t.trim()).filter(Boolean) }; }
export function lerRascunhoSite(v: unknown): { siteId: string; revista: number; passo: number; form: FormularioSite } | null {
  const f = z.object({ siteId: z.string(), revista: z.number().int().positive(), passo: z.number().int().min(0).max(5), form: z.object({ publico: z.string().max(6000), objetivo: z.string().max(6000), voz: z.string().max(6000), oferta: z.string().max(6000), temas: z.string().max(10000), excluidos: z.string().max(10000), dias: z.array(z.number().int().min(0).max(6)).max(7), hora: z.string().max(5), limiteSemanal: z.number().int().min(0).max(7), producao: z.enum(['manual','automatica']), publicacao: z.enum(['humana','automatica']) }).strict() }).strict().safeParse(v);
  return f.success ? f.data as { siteId: string; revista: number; passo: number; form: FormularioSite } : null;
}
