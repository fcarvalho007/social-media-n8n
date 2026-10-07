import { useEffect, useState } from 'react';
import { Check, Download, ImagePlus, Loader2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { apiMateriais, type ApiMateriais, type MaterialRoteiro } from '@/services/roteiros-materiais';
import type { VarianteRoteiro } from '../../../supabase/functions/_shared/roteiros/modelo';
import { assinaturaMateriais, idsMateriais, pendenciasMateriais } from '../../../supabase/functions/_shared/roteiros/materiais';
import { SeletorMateriais } from './SeletorMateriais';
import { criarPacoteMateriais } from './materiais-exportar';
import { transferirBlob } from './transferir';

export function MateriaisGravacao({variante,ppm,projectId,api=apiMateriais,onMudar,onGuardar,desativado=false,erro}:{variante:VarianteRoteiro;ppm:number;projectId:string;api?:ApiMateriais;onMudar:(v:VarianteRoteiro)=>void;onGuardar:(v:VarianteRoteiro)=>Promise<void>;desativado?:boolean;erro:(s:string)=>void}) {
  const [assets,setAssets]=useState<Record<string,MaterialRoteiro>>({});const [falha,setFalha]=useState('');
  const [cenaId,setCenaId]=useState<string|null>(null);const [rever,setRever]=useState(false);const [busy,setBusy]=useState(false);
  const [assinatura,setAssinatura]=useState('');const [carregando,setCarregando]=useState(false);const [tentativa,setTentativa]=useState(0);
  const ids=idsMateriais(variante).join(',');
  useEffect(()=>{let vivo=true;setAssinatura('');assinaturaMateriais(variante,ppm).then(s=>vivo&&setAssinatura(s)).catch(()=>vivo&&setFalha('Não foi possível verificar a sequência. Recarrega a página.'));return()=>{vivo=false;};},[variante,ppm]);
  useEffect(()=>{let vivo=true;setAssets({});setFalha('');setCarregando(!!ids);if(ids)api.ler(projectId,ids.split(',')).then(a=>{if(vivo)setAssets(a);}).catch(e=>vivo&&setFalha(e.message)).finally(()=>vivo&&setCarregando(false));return()=>{vivo=false;};},[ids,api,projectId,tentativa]);
  const cena=variante.cenas.find(c=>c.id===cenaId);
  const pendencias=pendenciasMateriais(variante);
  const faltam=idsMateriais(variante).some(id=>!assets[id]);
  const aprovada=!!assinatura&&variante.materiais_revistos===assinatura;
  const mudarCena=(id:string,patch:object)=>onMudar({...variante,cenas:variante.cenas.map(c=>c.id===id?{...c,...patch}:c)});
  const bloqueado=busy||desativado;
  return <section aria-label="Imagens e materiais por passagem" className="flex min-w-0 flex-col gap-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-semibold">O que mostrar em cada passagem</h3><p className="mt-2 max-w-prose text-sm text-muted-foreground">A fala fica preservada. Escolhe uma imagem de apoio ou mantém o apresentador em câmara; revê as instruções antes de exportar.</p></div><Button variant="outline" onClick={()=>setRever(r=>!r)}>{rever?'Voltar às passagens':'Rever sequência'}</Button></div>
    {falha&&<div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-destructive"><p>{falha}</p><Button variant="outline" disabled={carregando} onClick={()=>setTentativa(n=>n+1)}>Voltar a ler imagens</Button></div>}
    <ol className={rever?'grid min-w-0 gap-5 md:grid-cols-2':'flex min-w-0 flex-col gap-6'}>{variante.cenas.map((c,i)=>{
      const a=c.apoio?.asset_id?assets[c.apoio.asset_id]:undefined;
      return <li key={c.id} className="flex min-w-0 flex-col gap-4 border-b pb-6"><h4 className="font-semibold">Passagem {i+1} · {c.etapa}</h4>
        <div className={rever?'flex min-w-0 flex-col gap-4':'grid min-w-0 gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]'}><div className="flex min-w-0 flex-col gap-3">
          <p className="whitespace-pre-wrap break-words text-base leading-relaxed">{c.locucao||'Fala ainda por preencher no roteiro.'}</p>
          {rever?<p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{c.visual||'Falta a instrução de edição.'}</p>:<label className="flex flex-col gap-2 text-sm">Instrução de edição · passagem {i+1}<Textarea value={c.visual} maxLength={1000} className="min-h-28 text-base" disabled={bloqueado} onChange={e=>mudarCena(c.id,{visual:e.target.value})}/></label>}
          {c.palavras.length>0&&<p className="text-sm text-muted-foreground">Pesquisa sugerida: {c.palavras.join(' · ')}</p>}
        </div><div className="flex min-w-0 flex-col gap-3">
          {a?<figure className="flex flex-col gap-2"><img src={`data:${a.mime};base64,${a.dados}`} alt={`Apoio visual da passagem ${i+1}`} className="max-h-64 w-full rounded-lg border object-contain"/><figcaption className="break-words text-sm text-muted-foreground">{a.nome}{a.credito?` · ${a.credito}`:''}</figcaption></figure>:c.apoio?.tipo==='apresentador'?<p className="flex min-h-28 items-center justify-center gap-2 rounded-lg border bg-muted p-4 text-sm"><User aria-hidden/>Apresentador em câmara</p>:<p role="status" className="flex min-h-28 items-center justify-center rounded-lg border border-dashed p-4 text-sm text-muted-foreground">{c.apoio?.asset_id?(carregando?'A ler a imagem…':'Imagem indisponível · escolhe outra'):'Imagem de apoio por escolher'}</p>}
          {!rever&&<div className="flex flex-wrap gap-2"><Button variant="outline" className="min-h-11" disabled={bloqueado} onClick={()=>setCenaId(c.id)}><ImagePlus aria-hidden/>{c.apoio?.tipo==='imagem'?'Trocar imagem':'Escolher imagem'}</Button><Button variant={c.apoio?.tipo==='apresentador'?'secondary':'ghost'} className="min-h-11" disabled={bloqueado} onClick={()=>mudarCena(c.id,{apoio:{tipo:'apresentador'}})}>Só apresentador</Button></div>}
        </div></div>
      </li>;
    })}</ol>
    <div className="flex flex-col gap-4"><p role="status" className="text-sm">{aprovada?'Sequência revista e guardada.':pendencias.length?`${pendencias.length} escolhas ou instruções por concluir.`:'Materiais prontos para revisão.'}</p>
      {rever&&pendencias.length>0&&<ul className="flex flex-col gap-2 text-sm text-muted-foreground">{pendencias.map(p=><li key={p}>{p}</li>)}</ul>}
      <div className="flex flex-wrap gap-3"><Button disabled={bloqueado||carregando||faltam||!!falha||!!pendencias.length||!assinatura||aprovada} onClick={async()=>{setBusy(true);try{await onGuardar({...variante,materiais_revistos:await assinaturaMateriais(variante,ppm)});setRever(true);}catch(e){erro((e as Error).message);}finally{setBusy(false);}}}>{busy?<Loader2 className="motion-safe:animate-spin" aria-hidden/>:<Check aria-hidden/>}Guardar e aprovar sequência</Button>
        <Button variant="outline" disabled={bloqueado||!aprovada||carregando||faltam||!!falha} onClick={async()=>{setBusy(true);try{transferirBlob(await criarPacoteMateriais(variante,ppm,projectId,api),'roteiro-plano-e-materiais.zip');}catch(e){erro((e as Error).message);}finally{setBusy(false);}}}><Download aria-hidden/>Exportar plano e materiais</Button></div>
      <p className="text-sm text-muted-foreground">ZIP com a locução, plano TXT/PDF ilustrado, imagens por passagem e créditos. Qualquer alteração à fala, ordem, imagens ou instruções pede uma nova revisão.</p>
    </div>
    {cena&&<SeletorMateriais key={cena.id} project={projectId} api={api} prompt={`Ilustração de apoio para um Reel; nunca apresentar como prova da notícia. Fala: ${cena.locucao}\nMostrar: ${cena.visual}\nTemas: ${cena.palavras.join(', ')}`} onFechar={()=>setCenaId(null)} onEscolher={a=>{mudarCena(cena.id,{apoio:{tipo:'imagem',asset_id:a.id,nome:a.nome.slice(0,200)}});setCenaId(null);}}/>}
  </section>;
}
