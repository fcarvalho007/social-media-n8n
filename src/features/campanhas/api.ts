import { apiSeo } from '../seo/api';
import { BACKEND_NUVEM } from '@/lib/backendHub';
import { lerFonteCuradoria } from '@/services/curadoria';
import { prepararDescoberta, type FonteCampanha } from './modelo';
export interface ReferenciaDescoberta { tipo:'noticia'|'documento';id:string;paginas:number[] }
export async function carregarDescoberta(ref:ReferenciaDescoberta,userId:string,projeto:string):Promise<FonteCampanha>{
  if(BACKEND_NUVEM)return apiSeo('campanha-fonte',{fonte:ref},{projeto});
  if(ref.tipo==='noticia'){const f=await lerFonteCuradoria(ref.id);return prepararDescoberta({tipo:'noticia',id:ref.id,titulo:f.titulo,texto:f.texto,url:f.url,parcial:f.parcial||f.nivel==='resumo',paginas:[]});}
  const { listarAcervo }=await import('../documentos/acervoLocal');
  const { ambitoAcervo }=await import('../documentos/modelo');
  const d=(await listarAcervo('documentos',ambitoAcervo(userId,projeto))).find(d=>'pdf' in d&&d.id===ref.id);
  if(!d||!('pdf' in d))throw new Error('O estudo não está disponível neste projeto do navegador.');
  const paginas=d.pdf.paginas.filter(p=>ref.paginas.includes(p.n)&&p.texto.trim());
  if(!paginas.length||new Set(paginas.map(p=>p.n)).size!==new Set(ref.paginas).size)throw new Error('Seleciona páginas com texto no leitor do estudo.');
  return prepararDescoberta({tipo:'documento',id:d.id,titulo:d.titulo,url:d.origem,texto:paginas.map(p=>`[Página ${p.n}]\n${p.texto}`).join('\n\n'),paginas:paginas.map(p=>p.n),parcial:paginas.length<d.pdf.paginas.length||d.processamento?.estado==='a_processar'});
}
