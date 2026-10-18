import { z } from 'zod';
import type { SiteEditorial } from '../seo/contratos';
export const TIPOS_PECA = ['artigo', 'newsletter', 'story', 'carrossel', 'continuidade'] as const;
export type TipoPeca = typeof TIPOS_PECA[number];
export const NOMES_PECA: Record<TipoPeca, string> = { artigo: 'Artigo', newsletter: 'Destaque na newsletter', story: 'Story', carrossel: 'Carrossel', continuidade: 'Continuidade' };
const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Escolhe uma data válida.').refine(v => { const d = new Date(`${v}T12:00:00Z`); return Number.isFinite(+d) && d.toISOString().slice(0,10) === v; }, 'Escolhe uma data válida.');
export const schemaFonteCampanha = z.object({ tipo: z.enum(['noticia','documento']), id: z.string().min(1).max(100), titulo: z.string().trim().min(3).max(300), texto: z.string().trim().min(40, 'A descoberta precisa de pelo menos 40 caracteres de texto.').max(20000), url: z.string().max(2000).nullable(), hash: z.string().min(1).max(120), parcial: z.boolean(), paginas: z.array(z.number().int().positive()).max(600), capturadaEm: z.string().datetime() }).strict();
export type FonteCampanha = z.infer<typeof schemaFonteCampanha>;
export const schemaNovaCampanha = z.object({ siteId: z.string().min(1).max(80), nome: z.string().trim().min(5).max(200), angulo: z.string().trim().min(40,'Explica o contributo próprio em pelo menos 40 caracteres.').max(4000), objetivo: z.string().trim().min(10).max(2000), cta: z.string().trim().min(10).max(1500), inicio: data }).strict();
export type NovaCampanha = z.infer<typeof schemaNovaCampanha>;
export const schemaPecaCampanha = z.object({ titulo: z.string().trim().min(3).max(200), papel: z.string().trim().min(10).max(1000), texto: z.string().trim().min(10).max(8000), cta: z.string().trim().min(3).max(1500), diasDepois: z.number().int().min(0).max(60) }).strict();
export type EdicaoPeca = z.infer<typeof schemaPecaCampanha>;
export interface PecaCampanha extends EdicaoPeca {
  tipo: TipoPeca; versao: number; pautaId?: string;
  composicao?: { id: string; base: string };
  revisao: { assinatura: string; em: string } | null;
}
export interface Campanha extends NovaCampanha { id: string; versao: number; fonte: FonteCampanha; fonteConfirmadaEm: string | null; politicaRevista: number; criadoEm: string; alteradoEm: string; pecas: PecaCampanha[] }
export const schemaCampanhaGuardada = schemaNovaCampanha.extend({ id: z.string().uuid(), versao: z.number().int().positive(), fonte: schemaFonteCampanha, fonteConfirmadaEm: z.string().datetime().nullable(), politicaRevista: z.number().int().positive(), criadoEm: z.string().datetime(), alteradoEm: z.string().datetime(), pecas: z.array(schemaPecaCampanha.extend({ tipo: z.enum(TIPOS_PECA), versao: z.number().int().positive(), pautaId: z.string().uuid().optional(), composicao: z.object({ id:z.string().uuid(), base:z.string().min(1).max(120) }).strict().optional(), revisao: z.object({ assinatura:z.string(), em:z.string().datetime() }).strict().nullable() }).strict()).length(5).refine(v => new Set(v.map(p=>p.tipo)).size===5, 'Cada peça deve ter um papel único.') }).strict();
export async function assinaturaCampanha(v: unknown): Promise<string> { const h = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(v))); return Array.from(new Uint8Array(h),b=>b.toString(16).padStart(2,'0')).join(''); }
export async function prepararDescoberta(d: Omit<FonteCampanha,'hash'|'capturadaEm'>): Promise<FonteCampanha> {
  let url: string | null = null;
  if (d.url) { try { const u=new URL(d.url); if(u.protocol==='https:'&&!u.username&&!u.password&&(!u.port||u.port==='443')) { u.hash='';url=u.href; } } catch { /* Source without a public HTTPS reference remains unverified. */ } }
  const valor={tipo:d.tipo,id:d.id,titulo:d.titulo.trim(),texto:d.texto.trim(),url,parcial:d.parcial,paginas:[...new Set(d.paginas)].sort((a,b)=>a-b)};
  return schemaFonteCampanha.parse({...valor,hash:await assinaturaCampanha(valor),capturadaEm:new Date().toISOString()}) as FonteCampanha;
}
export const schemaRascunhoNova=z.object({siteId:z.string().max(80),nome:z.string().max(200),angulo:z.string().max(4000),objetivo:z.string().max(2000),cta:z.string().max(1500),inicio:z.string().max(10)}).strict();
export const schemaRascunhoPeca=z.object({titulo:z.string().max(200),papel:z.string().max(1000),texto:z.string().max(8000),cta:z.string().max(1500),diasDepois:z.number().int().min(0).max(60)}).strict();
export function diaPeca(inicio: string, dias: number): string { const d=new Date(`${inicio}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+dias);return d.toISOString().slice(0,10); }
export function dataCampanha(d: string) { return new Date(`${d}T12:00:00Z`).toLocaleDateString('pt-PT',{day:'2-digit',month:'short',year:'numeric',timeZone:'Europe/Lisbon'}); }
export function regraPeca(p: PecaCampanha, s: SiteEditorial) { return p.tipo!=='artigo' ? 'Revisão humana · este canal mantém a sua aprovação própria' : s.revisaoObrigatoria||s.politica.publicacao==='humana' ? 'Aprovação humana obrigatória no editor do artigo' : 'Política automática do site, sujeita aos controlos do artigo'; }
export function dadosRevisao(c: Campanha,p: PecaCampanha,s: SiteEditorial) { return {fonte:c.fonte.hash,confirmada:c.fonteConfirmadaEm,site:s.id,politica:s.politica,voz:s.voz,publico:s.publico,oferta:s.oferta,objetivo:s.objetivo,inicio:c.inicio,angulo:c.angulo,peca:{...p,revisao:undefined}}; }
export function baseComposicao(p: PecaCampanha) { return {titulo:p.titulo,texto:p.texto,cta:p.cta}; }
export function criarPecas(f: FonteCampanha, n: NovaCampanha): PecaCampanha[] {
  const sexta=(5-new Date(`${n.inicio}T12:00:00Z`).getUTCDay()+7)%7;
  const criar=(tipo:TipoPeca,papel:string,texto:string,diasDepois:number,titulo=f.titulo):PecaCampanha=>({tipo,titulo:titulo.slice(0,200),papel,texto,cta:n.cta,diasDepois,versao:1,revisao:null});
  const pecas = [
    criar('artigo','Aprofundar a descoberta, responder a uma necessidade e captar tráfego orgânico.',`Contributo proposto: ${n.angulo}\n\nPúblico e objetivo: ${n.objetivo}\n\nPreparar uma estrutura, verificar as fontes e distinguir factos, limites e aplicação prática. Não transformar esta proposta num relato de experiência pessoal.`,0,n.nome),
    criar('newsletter','Dar contexto à descoberta e convidar a aprofundar no artigo.',`Descoberta para contextualizar: ${f.titulo}\n\nÂngulo editorial proposto: ${n.angulo}\n\nAcrescentar uma síntese factual após a revisão da fonte e ligar ao artigo quando existir um URL publicado.`,sexta),
    criar('story','Criar curiosidade e encaminhar para a leitura, com ligação confirmada.',`O que pode esta descoberta mudar no teu trabalho?\n\n${n.angulo}\n\nConsulta a fonte e aprofunda o tema.`,0),
    criar('carrossel','Explicar o essencial e incentivar a guardar, partilhar e subscrever.',`A descoberta\n${f.titulo}\n\nO que vale a pena perceber\n${n.angulo}\n\nAntes de aplicar\nQue evidência existe? Quais são os limites? O que faz sentido no teu contexto?`,1),
    criar('continuidade','Retomar o tema com uma pergunta prática e recolher dúvidas para novo conteúdo.',`Depois desta descoberta, que decisão merece ser revista?\n\n1. Que processo pode beneficiar?\n2. Que evidência falta confirmar?\n3. Qual é o primeiro teste pequeno que faz sentido?\n\nPartilha a tua dúvida para aprofundarmos o tema.`,3,`Como aplicar: ${n.nome}`.slice(0,200)),
  ];
  const convites:Partial<Record<TipoPeca,string>>={newsletter:'Lê o artigo completo quando estiver publicado.',story:'Explora o tema na newsletter. Ligação no perfil.',carrossel:'Subscreve a newsletter DIGITALSPRINT.',continuidade:'Partilha a tua dúvida nos comentários.'};
  return pecas.map(p=>({...p,cta:convites[p.tipo]??p.cta}));
}
