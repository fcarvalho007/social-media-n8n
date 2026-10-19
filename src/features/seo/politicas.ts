import type { ConfigGeralSeo, PautaEditorial, PoliticaSite, SiteEditorial } from './contratos';
import { z } from 'zod';
import { verificarArtigo } from './sequencia';
export const schemaConfiguracaoSeo = z.object({ revista: z.number().int().positive(), pausado: z.boolean(), automacaoPausada: z.boolean(), mensalMicro: z.number().int().min(0).max(1000000000), diarioMicro: z.number().int().min(0).max(1000000000), pedidoMicro: z.number().int().min(0).max(100000000), cambio: z.number().min(0.1).max(10), cambioData: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), cacheDias: z.number().int().min(1).max(30) }).strict();
export const schemaPoliticaSeo = z.object({ sequenciaCompleta: z.boolean().optional(), producao: z.enum(['manual', 'automatica']), publicacao: z.enum(['humana', 'automatica']), ativa: z.boolean(), dias: z.array(z.number().int().min(0).max(6)).min(1).max(7), hora: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), limiteSemanal: z.number().int().min(1).max(7), reservaSemanas: z.number().int().min(1).max(4), pesquisarAutomaticamente: z.boolean(), mensalMicro: z.number().int().min(0).max(1000000000), diarioMicro: z.number().int().min(0).max(1000000000), pedidoMicro: z.number().int().min(0).max(100000000), temasPermitidos: z.array(z.string().trim().min(2).max(100)).min(0).max(30), temasExcluidos: z.array(z.string().trim().min(2).max(100)).max(30), revista: z.number().int().positive() }).strict();
export function validarPolitica(s: SiteEditorial, p: PoliticaSite) {
  schemaPoliticaSeo.parse(p);
  if (s.revisaoObrigatoria && p.publicacao !== 'humana') throw new Error('Este site exige aprovação humana em todas as publicações.');
  if (s.estado === 'planeado' && (p.ativa || p.producao === 'automatica' || p.publicacao === 'automatica' || p.pesquisarAutomaticamente || p.sequenciaCompleta)) throw new Error('Este site está planeado. Não pode iniciar automações antes de ser configurado e testado.');
  if (p.ativa && p.producao === 'automatica' && !p.temasPermitidos.length) throw new Error('Define pelo menos um tema permitido para a produção automática.');
  if (p.diarioMicro > p.mensalMicro || p.pedidoMicro > p.diarioMicro) throw new Error('O limite por pedido não pode superar o diário, nem o diário o mensal.');
}
export const normalizarSeo = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim().replace(/\s+/g,' ');
export function bloqueiosProducao(p: PautaEditorial, site: SiteEditorial): string[] {
  const falhas: string[] = [];
  if (p.palavra.trim().length < 2) falhas.push('Define a palavra-chave principal antes de produzir ou publicar este artigo.');
  if (site.estado === 'planeado') falhas.push('Site planeado: a desenvolver mais tarde.');
  if (p.modoOrigem === 'exemplo' || p.modoOrigem === 'sandbox') falhas.push('Esta pauta usa dados de demonstração. Prepara uma pauta com dados reais ou um tópico próprio antes de gastar.');
  if (p.contributo?.trim().length < 40) falhas.push('Explica o contributo original do artigo em pelo menos 40 caracteres.');
  if (!p.fontes.some(f => f.aprovada && f.excerto.trim().length >= 200)) falhas.push('Adiciona e verifica pelo menos uma fonte com um excerto de 200 caracteres.');
  if (p.fontes.some(f => !f.aprovada || !f.verificadaEm)) falhas.push('Confirma todas as fontes antes de produzir texto.');
  falhas.push(...verificarArtigo(p,site).filter(v=>v.nivel==='bloqueio'&&['arquivo','atualizar'].includes(v.id)).map(v=>v.detalhe));
  return falhas;
}
export function triagemPublicacao(p: PautaEditorial, site: SiteEditorial): string[] {
  const falhas = bloqueiosProducao(p, site);
  if(p.texto?.imagem&&(!p.texto.imagem.alt?.trim()||!p.texto.imagem.titulo?.trim()))falhas.push('Completa o título e o texto alternativo da imagem destacada.');
  if (!p.texto || p.texto.corpo.trim().length < 500) falhas.push('Texto insuficiente ou ainda não produzido.');
  if (!p.texto?.afirmacoes.length) falhas.push('Falta o mapa de afirmações e fontes.');
  if (p.texto && (!p.texto.titulo.trim() || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.texto.slug))) falhas.push('Confirma o título e um slug válido, sem espaços ou acentos.');
  const ids = new Set(p.fontes.filter(f => f.aprovada).map(f => f.id));
  if (p.texto?.afirmacoes.some(a => a.trecho.trim().length < 20 || !a.fonteIds.length || a.fonteIds.some(id => !ids.has(id)))) falhas.push('Há afirmações sem fonte válida.');
  const citacoes=[...(p.texto?.corpo??'').matchAll(/\[fonte:([^\]]+)\]/g)].map(m=>m[1]);
  if(p.texto&&(!citacoes.length||citacoes.some(id=>!ids.has(id))))falhas.push('Confirma as referências [fonte:ID] no corpo do artigo.');
  if (p.texto?.alertas.length) falhas.push(...p.texto.alertas.map(a => `Revisão necessária: ${a}`));
  falhas.push(...verificarArtigo(p,site).filter(v=>v.nivel==='bloqueio').map(v=>v.detalhe));
  return [...new Set(falhas)];
}
export function exigeRevisao(p: PautaEditorial, s: SiteEditorial): boolean {
  const t = normalizarSeo(`${p.titulo} ${p.contributo} ${p.texto?.corpo ?? ''}`);
  return verificarArtigo(p,s).some(v=>v.nivel!=='ok') || s.revisaoObrigatoria || s.politica.publicacao === 'humana' || s.politica.temasExcluidos.some(x => t.includes(normalizarSeo(x))) || /\b(rgpd|gdpr|legal|juridic[oa]s?|legislacao|salarios?|subsidios?|apoios? publicos?|eu fiz|meus clientes)\b/.test(t);
}
export function slotLocal(agora: Date, site: SiteEditorial): { id: string; dia: string; hora: string; semana: string } | null {
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(agora);
  const val = (tipo: string) => partes.find(p => p.type === tipo)!.value;
  const dia = `${val('year')}-${val('month')}-${val('day')}`, hora = `${val('hour')}:${val('minute')}`;
  const data = new Date(`${dia}T12:00:00Z`), dow = data.getUTCDay();
  if (!site.politica.dias.includes(dow) || hora < site.politica.hora) return null;
  data.setUTCDate(data.getUTCDate() - (dow + 6) % 7);
  return { id: `${site.id}:${dia}:${site.politica.hora}`, dia, hora, semana: data.toISOString().slice(0, 10) };
}
export function validarConfig(c: ConfigGeralSeo) { schemaConfiguracaoSeo.parse(c); if (c.diarioMicro > c.mensalMicro || c.pedidoMicro > c.diarioMicro) throw new Error('Os limites devem respeitar pedido ≤ diário ≤ mensal.'); }
