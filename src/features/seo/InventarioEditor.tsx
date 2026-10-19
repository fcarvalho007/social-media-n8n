import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { SiteEditorial } from './contratos';
import { apiSeo } from './api';

export function InventarioEditor({site,disabled,onGuardado}:{site:SiteEditorial;disabled:boolean;onGuardado:(s:SiteEditorial)=>Promise<void>}) {
  const [dados,setDados]=useState<{candidatas:string[];avisos:string[]}|null>(null),[sel,setSel]=useState<string[]>([]),[busy,setBusy]=useState(false),[erro,setErro]=useState<string|null>(null),[mensagem,setMensagem]=useState('');
  async function descobrir(){setBusy(true);setErro(null);setMensagem('');try{setDados(await apiSeo('inventario-descobrir',{siteId:site.id}));setSel([]);}catch(x){setErro((x as Error).message);}finally{setBusy(false);}}
  async function verificar(urls:string[],importar=false){setBusy(true);setErro(null);setMensagem('');try{const s=await apiSeo<SiteEditorial>('inventario-verificar',{siteId:site.id,revista:site.conhecimento?.revista??0,urls,importar});await onGuardado(s);setSel([]);const p=s.conhecimento!.paginas.filter(p=>urls.includes(p.url));setMensagem(`${p.length} de ${urls.length} destinos verificados. ${p.filter(p=>p.verificacao?.http!==200||!p.verificacao.indexavel||p.verificacao.canonical!==p.url).length} precisam de atenção. Confirma o contexto editorial antes de aprovar novas páginas.`);}catch(x){setErro((x as Error).message);}finally{setBusy(false);}}
  const conhecidas=new Set(site.conhecimento?.paginas.map(p=>p.url)), candidatas=dados?.candidatas.filter(u=>!conhecidas.has(u))??[];
  const porVerificar=[...(site.conhecimento?.paginas??[])].sort((a,b)=>(a.verificacao?.em??'').localeCompare(b.verificacao?.em??'')).slice(0,10);
  return <div className="flex min-w-0 flex-col gap-3 rounded-lg bg-muted/40 p-4"><h5 className="font-medium">Importar e verificar destinos</h5><p className="max-w-prose text-sm text-muted-foreground">Descobre até 100 URLs no sitemap do próprio site. Importa e verifica até 10 de cada vez: resposta HTTP, canonical e noindex. Respeita robots.txt. Não consome créditos de IA.</p>
    {disabled&&<p className="text-xs text-muted-foreground">Guarda primeiro as alterações do conhecimento.</p>}
    <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" className="min-h-11" disabled={disabled||busy} onClick={()=>void descobrir()}>{busy?'A consultar o site…':'Descobrir no sitemap'}</Button><Button type="button" variant="outline" className="min-h-11" disabled={disabled||busy||!porVerificar.length} onClick={()=>void verificar(porVerificar.map(p=>p.url))}>Verificar {porVerificar.length||''} destinos guardados</Button></div>
    {erro&&<p role="alert" className="text-sm text-destructive">{erro}</p>}{mensagem&&<p role="status" className="text-sm">{mensagem}</p>}
    {dados&&<><p className="text-sm">{candidatas.length} páginas novas encontradas</p>{dados.avisos.length>0&&<details><summary className="flex min-h-11 cursor-pointer items-center text-sm text-primary underline">Avisos da descoberta ({dados.avisos.length})</summary><ul className="list-disc break-words pl-5 text-xs text-muted-foreground">{dados.avisos.map((a,i)=><li key={i}>{a}</li>)}</ul></details>}
      <div className="max-h-64 overflow-y-auto">{candidatas.map(url=><label key={url} className="flex min-h-11 items-start gap-3 py-2 text-sm"><Checkbox className="mt-1" checked={sel.includes(url)} disabled={busy||disabled||!sel.includes(url)&&sel.length>=10} onCheckedChange={v=>setSel(s=>v===true?[...s,url]:s.filter(u=>u!==url))}/><span className="min-w-0 break-all">{url}</span></label>)}</div>
      <Button type="button" variant="outline" className="min-h-11 self-start" disabled={disabled||busy||!sel.length} onClick={()=>void verificar(sel,true)}>Importar e verificar {sel.length||''} páginas</Button></>}
  </div>;
}
