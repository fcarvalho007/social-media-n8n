import type { JSONContent } from '@tiptap/react';
import { verificarArtigo, type VerificacaoEditorial } from './sequencia';
import type { PautaEditorial, SiteEditorial, TextoEditorial } from './contratos';
import { documentoArtigo } from './markdownArtigo';
export const expressaoTermo=(termo:string)=>new RegExp(`(?<![\\p{L}\\p{N}])${termo.trim().split(/\s+/).map(t=>t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('\\s+')}(?![\\p{L}\\p{N}])`,'giu');
export function contarTermo(texto:string,termo:string){return termo.trim()?Array.from(texto.normalize('NFC').matchAll(expressaoTermo(termo.normalize('NFC')))).length:0;}
export function analisarRedacao(t:TextoEditorial){
 const doc=documentoArtigo(t.corpo),subtitulos:{nivel:number;texto:string;indice:number}[]=[];let paragrafos=0,imagens=t.imagem?1:0;const textos:string[]=[];
 const ler=(n:JSONContent):string=>n.type==='text'?(n.text??'').replace(/\[fonte:[^\]]+\]/g,' ').replace(/https?:\/\/[^\s<>)]+/g,' '):n.type==='hardBreak'?' ':(n.content??[]).map(ler).join('');
 const visitar=(n:JSONContent)=>{if(n.type==='heading'){subtitulos.push({nivel:n.attrs?.level??2,texto:ler(n),indice:subtitulos.length});textos.push(ler(n));}else if(n.type==='paragraph'){if(ler(n).trim())paragrafos++;textos.push(ler(n));}else if(n.type==='image')imagens++;for(const f of n.content??[])visitar(f);};visitar(doc);
 const texto=textos.join('\n'),palavras=(texto.match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu)??[]).length;
 return{palavras,paragrafos,imagens,subtitulos,texto};
}
export function secoesEmFalta(corpo:string,secoes:{titulo:string}[]){const n=(v:string)=>v.normalize('NFC').trim().toLocaleLowerCase('pt-PT').replace(/\s+/g,' '),existentes=new Set(analisarRedacao({corpo} as TextoEditorial).subtitulos.map(h=>n(h.texto)));return secoes.filter(s=>!existentes.has(n(s.titulo)));}

export function verificacoesRedacao(p:PautaEditorial,site:SiteEditorial,outras:PautaEditorial[]=[]):VerificacaoEditorial[]{
 const t=p.texto,extras:VerificacaoEditorial[]=[
  {id:'keyword-definida',nome:'Focus keyword definida',nivel:p.palavra.trim().length>=2?'ok':'aviso',detalhe:'A expressão principal vem do plano deste artigo.'},
  {id:'keyword-titulo',nome:'Termo principal no título',nivel:contarTermo(t?.titulo??'',p.palavra)>0?'ok':'aviso',detalhe:'Correspondência literal no título editorial. Revê a clareza; não forces repetições para obter uma pontuação.'},
  {id:'fontes-confirmadas',nome:'Fontes confirmadas para o artigo',nivel:p.fontes.length>0&&p.fontes.every(f=>f.aprovada&&f.verificadaEm&&f.excerto.trim().length>=200)?'ok':'bloqueio',detalhe:'É necessária pelo menos uma fonte confirmada, com excerto de 200 caracteres. Isto regista a tua revisão, não certifica a verdade.'},
  {id:'imagens-alt',nome:'Descrições das imagens',nivel:(!t?.imagem||!!t.imagem.alt.trim())&&!/!\[\s*\]\(/.test(t?.corpo??'')?'ok':'aviso',detalhe:'As imagens existentes precisam de texto alternativo descritivo.'}
 ];return [...verificarArtigo(p,site,outras).map(v=>v.id==='resumo'?{...v,nivel:((t?.seo?.descricao??t?.resumo??'').trim().length>=50&&(t?.seo?.descricao??t?.resumo??'').trim().length<=180?'ok':'aviso') as VerificacaoEditorial['nivel'],detalhe:'Referência editorial: descrição útil entre 50 e 180 caracteres; não é um limite ou garantia do Google.'}:v),...extras];
}
