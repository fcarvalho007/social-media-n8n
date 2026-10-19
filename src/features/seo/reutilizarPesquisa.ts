import type { PesquisaGuardada, PesquisaSeo } from './contratos';
import { normalizarSeo } from './politicas';
/** Reuse is explicit about its original query/operation; never relabel saved metrics as fresh. */
export function encontrarPesquisaGuardada(p:PesquisaSeo,biblioteca:PesquisaGuardada[]){
 if(p.renovar||p.modo!=='real')return null;
 const termos=p.termos.map(normalizarSeo),dominio=(v:string)=>v.trim().toLowerCase().replace(/^https?:\/\//,'').replace(/\/$/,'');
 return [...biblioteca].sort((a,b)=>b.recolhidaEm.localeCompare(a.recolhidaEm)).find(r=>{
  if(r.pedido.modo!=='real'||r.pedido.mercado!==p.mercado)return false;
  if(p.operacao==='visao')return termos.every(t=>r.dados.palavras.some(k=>normalizarSeo(k.palavra)===t));
  if(r.pedido.operacao!==p.operacao)return false;
  if(p.operacao==='dominio'||p.operacao==='lacunas')return dominio(r.pedido.dominio)===dominio(p.dominio)&&(p.operacao!=='lacunas'||dominio(r.pedido.concorrente)===dominio(p.concorrente));
  if(p.operacao==='volume')return termos.every(t=>r.dados.palavras.some(k=>normalizarSeo(k.palavra)===t));
  return [...r.pedido.termos].map(normalizarSeo).sort().join('\n')===[...termos].sort().join('\n');
 })??null;
}
