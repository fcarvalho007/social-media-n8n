import type { FonteEditorial } from './contratos';
import { z } from 'zod';
import { schemaFonteConhecimento } from './sequencia';
export const schemaTermo=z.object({id:z.string().uuid(),termo:z.string().trim().min(2).max(80),slug:z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(160),definicao:z.string().max(5000),exemplo:z.string().max(3000),exemploAprovado:z.boolean(),fonteIds:z.array(z.string().max(80)).max(8),relacionados:z.array(z.string().uuid()).max(20)}).strict();
export const schemaGlossario=z.object({id:z.string().uuid(),versao:z.number().int().nonnegative(),siteId:z.string().min(1).max(80),nome:z.string().trim().min(3).max(200),palavra:z.string().trim().min(2).max(80),slug:z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(160),descricao:z.string().max(2000),fontes:z.array(schemaFonteConhecimento).max(8),termos:z.array(schemaTermo).max(100),criadoEm:z.string().optional(),alteradoEm:z.string().optional()}).strict();
export type Glossario=Omit<z.infer<typeof schemaGlossario>,'fontes'> & {fontes:FonteEditorial[]};
export type TermoGlossario=z.infer<typeof schemaTermo>;
export const slugConceito=(s:string)=>s.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,160);
export function falhasGlossario(g:Glossario,termoId?:string|null){
 const termos=termoId?g.termos.filter(t=>t.id===termoId):g.termos,erros:string[]=[];
 if(!termos.length)erros.push('Acrescenta pelo menos um conceito.');
 for(const t of termos){if(t.definicao.trim().length<100)erros.push(`${t.termo}: desenvolve a definição em pelo menos 100 caracteres.`);if(t.exemplo.trim().length<40||!t.exemploAprovado)erros.push(`${t.termo}: escreve e confirma um exemplo próprio.`);if(!t.fonteIds.length||t.fonteIds.some(id=>!g.fontes.some(f=>f.id===id&&f.aprovada&&f.excerto.length>=200&&f.verificadaEm)))erros.push(`${t.termo}: associa fontes aprovadas à definição.`);}
 return erros;
}
export function jsonLdGlossario(g:Glossario){return{'@context':'https://schema.org','@type':'DefinedTermSet',name:g.nome,description:g.descricao,hasDefinedTerm:g.termos.map(t=>({'@type':'DefinedTerm',name:t.termo,description:t.definicao,termCode:t.slug}))};}
