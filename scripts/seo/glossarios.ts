import { assinaturaPauta } from './editorial';
import { createHash, randomUUID } from 'node:crypto';
import type { ArmazemSeo } from './persistencia';
import { schemaGlossario, falhasGlossario, type Glossario } from '../../src/features/seo/glossarios';
import type { PautaEditorial, TextoEditorial } from '../../src/features/seo/contratos';
import { normalizarSeo } from '../../src/features/seo/politicas';
import { guiaInicial } from '../../src/features/seo/sequencia';
export class GlossariosEditorial{
 constructor(private repo:ArmazemSeo){}
 async guardar(bruto:unknown){const g=schemaGlossario.parse(bruto) as Glossario;return this.repo.alterar(e=>{
  if(JSON.stringify(g).length>250000)throw new Error('Esta biblioteca é extensa. Divide-a em glossários mais pequenos para manter a edição rápida.');
  if(!e.sites.some(s=>s.id===g.siteId))throw new Error('Site não encontrado.');const a=e.glossarios?.find(x=>x.id===g.id);if((a?.versao??0)!==g.versao||a&&a.siteId!==g.siteId)throw new Error('O glossário mudou ou pertence a outro destino. Reabre a versão guardada.');
  if(new Set(g.termos.map(t=>normalizarSeo(t.termo))).size!==g.termos.length||new Set(g.termos.map(t=>t.slug)).size!==g.termos.length||new Set(g.termos.map(t=>t.id)).size!==g.termos.length)throw new Error('Cada conceito precisa de nome, endereço e identificador únicos.');
  const ids=new Set(g.termos.map(t=>t.id)),fontes=new Set(g.fontes.map(f=>f.id));if(fontes.size!==g.fontes.length)throw new Error('Cada fonte precisa de identificador único.');
  if(g.termos.some(t=>t.relacionados.some(id=>!ids.has(id)||id===t.id)||t.fonteIds.some(id=>!fontes.has(id))))throw new Error('Confirma as relações entre conceitos e as fontes do glossário.');
  for(const f of g.fontes)if(f.aprovada&&(!Number.isFinite(Date.parse(f.verificadaEm))||Date.parse(f.verificadaEm)>Date.now()+300000||f.excerto.trim().length<200))throw new Error('Confirma o excerto e a data das fontes aprovadas.');
  const v={...g,versao:g.versao+1,criadoEm:a?.criadoEm??new Date().toISOString(),alteradoEm:new Date().toISOString()};if(a)e.glossarios![e.glossarios!.findIndex(x=>x.id===g.id)]=v;else{if((e.glossarios?.length??0)>=100)throw new Error('Limite de 100 glossários por projeto.');(e.glossarios??=[]).push(v);}return v;
 });}
 async preparar(id:string,versao:number,termoId:string|null){return this.repo.alterar(e=>{
 const g=e.glossarios?.find(g=>g.id===id);if(!g||g.versao!==versao)throw new Error('Reabre a versão atual do glossário.');const erros=falhasGlossario(g,termoId);if(erros.length)throw new Error(erros.join(' '));
 const termos=(termoId?g.termos.filter(t=>t.id===termoId):g.termos).slice().sort((a,b)=>a.termo.localeCompare(b.termo,'pt-PT')),site=e.sites.find(s=>s.id===g.siteId)!;
 const urlConfirmada=(t:string)=>{const p=e.pautas.find(p=>p.glossarioId===id&&p.glossarioTermoId===t);return p?[...(e.eventos??[])].reverse().find(v=>v.tipo==='artigo.publicado'&&v.artigoId===p.id&&v.siteId===site.id&&v.url)?.url:null;};
 const corpo=[g.descricao,...termos.map(t=>{const refs=t.fonteIds.map(id=>`[fonte:${id}]`).join(' '),rel=t.relacionados.map(id=>g.termos.find(v=>v.id===id)!).filter(Boolean).map(r=>{const url=urlConfirmada(r.id);return url?`[${r.termo}](${url})`:!termoId?`[${r.termo}](#${r.slug})`:r.termo;});return `## ${t.termo} {#${t.slug}}\n\n${t.definicao} ${refs}\n\n**Exemplo da minha prática**\n\n${t.exemplo}${rel.length?`\n\n**Conceitos relacionados:** ${rel.join(', ')}.`:''}`;})].filter(Boolean).join('\n\n');
 const fontes=g.fontes.filter(f=>termos.some(t=>t.fonteIds.includes(f.id)));
 if(corpo.length>60000||fontes.reduce((n,f)=>n+f.excerto.length,0)>40000)throw new Error('Este glossário é extenso. Prepara artigos individuais ou reduz os excertos das fontes.');
 const titulo=termoId?termos[0].termo:g.nome,palavra=termoId?termos[0].termo:g.palavra,slug=termoId?termos[0].slug:g.slug;
 const texto:TextoEditorial={titulo,resumo:g.descricao.slice(0,2000),slug,corpo,afirmacoes:termos.map(t=>({trecho:t.definicao,fonteIds:t.fonteIds})),alertas:[],seo:{titulo,descricao:g.descricao.slice(0,160),schema:'Article'}};
 const fingerprint=createHash('sha256').update(JSON.stringify([titulo,palavra,slug,corpo,fontes])).digest('hex');
 const anterior=e.pautas.find(p=>p.glossarioId===id&&(p.glossarioTermoId??null)===termoId);
 if(anterior){if(anterior.glossarioAssinatura===fingerprint||anterior.propostaGlossarioAssinatura===fingerprint&&anterior.proposta)return anterior;if(anterior.proposta||anterior.estado==='a_preparar')throw new Error('Revê a proposta existente antes de preparar outra.');texto.imagem=anterior.texto?.imagem??null;anterior.propostaGlossarioAssinatura=fingerprint;anterior.proposta=texto;anterior.propostaFontes=fontes;anterior.propostaBaseAssinatura=assinaturaPauta(anterior,site);anterior.estado='aguarda_revisao';anterior.motivo='Atualização do glossário proposta. O texto humano foi preservado.';return anterior;}
 if(e.pautas.some(p=>p.siteId===g.siteId&&normalizarSeo(p.palavra)===normalizarSeo(palavra)))throw new Error('Já existe um artigo para esta palavra-chave no site. Revê-o no plano.');
 const agora=new Date().toISOString(),p:PautaEditorial={id:randomUUID(),siteId:g.siteId,titulo,palavra,origem:'topico',contributo:'Biblioteca educativa com definições sustentadas, exemplos próprios confirmados e relações entre conceitos.',objetivo:site.objetivo,cta:site.oferta,fontes,pesquisaId:null,dataPretendida:'',modoOrigem:'manual',estado:'aguarda_revisao',versao:1,criadoEm:agora,alteradoEm:agora,texto,proposta:null,aprovacao:null,motivo:'Artigo preparado sem IA. Revê a peça antes de aprovar ou publicar.',producaoAutomaticaAutorizada:false,guia:{...guiaInicial,formato:'glossario'},glossarioAssinatura:fingerprint,glossarioId:id,glossarioTermoId:termoId};e.pautas.push(p);e.auditoria.push({id:randomUUID(),em:agora,acao:'glossario_artigo',alvo:id,detalhe:`${p.id} · ${createHash('sha256').update(corpo).digest('hex')}`});return p;
 });}
}
