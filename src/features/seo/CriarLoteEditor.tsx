import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { EscolherSite } from './ComponentesSeo';
import { apiSeo } from './api';
import type { SiteEditorial } from './contratos';
import { calendarizarLote, type LoteEditorial } from './lotes';
import { diaLisboa } from './precos';
export function CriarLoteEditor({sites,siteInicial,temasIniciais=[],pesquisaId=null,onCriado}:{sites:SiteEditorial[];siteInicial:string;temasIniciais?:string[];pesquisaId?:string|null;onCriado:(l:LoteEditorial)=>Promise<void>}) {
  const [pedidoId]=useState(()=>crypto.randomUUID()),[siteId,setSite]=useState(siteInicial),[nome,setNome]=useState(''),[temas,setTemas]=useState(temasIniciais.join('\n')),[inicio,setInicio]=useState(diaLisboa(new Date())),[teto,setTeto]=useState('1'),[contributo,setContributo]=useState(''),[busy,setBusy]=useState(false),[erro,setErro]=useState<string|null>(null);
  const s=sites.find(s=>s.id===siteId), lista=temas.split('\n').map(t=>t.trim()).filter(Boolean);
  let datas:string[]=[];try{if(s&&lista.length<=20)datas=calendarizarLote(inicio,lista.length,s.politica);}catch{/* Server validates dates and accounts for the existing plan. */}
  async function criar(){setBusy(true);setErro(null);try{const l=await apiSeo<LoteEditorial>('lote-criar',{lote:{pedidoId,siteId,nome,inicio,temas:lista,pesquisaId,contributo,objetivo:s?.objetivo??'',cta:s?.oferta??'',tetoMicro:Math.round(Number(teto)*1e6)}});await onCriado(l);}catch(x){setErro((x as Error).message);}finally{setBusy(false);}}
  return <form onSubmit={e=>{e.preventDefault();void criar();}} className="flex min-w-0 flex-col gap-4"><fieldset disabled={busy} className="flex min-w-0 flex-col gap-4">
    <EscolherSite id="lote-site" sites={sites.filter(s=>s.estado==='piloto')} valor={siteId} onChange={setSite}/>
    <div className="flex flex-col gap-2"><Label htmlFor="lote-nome">Nome do lote</Label><Input id="lote-nome" className="min-h-11" value={nome} minLength={3} maxLength={120} required placeholder="Ex.: SMS marketing · novembro" onChange={e=>setNome(e.target.value)}/></div>
    <div className="flex flex-col gap-2"><Label htmlFor="lote-temas">Temas ou keywords, um por linha</Label><Textarea id="lote-temas" rows={5} value={temas} readOnly={!!pesquisaId} maxLength={1700} required onChange={e=>setTemas(e.target.value)}/><p className="text-xs text-muted-foreground">{lista.length} / 20 temas. Temas já planeados neste site serão ignorados e identificados no lote.</p></div>
    <div className="grid gap-4 sm:grid-cols-2"><div className="flex flex-col gap-2"><Label htmlFor="lote-inicio">Começar a preparar a partir de</Label><Input id="lote-inicio" className="min-h-11" type="date" value={inicio} required onChange={e=>setInicio(e.target.value)}/></div><div className="flex flex-col gap-2"><Label htmlFor="lote-teto">Teto total de produção (USD)</Label><Input id="lote-teto" className="min-h-11" type="number" min="0.01" max="100" step="0.01" value={teto} required onChange={e=>setTeto(e.target.value)}/></div></div>
    <div className="flex flex-col gap-2"><Label htmlFor="lote-contributo">Perspetiva ou contributo comum</Label><Textarea id="lote-contributo" rows={3} value={contributo} maxLength={4000} onChange={e=>setContributo(e.target.value)} placeholder="O que estes artigos vão acrescentar? Podes completar e diferenciar depois em cada pauta."/></div>
    <p className="text-sm text-muted-foreground">Cadência do site: até {s?.politica.limiteSemanal} artigos por semana. {datas.length>0?`Distribuição inicial: ${datas[0]} a ${datas.at(-1)}. `:''}O calendário final desconta as datas já ocupadas. Estas são datas de preparação; publicar exige as regras e a aprovação do destino.</p>
    {erro&&<p role="alert" className="text-sm text-destructive">{erro}</p>}
    <Button type="submit" className="min-h-11 self-start" disabled={!lista.length||lista.length>20||lista.some(t=>t.length>80)||!s}>{busy?'A preparar…':'Criar lote · sem chamadas pagas'}</Button>
    <p className="text-xs text-muted-foreground">O teto não é um preço nem uma autorização de despesa. Cada pedido manual tem orçamento próprio; a cadência automática é autorizada separadamente.</p>
  </fieldset></form>;
}
