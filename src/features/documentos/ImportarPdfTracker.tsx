import {useEffect,useRef,useState} from 'react';
import {Loader2,Download} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Alert,AlertDescription} from '@/components/ui/alert';
import {Progress} from '@/components/ui/progress';
import {apiDocumentos,pedidoLocal} from './apiLocal';
import {documentosLegado,tituloLegado,type CatalogoPdfTracker} from './legado';
import type {DocumentoAcervo} from './modelo';
import type {PdfRecolhido} from './contratos';

export function ImportarPdfTracker({docs,ocupado,onGuardar}:{docs:DocumentoAcervo[];ocupado:boolean;onGuardar:(f:File,p:PdfRecolhido)=>Promise<unknown>}){
  const [catalogo,setCatalogo]=useState<CatalogoPdfTracker|null>(null);const [erro,setErro]=useState('');const [aImportar,setAImportar]=useState(false);const [atual,setAtual]=useState('');const [feitos,setFeitos]=useState(0);const [total,setTotal]=useState(0);const [falhas,setFalhas]=useState<{titulo:string;erro:string}[]>([]);
  const vivo=useRef(true);const trava=useRef(false);
  useEffect(()=>{vivo.current=true;apiDocumentos<CatalogoPdfTracker|null>('legado/catalogo').then(c=>{if(vivo.current)setCatalogo(c);}).catch(e=>{if(vivo.current)setErro(e.message);});return()=>{vivo.current=false;};},[]);
  if(!catalogo&&!erro)return null;
  const entradas=catalogo?documentosLegado(catalogo):[];
  const pendentes=entradas.filter(e=>!docs.some(d=>d.pdf.hash===e.hash&&e.registos.every(r=>d.legado?.registos.some(x=>x.id===r.id))&&!!d.legado));
  const concluido=!!catalogo&&!pendentes.length&&!aImportar;
  const conferir=<div className="flex flex-col gap-3 text-sm"><p>{entradas.filter(e=>docs.some(d=>d.pdf.hash===e.hash&&d.legado)).length} ficheiros únicos no acervo deste projeto. {catalogo?.entradas.filter(e=>e.orfao).length??0} objeto sem registo antigo, preservado e identificado.</p><ul className="flex flex-col gap-2">{catalogo?.entradas.filter(e=>e.erro).map(e=><li key={e.id} className="break-words text-muted-foreground">{tituloLegado(e)} (ID {e.registos.map(r=>r.id).join(', ')}) · {e.registos.every(r=>r.deleted_at)?'Eliminado no original · ':''}{e.erro}</li>)}{falhas.map((f,i)=><li key={i} className="break-words text-destructive">{f.titulo}: {f.erro}</li>)}</ul><p className="text-xs text-muted-foreground">Resumos e datas antigas conservados como metadados de origem. Os IDs e estados de todos os registos mantêm-se disponíveis. Ficheiros iguais partilham o binário.</p></div>;
  async function importar(){
    if(trava.current||ocupado||!catalogo)return;trava.current=true;setAImportar(true);setErro('');setFeitos(0);setTotal(pendentes.length);setFalhas([]);
    for(const e of pendentes){if(!vivo.current)break;setAtual(tituloLegado(e));
      try{
        const res=await pedidoLocal('legado/pdf',{hash:e.hash});
        const r=e.registos.find(r=>!r.deleted_at)??e.registos[0];
        await onGuardar(new File([await res.blob()],e.nome.endsWith('.pdf')?e.nome:'documento.pdf',{type:'application/pdf'}),{url:e.url,origem:typeof r?.linkedin_post_url==='string'?r.linkedin_post_url:e.url,titulo:tituloLegado(e),tipo:'pdf',publicadoEm:null,hash:e.hash!,bytes:e.bytes!,fonteId:0,nomeFonte:r?.publisher||(/linkedin/i.test(r?.source??'')?'PDF Tracker':r?.source)||'Objeto recuperado do PDF Tracker',categoria:r?.category,estado:'descarregado',legado:{projeto:catalogo.projeto,exportadoEm:catalogo.exportadoEm,registos:e.registos,objeto:e.nome,orfao:e.orfao}});
      }catch(err){if(vivo.current)setFalhas(a=>[...a,{titulo:tituloLegado(e),erro:(err as Error).message}]);}
      if(vivo.current)setFeitos(n=>n+1);
    }
    trava.current=false;if(vivo.current){setAImportar(false);setAtual('');}
  }
  if(concluido)return <details className="border-t pt-3"><summary className="flex min-h-11 cursor-pointer flex-wrap items-center gap-2 text-sm text-muted-foreground"><span>Importação do PDF Tracker · {entradas.length} documentos</span><span className="text-xs">· {catalogo!.entradas.filter(e=>e.erro).length} registo por resolver · ver conferência</span></summary><div className="py-3">{conferir}</div></details>;
  return <section className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:p-5" aria-labelledby="importar-legado-titulo">
    <div className="flex flex-wrap items-start justify-between gap-4"><div className="flex max-w-3xl flex-col gap-2"><h2 id="importar-legado-titulo" className="text-lg font-semibold">{concluido?'PDF Tracker importado':'O teu acervo do PDF Tracker'}</h2><p className="text-sm text-muted-foreground">{catalogo?`${catalogo.registos} registos antigos · ${catalogo.objetos} objetos PDF · ${entradas.length} ficheiros únicos recuperados · ${catalogo.thumbnails.filter(t=>t.hash).length} capas antigas preservadas.`:'Não foi possível ler o catálogo antigo.'}</p>{!concluido&&<p className="text-xs text-muted-foreground">Os originais e os metadados já estão no disco. A importação coloca texto, capas e resumos neste projeto do navegador. Documentos eliminados mantêm esse estado; não há publicação.</p>}</div>{!concluido&&<Button onClick={()=>void importar()} disabled={ocupado||aImportar||!pendentes.length}>{aImportar?<Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" data-icon="inline-start"/>:<Download data-icon="inline-start"/>}{aImportar?'A importar…':`Importar ${pendentes.length} documentos`}</Button>}</div>
    {aImportar&&<div role="status" className="flex flex-col gap-2"><p className="break-words text-sm">{atual}</p><Progress value={feitos/Math.max(1,total)*100}/><p className="text-xs text-muted-foreground">{feitos} de {total} processados nesta passagem. Mantém esta página aberta; podes retomar depois sem duplicar ficheiros.</p></div>}
    {erro&&<Alert variant="destructive"><AlertDescription><p>{erro}</p><Button className="mt-3 min-h-11" variant="outline" onClick={()=>{setErro('');void apiDocumentos<CatalogoPdfTracker|null>('legado/catalogo').then(c=>{if(vivo.current)setCatalogo(c);}).catch(e=>{if(vivo.current)setErro(e.message);});}}>Tentar ler a importação novamente</Button></AlertDescription></Alert>}
    {catalogo&&<details className="text-sm"><summary className="flex min-h-11 cursor-pointer items-center text-primary">Conferir a importação e os documentos por resolver</summary><div className="mt-3">{conferir}</div></details>}
  </section>;
}
