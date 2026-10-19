import { FONTE_DOC, validarPacote, type CamadaTexto, type PacoteProva, type Pagina } from '../../../supabase/functions/_shared/documento-grafico/nucleo';
import { dividirTexto } from '../../../supabase/functions/_shared/conteudos/carrossel';
import { TINTAS } from '../../../supabase/functions/_shared/conteudos/apresentacao';
import { ENDERECO_SUBSCRICAO } from '../../../supabase/functions/_shared/conteudos/carrossel';
import type { Campanha, PecaCampanha } from './modelo';
import type { SiteEditorial } from '../seo/contratos';
const txt=(id:string,valor:string,x:number,y:number,w:number,h:number,tam:number,cor:string,peso:400|700=400,ref?:string):CamadaTexto=>({id,nome:id,tipo:'texto',...(ref?{ref}:{texto:valor}),x,y,w,h,z:2,estilo:{familia:peso===700?'grotesk':'inter',peso,tam,tamMin:Math.max(24,Math.floor(tam*.72)),linha:1.15,alinh:'esq',cor,overflow:'reduzir'}});
export function impedimentosComposicaoCampanha(p:Pick<PecaCampanha,'tipo'|'texto'|'cta'>){if(p.tipo==='artigo'||p.tipo==='newsletter')return[];const partes=dividirTexto(p.texto,p.tipo==='carrossel'?180:500),falhas:string[]=[];if(p.tipo!=='carrossel'&&p.cta.length>220)falhas.push('Encurta o próximo passo para até 220 caracteres antes de criar a composição.');if(p.tipo!=='carrossel'&&partes.length>1)falhas.push('Esta peça visual precisa de texto com até 500 caracteres. Encurta-o ou pede uma alternativa à IA.');if(p.tipo==='carrossel'&&partes.length+2>20)falhas.push('O texto precisa de mais de 20 slides. Encurta-o antes de preparar a composição.');return falhas;}
/** Reuses the incumbent editable document and renderer. No portrait, AI or invented facts. */
export function comporCampanha(c: Campanha,p: PecaCampanha,s: SiteEditorial): PacoteProva {
  if(p.tipo==='artigo'||p.tipo==='newsletter')throw new Error('Esta peça usa o editor de texto.');
  const impedimentos=impedimentosComposicaoCampanha(p);if(impedimentos.length)throw new Error(impedimentos.join(' ')+' O texto foi preservado.');
  const story=p.tipo==='story', altura=story?1920:1350, formato=story?'story':p.tipo==='carrossel'?'carrossel':'post';
  const partes=dividirTexto(p.texto,p.tipo==='carrossel'?180:500);
  if(p.tipo!=='carrossel'&&partes.length>1)throw new Error('Para esta peça visual usa até 500 caracteres; o texto completo foi preservado na campanha.');
  const slides=p.tipo==='carrossel'?[{id:'s1',titulo:p.titulo,texto:'Uma descoberta para compreender, avaliar e aplicar.'},...partes.map((texto,i)=>({id:`s${i+2}`,titulo:i===0?'O que está em causa':'Antes de aplicar',texto})),{id:`s${partes.length+2}`,titulo:'Continua a aprender',texto:'Subscreve a newsletter DIGITALSPRINT.\npodes.entrar.pt/news'}]:[{id:'s1',titulo:p.titulo,texto:p.texto}];
  if(slides.length>20)throw new Error('Este texto precisa de mais de 20 slides. Encurta-o antes de recriar a composição.');
  const paginas:Pagina[]=slides.map((sl,i)=>{
    const escuro=i===0||i===slides.length-1,cor=escuro?TINTAS.branco:TINTAS.tinta;
    const origem=c.fonteConfirmadaEm?(c.fonte.url?new URL(c.fonte.url).hostname:c.fonte.tipo==='texto'?'Conteúdo fornecido':c.fonte.tipo==='documento'?'PDF privado · origem confirmada':'Fonte por verificar'):'Fonte por verificar';
    const fonte=txt('Origem',origem,72,story?1615:altura-190,920,38,26,escuro?TINTAS.suave:TINTAS.tinta);
    let camadas:Pagina['camadas']=[txt('Marca',s.nome,72,story?270:72,920,65,34,escuro?TINTAS.lima:TINTAS.tinta,700),txt('Título','',72,story?390:215,936,story?500:460,sl.titulo.length>100?58:80,cor,700,`${sl.id}.titulo`),txt('Texto','',72,story?980:720,936,story?460:360,story?44:46,cor,400,`${sl.id}.texto`),fonte,txt('Página',`${i+1} / ${slides.length}`,850,altura-100,170,40,26,cor)];
    if(p.tipo!=='carrossel')camadas.push(txt('Próximo passo',p.cta,72,story?1490:1050,920,story?100:90,36,escuro?TINTAS.lima:TINTAS.tinta,700));
    if(p.tipo==='carrossel'&&i===slides.length-1)camadas=[txt('Marca',s.nome,72,72,936,65,34,TINTAS.lima,700),txt('Título','',72,230,936,350,96,TINTAS.branco,700,`${sl.id}.titulo`),txt('Convite','Recebe novas leituras na newsletter DIGITALSPRINT.',72,660,936,190,54,TINTAS.suave),{id:'Faixa de subscrição',nome:'Faixa de subscrição',tipo:'forma',forma:'ret',x:64,y:930,w:952,h:170,z:1,estilo:{cor:TINTAS.lima}},txt('Subscrever','Subscreve a newsletter',92,950,896,55,36,TINTAS.tinta,700),txt('Endereço de subscrição',ENDERECO_SUBSCRICAO,92,1015,896,75,62,TINTAS.tinta,700),txt('Página',`${i+1} / ${slides.length}`,850,1250,170,40,26,TINTAS.branco)];
    return{id:`p${i+1}`,slide:sl.id,fundo:escuro?TINTAS.tinta:TINTAS.papel,papel:i===0?'cover':i===slides.length-1?'conclusion':'standard',camadas};
  });
  const doc={v:1 as const,largura:1080 as const,altura,formato,fonte:FONTE_DOC,paginas};
  return validarPacote({v:1,id:`${c.id}:${p.tipo}`,nome:`${s.nome} · ${p.tipo}`.slice(0,120),sintetico:false,conteudo:{slides},assets:{},variantes:{A:{...doc,variante:'A'},B:{...structuredClone(doc),variante:'B'}}},{real:true});
}
