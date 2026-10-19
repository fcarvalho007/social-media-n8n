import type { JSONContent } from '@tiptap/react';
export function urlImagem(v:string){try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
export function urlLigacao(v:string){return /^#[a-z0-9][a-z0-9-]{0,159}$/.test(v)?v:urlImagem(v);}
export function inlineArtigo(s:string):JSONContent[]{
 const re=/!\[[^\]]*\]\(https:\/\/[^\s)]+\)|\[[^\]]+\]\((?:https:\/\/[^\s)]+|#[a-z0-9][a-z0-9-]{0,159})\)|\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*\n]+\*/g;
 const out:JSONContent[]=[];let cursor=0;
 const texto=(v:string)=>{v.split('\n').forEach((t,i)=>{if(i)out.push({type:'hardBreak'});if(t)out.push({type:'text',text:t});});};
 for(const m of s.matchAll(re)){texto(s.slice(cursor,m.index));cursor=m.index!+m[0].length;const t=m[0],img=t.match(/^!\[([^\]]*)\]\(([^)]+)\)$/),link=t.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
  if(img&&urlImagem(img[2]))out.push({type:'image',attrs:{src:img[2],alt:img[1]}});
  else if(link&&urlLigacao(link[2]))out.push(...inlineArtigo(link[1]).map(n=>n.type==='text'?{...n,marks:[...(n.marks??[]),{type:'link',attrs:{href:link[2]}}]}:n));
  else if(t.startsWith('*')){const tripla=t.startsWith('***'),dupla=t.startsWith('**'),limite=tripla?3:dupla?2:1,marks=tripla?[{type:'bold'},{type:'italic'}]:[{type:dupla?'bold':'italic'}];out.push(...inlineArtigo(t.slice(limite,-limite)).map(n=>n.type==='text'?{...n,marks:[...(n.marks??[]),...marks]}:n));}else texto(t);
 }texto(s.slice(cursor));return out;
}

export function documentoArtigo(s:string):JSONContent{
 return{type:'doc',content:s.split(/\n\s*\n/).filter(Boolean).flatMap((b):JSONContent[]=>{
 const img=b.match(/^!\[([^\]]*)\]\((https:\/\/[^\s)]+)\)$/);if(img&&urlImagem(img[2]))return[{type:'image',attrs:{src:img[2],alt:img[1]}}];
 const h=b.match(/^(#{1,3})\s+([^\n]+)$/);if(h){const a=h[2].match(/^(.*?) \{#([a-z0-9][a-z0-9-]{0,159})\}$/);return[{type:'heading',attrs:{level:h[1].length,...(a?{id:a[2]}:{})},content:inlineArtigo(a?a[1]:h[2])}];}
 const lines=b.split('\n');if(lines.every(l=>/^[-*] /.test(l)))return[{type:'bulletList',content:lines.map(l=>({type:'listItem',content:[{type:'paragraph',content:inlineArtigo(l.slice(2))}]}))}];
 if(lines.every(l=>/^\d+\. /.test(l)))return[{type:'orderedList',attrs:{start:Number(lines[0].match(/^\d+/)![0])},content:lines.map(l=>({type:'listItem',content:[{type:'paragraph',content:inlineArtigo(l.replace(/^\d+\. /,''))}]}))}];
 if(lines.every(l=>/^> ?/.test(l)))return[{type:'blockquote',content:[{type:'paragraph',content:inlineArtigo(lines.map(l=>l.replace(/^> ?/,'')).join('\n'))}]}];
 return[{type:'paragraph',content:inlineArtigo(b)}];
 })};
}
export function markdownArtigo(node:JSONContent):string{
 const inline=(n:JSONContent):string=>{if(n.type==='hardBreak')return'\n';if(n.type==='image')return`![${String(n.attrs?.alt??'').replace(/[\]\n]/g,'')}](${urlImagem(n.attrs?.src??'')??''})`;let t=n.text??(n.content??[]).map(inline).join('');for(const m of n.marks??[]){if(m.type==='bold')t=`**${t}**`;if(m.type==='italic')t=`*${t}*`;if(m.type==='link'&&urlLigacao(m.attrs?.href??''))t=`[${t}](${m.attrs!.href})`;}return t;};
 if(node.type==='doc')return(node.content??[]).map(markdownArtigo).join('\n\n');
 if(node.type==='heading')return`${'#'.repeat(node.attrs?.level??2)} ${(node.content??[]).map(inline).join('')}${node.attrs?.id&&urlLigacao('#'+node.attrs.id)?` {#${node.attrs.id}}`:''}`;
 if(node.type==='bulletList'||node.type==='orderedList')return(node.content??[]).map((n,i)=>`${node.type==='orderedList'?`${(node.attrs?.start??1)+i}.`:'-'} ${(n.content??[]).map(markdownArtigo).join('\n')}`).join('\n');
 if(node.type==='blockquote')return(node.content??[]).map(markdownArtigo).join('\n').split('\n').map(l=>`> ${l}`).join('\n');
 return inline(node);
}

const esc=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
export function htmlMarkdownArtigo(corpo:string,fontes:import('./contratos').FonteEditorial[],exigirFontes=false):string{
 const render=(n:JSONContent):string=>{
  const filhos=()=> (n.content??[]).map(render).join('');
  if(n.type==='text'){
   let t='',cursor=0;for(const m of (n.text??'').matchAll(/\[fonte:([^\]]+)\]/g)){t+=esc(n.text!.slice(cursor,m.index));cursor=m.index!+m[0].length;const f=fontes.find(f=>f.id===m[1]&&(!exigirFontes||f.aprovada));if(!f){if(exigirFontes)throw new Error('Fonte desconhecida no artigo.');t+=esc(m[0]);continue;}
   if(f.documento&&!f.url)t+=`<cite>[${esc(f.titulo)} · PDF, páginas ${f.documento.paginas.join(', ')}]</cite>`;
   else if(urlImagem(f.url))t+=`<a href="${esc(urlImagem(f.url)!)}" rel="noopener noreferrer">[${esc(f.titulo||f.id)}]</a>`;
   else if(exigirFontes)throw new Error('Fonte inválida.');else t+=esc(m[0]);}
   t+=esc((n.text??'').slice(cursor));for(const m of n.marks??[]){if(m.type==='bold')t=`<strong>${t}</strong>`;if(m.type==='italic')t=`<em>${t}</em>`;if(m.type==='link'&&urlLigacao(m.attrs?.href??''))t=`<a href="${esc(urlLigacao(m.attrs!.href)!)}" rel="noopener noreferrer">${t}</a>`;}return t;
  }
  if(n.type==='hardBreak')return'<br>';
  if(n.type==='image')return urlImagem(n.attrs?.src??'')?`<figure><img src="${esc(urlImagem(n.attrs!.src)!)}" alt="${esc(n.attrs?.alt??'')}" loading="lazy"></figure>`:'';
  if(n.type==='listItem'&&n.content?.length===1&&n.content[0].type==='paragraph')return`<li>${(n.content[0].content??[]).map(render).join('')}</li>`;
  if(n.type==='doc')return(n.content??[]).map(render).join('\n');
  const tag=n.type==='heading'?`h${Math.min(3,Math.max(2,n.attrs?.level??2))}`:({paragraph:'p',bulletList:'ul',orderedList:'ol',listItem:'li',blockquote:'blockquote'} as Record<string,string>)[n.type??'']??'p';return`<${tag}${n.type==='heading'&&n.attrs?.id&&urlLigacao('#'+n.attrs.id)?` id="${esc(n.attrs.id)}"`:''}${n.type==='orderedList'&&n.attrs?.start>1?` start="${Number(n.attrs.start)}"`:''}>${filhos()}</${tag}>`;
 };return render(documentoArtigo(corpo));
}
