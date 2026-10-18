import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile,rename,stat} from 'node:fs/promises';
import path from 'node:path';
import {obterPublico} from './obter';
import {reconciliarLegado,type CatalogoPdfTracker,type ExportacaoPdfTracker} from '../../src/features/documentos/legado';
const hash=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
export async function prepararLegado(pasta:string):Promise<CatalogoPdfTracker>{
  const pastaLegado=path.join(pasta,'legado');
  const e=JSON.parse(await readFile(path.join(pastaLegado,'exportacao.json'),'utf8')) as ExportacaoPdfTracker;
  if(e.projeto!=='51f4d881-00e8-4f9d-aa86-9219387ba24b'||e.registos.length>2000||e.pdfs.length>2000||e.baseStorage!=='https://owmvdqbajoatfkemfjkg.supabase.co/storage/v1/object/public/')throw new Error('Exportação antiga inválida.');
  await mkdir(path.join(pasta,'pdfs'),{recursive:true});await mkdir(path.join(pastaLegado,'capas'),{recursive:true});
  const c:CatalogoPdfTracker={versao:1,exportadoEm:e.exportadoEm,projeto:e.projeto,estado:'a_descarregar',registos:e.registos.length,objetos:e.pdfs.length,capas:e.thumbnails.length,entradas:reconciliarLegado(e),thumbnails:e.thumbnails};
  try{const anterior=JSON.parse(await readFile(path.join(pastaLegado,'catalogo.json'),'utf8')) as CatalogoPdfTracker;for(const item of c.entradas){const antigo=anterior.entradas.find(x=>x.url===item.url);if(antigo?.hash&&await stat(path.join(pasta,'pdfs',antigo.hash+'.pdf')).then(s=>s.size===antigo.bytes).catch(()=>false)){item.hash=antigo.hash;item.bytes=antigo.bytes;}}}catch{/* First import has no checkpoint. */}
  const salvar=async()=>{const destino=path.join(pastaLegado,'catalogo.json');await writeFile(destino+'.tmp',JSON.stringify(c,null,2),{mode:0o600});await rename(destino+'.tmp',destino);};
  await salvar();
  // Sequential writes keep checkpoint and binary state consistent. No providers or AI.
  for(const item of c.entradas){if(item.hash)continue;try{
    const r=await obterPublico(item.url,AbortSignal.timeout(60000),{maxBytes:50*1024*1024});
    if(!r.bytes.subarray(0,1024).includes(Buffer.from('%PDF-')))throw new Error('O endereço não devolveu um PDF.');
    const h=hash(r.bytes);const destino=path.join(pasta,'pdfs',h+'.pdf');await writeFile(destino+'.tmp',r.bytes,{mode:0o600});await rename(destino+'.tmp',destino);item.hash=h;item.bytes=r.bytes.length;delete item.erro;
  }catch(err){item.erro=(err as Error).message.replace(/https?:\/\/\S+/g,'[origem]');}await salvar();}
  for(const item of c.thumbnails){try{
    const url=`${e.baseStorage}thumbnails/${item.name.split('/').map(encodeURIComponent).join('/')}`;
    const r=await obterPublico(url,AbortSignal.timeout(30000),{maxBytes:8*1024*1024});
    if(!r.tipo.startsWith('image/'))throw new Error('A capa não é uma imagem.');
    const h=hash(r.bytes);await writeFile(path.join(pastaLegado,'capas',h),r.bytes,{mode:0o600});item.hash=h;
  }catch(err){item.erro=(err as Error).message;}await salvar();}
  c.estado='concluido';await salvar();return c;
}
export async function lerCatalogoLegado(pasta:string):Promise<CatalogoPdfTracker|null>{try{return JSON.parse(await readFile(path.join(pasta,'legado/catalogo.json'),'utf8'));}catch{return null;}}
export async function binarioLegado(pasta:string,h:string){if(!/^[a-f0-9]{64}$/.test(h))throw new Error('Documento inválido.');const c=await lerCatalogoLegado(pasta);if(!c?.entradas.some(e=>e.hash===h))throw new Error('Documento não consta do catálogo antigo.');return readFile(path.join(pasta,'pdfs',h+'.pdf'));}
