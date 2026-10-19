import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProjetoOpcional } from '@/contexts/ProjetoContext';
import { BACKEND_NUVEM } from '@/lib/backendHub';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiSeo } from './api';
import type { SiteEditorial } from './contratos';
import { ambitoAcervo, type DocumentoAcervo } from '../documentos/modelo';
import { listarAcervo } from '../documentos/acervoLocal';

export function DocumentoConhecimentoPicker({site,disabled,onGuardado}:{site:SiteEditorial;disabled:boolean;onGuardado:(s:SiteEditorial)=>Promise<void>}) {
  const {user}=useAuth(), projeto=useProjetoOpcional();
  const [open,setOpen]=useState(false),[docs,setDocs]=useState<DocumentoAcervo[]>([]),[documento,setDocumento]=useState<string|null>(null),[sel,setSel]=useState<number[]>([]),[termo,setTermo]=useState(''),[confirmado,setConfirmado]=useState(false),[busy,setBusy]=useState(false),[erro,setErro]=useState<string|null>(null);
  const d=docs.find(d=>d.id===documento), paginas=d?.pdf.paginas.filter(p=>sel.includes(p.n)&&p.estado==='texto')??[];
  const excerto=paginas.map(p=>`[Página ${p.n}]\n${p.texto}`).join('\n\n');
  async function abrir(){setOpen(true);setBusy(true);setErro(null);setDocumento(null);setSel([]);setConfirmado(false);try{if(!user||!projeto?.projetoId)throw new Error('Seleciona um projeto para abrir o seu acervo.');setDocs(await listarAcervo<DocumentoAcervo>('documentos',ambitoAcervo(user.id,projeto.projetoId)));}catch(x){setErro((x as Error).message);}finally{setBusy(false);}}
  async function importar(){if(!d)return;setBusy(true);setErro(null);try{
    const ref={id:d.id,hash:d.pdf.hash,paginas:BACKEND_NUVEM?paginas.map(p=>p.n):paginas.map(p=>({n:p.n,texto:p.texto}))};
    const s=await apiSeo<SiteEditorial>('conhecimento-documento',{siteId:site.id,revista:site.conhecimento?.revista??0,confirmacao:confirmado,documento:BACKEND_NUVEM?ref:{...ref,titulo:d.titulo,origem:d.origem}});await onGuardado(s);setOpen(false);
  }catch(x){setErro((x as Error).message);}finally{setBusy(false);}}
  return <><Button type="button" variant="outline" className="min-h-11 self-start" disabled={disabled} onClick={()=>void abrir()}>Escolher páginas de um PDF</Button><Dialog open={open} onOpenChange={v=>{if(!busy)setOpen(v);}}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Conhecimento a partir do acervo</DialogTitle><DialogDescription>Seleciona páginas que leste e que esta marca pode usar. O ficheiro privado não será publicado com o artigo.</DialogDescription></DialogHeader>
    {erro&&<p role="alert" className="text-sm text-destructive">{erro}</p>}
    {busy&&!docs.length?<p role="status">A abrir o acervo…</p>:!docs.length?<div className="flex flex-col gap-3"><p className="text-sm text-muted-foreground">Ainda não há PDFs disponíveis neste projeto. Importa um documento e aguarda a extração do texto.</p><Button type="button" asChild variant="outline" className="min-h-11"><Link to="/documentos">Abrir biblioteca de documentos</Link></Button></div>:<>
      {!d?<><Label htmlFor="pdf-marca-filtro">Encontrar documento</Label><Input id="pdf-marca-filtro" className="min-h-11" value={termo} onChange={e=>setTermo(e.target.value)}/><ul className="max-h-72 overflow-y-auto divide-y">{docs.filter(d=>d.titulo.toLocaleLowerCase().includes(termo.toLocaleLowerCase())).map(d=><li key={d.id}><Button type="button" variant="ghost" className="h-auto min-h-11 w-full justify-start whitespace-normal py-3 text-left" disabled={!d.pdf.paginas.some(p=>p.estado==='texto')} onClick={()=>{setDocumento(d.id);setSel([]);setConfirmado(false);}}>{d.titulo}<span className="ml-auto pl-3 text-xs text-muted-foreground">{d.pdf.paginas.filter(p=>p.estado==='texto').length} páginas com texto</span></Button></li>)}</ul></>:<>
      <div className="flex flex-wrap items-center justify-between gap-2"><p className="min-w-0 break-words font-medium">{d.titulo}</p><Button type="button" variant="ghost" disabled={busy} onClick={()=>{setDocumento(null);setConfirmado(false);}}>Trocar documento</Button></div>
      <fieldset disabled={busy} className="max-h-52 overflow-y-auto rounded-lg border p-3"><legend className="px-1 text-sm">Páginas de referência · até 20</legend>{d.pdf.paginas.map(p=><label key={p.n} className="flex min-h-11 cursor-pointer items-start gap-3 py-2 text-sm"><Checkbox className="mt-1" checked={sel.includes(p.n)} disabled={p.estado!=='texto'||!sel.includes(p.n)&&sel.length>=20} onCheckedChange={v=>{setSel(s=>v===true?[...s,p.n]:s.filter(n=>n!==p.n));setConfirmado(false);}}/><span>Página {p.n}<span className="mt-1 block line-clamp-2 text-xs text-muted-foreground">{p.texto||'Sem texto extraído; não pode ser usada como contexto.'}</span></span></label>)}</fieldset>
      <p role="status" className="text-xs text-muted-foreground">{paginas.length} páginas · {excerto.length.toLocaleString('pt-PT')} / 12 000 caracteres. O excerto é guardado integralmente; reduz as páginas se exceder o limite.</p>
      {excerto&&<details><summary className="flex min-h-11 cursor-pointer items-center text-sm text-primary underline">Rever excerto completo</summary><p className="max-h-60 overflow-y-auto whitespace-pre-wrap text-sm">{excerto}</p></details>}
      <label className="flex min-h-11 items-start gap-3 text-sm"><Checkbox className="mt-1" checked={confirmado} disabled={busy} onCheckedChange={v=>setConfirmado(v===true)}/><span>Li estas páginas e autorizo a sua utilização como referência nesta marca.</span></label>
      <Button type="button" className="min-h-11" disabled={busy||!confirmado||!paginas.length||excerto.length<200||excerto.length>12000||paginas.some(p=>p.texto.length>12000)} onClick={()=>void importar()}>{busy?'A guardar…':'Acrescentar ao conhecimento · sem custo'}</Button>
      </>}
    </>}
  </DialogContent></Dialog></>;
}
