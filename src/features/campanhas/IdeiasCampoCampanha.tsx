import { useState } from 'react';
import { z } from 'zod';
import { Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { chaveRecuperacao, guardarRecuperacao, lerRecuperacao, limparRecuperacao } from '@/lib/recuperacaoLocal';
import { apiSeo } from '../seo/api';
import { CustoPedido } from '../seo/ComponentesSeo';
import { usd, euroIndicativo } from '../seo/precos';
import type { OrcamentoSeo, PedidoSeo } from '../seo/contratos';
import type { CampoIdeias, ContextoIdeiasCampanha, ResultadoIdeiasCampanha } from './ideias';
export interface ApoioIdeiasCampanha {projetoId:string;campo:CampoIdeias;contexto:Omit<ContextoIdeiasCampanha,'campo'|'instrucao'>}
const schemaPendencia=z.object({orcamentoId:z.string().uuid(),base:z.string().max(55000)});
function baseCampoIdeias(a:ApoioIdeiasCampanha){return JSON.stringify([a.campo,a.contexto.campanhaId,a.contexto.versao,a.contexto.siteId,a.contexto.fonte.hash,a.contexto.direcao,a.contexto.tipo,a.contexto.peca]);}
export function IdeiasCampoCampanha({apoio,aplicar,id}:{apoio:ApoioIdeiasCampanha;aplicar:(v:string)=>void;id:string}){
 const {user}=useAuth(),chave=user?chaveRecuperacao(user.id,'ideias-campanha',`${apoio.contexto.campanhaId??apoio.contexto.fonte.hash}:${apoio.contexto.tipo??'direcao'}:${apoio.campo}`,apoio.projetoId):null;
 const [instrucao,setInstrucao]=useState(''),[busy,setBusy]=useState(false),[q,setQ]=useState<OrcamentoSeo|null>(null),[erro,setErro]=useState(''),[pedido,setPedido]=useState<PedidoSeo|null>(null),[resultado,setResultado]=useState<ResultadoIdeiasCampanha|null>(null),[base,setBase]=useState(''),[semExecucao,setSemExecucao]=useState(false);
 const [pendente,setPendente]=useState(()=>{const r=user&&chave?lerRecuperacao(chave,user.id):null,d=schemaPendencia.safeParse(r?.dados);return d.success?d.data:null;});
 const atual=baseCampoIdeias(apoio),mudou=!!base&&base!==atual;
 const opcoes={projeto:apoio.projetoId};
 function conservar(orcamentoId:string,assinatura:string){const d={orcamentoId,base:assinatura};setPendente(d);if(chave)guardarRecuperacao(chave,d);}
 async function lerResultado(p:PedidoSeo){setPedido(p);if(p.estado==='em_curso'){setErro('O pedido ainda está em curso. Verifica novamente; não é necessário gerar outro.');return;}if(p.estado!=='concluido'||!p.resultadoId){setErro(p.detalhe);return;}setResultado(await apiSeo<ResultadoIdeiasCampanha>('resultado',{id:p.resultadoId},opcoes));}
 async function recuperar(){if(!pendente)return;setBusy(true);setErro('');try{const r=await apiSeo<{orcamento:OrcamentoSeo;pedido:PedidoSeo|null}>('campanha-ideias-recuperar',{id:pendente.orcamentoId},opcoes);setBase(pendente.base);setSemExecucao(!r.pedido);if(r.pedido)await lerResultado(r.pedido);else{setQ(r.orcamento);setErro('O orçamento ainda não foi executado. Revê-o antes de autorizar.');}}catch(e){setErro((e as Error).message);}finally{setBusy(false);}}
 async function orcamentar(){if(busy||pendente)return;setBusy(true);setErro('');try{const r=await apiSeo<OrcamentoSeo>('campanha-ideias-orcamento',{contexto:{...apoio.contexto,campo:apoio.campo,instrucao}},opcoes);setBase(atual);setQ(r);}catch(e){setErro((e as Error).message);}finally{setBusy(false);}}
 async function executar(){if(!q||busy)return;setBusy(true);setErro('');setSemExecucao(false);conservar(q.id,base);try{const p=await apiSeo<PedidoSeo>('campanha-ideias-executar',{id:q.id,confirmar:true},opcoes);setQ(null);await lerResultado(p);}catch(e){setQ(null);setErro(`${(e as Error).message} O pedido foi conservado. Usa «Verificar pedido anterior» antes de repetir.`);}finally{setBusy(false);}}
 return <section aria-label="Sugestões DeepSeek para este campo" className="flex min-w-0 flex-col gap-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
  <div><h4 className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="size-4 text-primary"/>Novas ideias para este campo</h4><p className="mt-2 text-xs leading-relaxed text-muted-foreground">A DeepSeek usa a descoberta, o público e a voz do site. Recebes três alternativas e escolhes se alguma substitui o campo. Os factos e a oferta continuam sujeitos à tua revisão.</p></div>
  <Label htmlFor={`${id}-instrucao`}>O que queres explorar? (opcional)</Label><Textarea id={`${id}-instrucao`} rows={2} maxLength={1500} value={instrucao} disabled={busy} onChange={e=>setInstrucao(e.target.value)} placeholder="Ex.: uma aplicação mais prática para gestores, com menos jargão."/>
  {pendente?<div className="flex flex-col gap-2"><Button type="button" variant="outline" disabled={busy} onClick={()=>void recuperar()}><RefreshCw className="size-4"/>Verificar pedido anterior · sem novo custo</Button>{semExecucao&&<Button type="button" variant="ghost" disabled={busy} onClick={()=>{if(chave)limparRecuperacao(chave);setPendente(null);setQ(null);setErro('');setSemExecucao(false);}}>Descartar orçamento não executado · sem custo</Button>}{(resultado||pedido&&pedido.estado!=='em_curso'&&pedido.custoMicro!==null)&&<Button type="button" variant="ghost" disabled={busy} onClick={()=>{if(chave)limparRecuperacao(chave);setPendente(null);setResultado(null);setPedido(null);}}>Pedir outras alternativas · rever novo custo</Button>}</div>:<Button type="button" variant="outline" className="min-h-11 self-start" disabled={busy} onClick={()=>void orcamentar()}>{busy?'A preparar orçamento…':'Rever custo de três ideias'}</Button>}
  {busy&&<p role="status" className="text-xs">{q?'A pedir ideias à DeepSeek. O texto do campo mantém-se.':'A consultar o pedido…'}</p>}
  {erro&&<Alert variant="destructive"><AlertDescription>{erro}</AlertDescription></Alert>}
  {pedido&&<p className="text-xs text-muted-foreground">{pedido.custoMicro===null?'Custo por confirmar; a reserva mantém-se no histórico.':`Custo deste pedido: ${usd(pedido.custoMicro)} · ≈ ${euroIndicativo(pedido.custoMicro,pedido.cambio)}`} · <a href="/artigos/custos" target="_blank" rel="noreferrer" className="text-primary underline">Ver histórico</a></p>}
  {mudou&&resultado&&<Alert><AlertDescription>O contexto ou o campo mudou depois do pedido. As ideias foram preservadas para consulta, mas não podem substituir a versão atual.</AlertDescription></Alert>}
  {resultado&&<ol className="divide-y border-y">{resultado.ideias.map((s,i)=><li key={i} className="flex flex-col gap-3 py-4"><h5 className="text-sm font-semibold">{i+1}. {s.titulo}</h5><p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{s.valor}</p><p className="text-xs leading-relaxed text-muted-foreground">{s.motivo}</p><Button type="button" variant="outline" className="min-h-11 self-start" disabled={busy||mudou} onClick={()=>{if(chave)limparRecuperacao(chave);aplicar(s.valor);}}>Usar esta ideia no campo</Button></li>)}</ol>}
  <p className="text-xs text-muted-foreground">Só é cobrado depois de confirmares o orçamento. Não inicia a redação do artigo nem publica conteúdo.</p>
  <CustoPedido q={q} fechar={()=>setQ(null)} confirmar={()=>void executar()} ocupado={busy} erro={erro||null} contexto="Três sugestões para um campo da campanha · DeepSeek direto"/>
 </section>;
}
