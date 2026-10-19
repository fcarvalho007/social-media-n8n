import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { prepararDescoberta, TIPOS_PECA, assinaturaCampanha, baseComposicao, type FonteCampanha } from '../../src/features/campanhas/modelo';
import type { ContextoBackend } from './seguranca';
import type { EstadoSeo } from '../../src/features/seo/contratos';
import { CampanhasEditorial } from '../seo/campanhas';
import type { MotorSeo } from '../seo/motor-local';
export async function fonteCampanhaNuvem(ctx:ContextoBackend,bruto:unknown):Promise<FonteCampanha>{
  const ref=z.object({tipo:z.enum(['noticia','documento']),id:z.string().uuid(),paginas:z.array(z.number().int().positive()).max(600).default([])}).parse(bruto);
  if(ref.tipo==='noticia'){
    const r=await ctx.user.rpc('nl_curadoria_snapshot',{_id:ref.id});
    if(r.error||!r.data)throw new Error('A notícia não está disponível. Confirma que está aprovada na Curadoria.');
    const f=r.data as {titulo:string;texto:string;url:string|null;parcial:boolean;nivel:string};
    return prepararDescoberta({tipo:'noticia',id:ref.id,titulo:f.titulo,texto:f.texto,url:f.url,parcial:f.parcial||f.nivel==='resumo',paginas:[]});
  }
  if(!ref.paginas.length)throw new Error('Seleciona as páginas do estudo.');
  const r=await ctx.user.from('hub_documentos').select('dados').eq('project_id',ctx.projeto).eq('id',ref.id).maybeSingle();
  if(r.error||!r.data)throw new Error('O estudo não está disponível neste projeto.');
  const d=r.data.dados as {titulo:string;origem:string|null;processamento?:{estado:string};pdf:{paginas:{n:number;texto:string;estado?:string}[]}};
  const paginas=d.pdf.paginas.filter(p=>ref.paginas.includes(p.n)&&p.texto.trim());
  if(new Set(paginas.map(p=>p.n)).size!==new Set(ref.paginas).size)throw new Error('Há páginas selecionadas sem texto disponível. Revê o estudo.');
  return prepararDescoberta({tipo:'documento',id:ref.id,titulo:d.titulo,url:d.origem,texto:paginas.map(p=>`[Página ${p.n}]\n${p.texto}`).join('\n\n'),paginas:paginas.map(p=>p.n),parcial:paginas.length<d.pdf.paginas.length||d.processamento?.estado==='a_processar'});
}
export async function lerComposicaoCampanha(ctx:ContextoBackend,e:EstadoSeo,a:Record<string,unknown>,servico:SupabaseClient){
  const id=z.string().uuid().parse(a.id),tipo=z.enum(TIPOS_PECA).parse(a.tipo),c=e.campanhas?.find(c=>c.id===id),p=c?.pecas.find(p=>p.tipo===tipo);
  if(!p?.composicao)throw new Error('Composição não encontrada neste projeto.');
  // Artefacts remain service-only. The caller first reads this project's state through user RLS.
  // Accept only the stored piece reference; never an artefact id supplied by the browser.
  const r=await servico.from('hub_editorial_artefactos').select('dados').eq('project_id',ctx.projeto).eq('tipo','resultado').eq('chave',p.composicao.id).maybeSingle();
  if(r.error||!r.data)throw new Error('Não foi possível abrir a composição.');
  return{pacote:r.data.dados,versao:c!.versao,base:await assinaturaCampanha(baseComposicao(p)),baseGuardada:p.composicao.base};
}
export function operarCampanha(m:MotorSeo,acao:string,a:Record<string,unknown>){
  const motor=new CampanhasEditorial(m.repo),id=()=>z.string().uuid().parse(a.id),versao=()=>z.number().int().positive().parse(a.versao),tipo=()=>z.enum(TIPOS_PECA).parse(a.tipo);
  switch(acao){
    case'campanha-criar':return motor.criar(a.fonte,a.plano,a.confirmacao===true);
    case'campanha-peca':return motor.alterar(id(),versao(),tipo(),a.peca);
    case'campanha-fonte-confirmar':return motor.confirmarFonte(id(),versao(),a.confirmacao===true);
    case'campanha-rever':return motor.rever(id(),versao(),tipo(),a.confirmacao===true);
    case'campanha-artigo':return motor.artigo(id(),versao());
    case'campanha-compor':return motor.compor(id(),versao(),tipo());
    case'campanha-recompor':if(a.confirmacao!==true)throw new Error('Confirma a substituição da composição guardada.');return motor.compor(id(),versao(),tipo(),true);
    case'campanha-composicao-guardar':return motor.guardarComposicao(id(),versao(),tipo(),a.pacote,z.string().max(120).parse(a.base));
    case'campanha-composicao':return motor.composicao(id(),tipo());
    default:throw new Error('Operação de campanha desconhecida.');
  }
}
