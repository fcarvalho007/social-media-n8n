import { useCallback, useEffect, useRef, useState } from 'react';
import { BACKEND_NUVEM } from '@/lib/backendHub';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { FiltroDocumentos, PaginacaoDocumentos } from './ControlosDocumentos';
import { normalizarPesquisa, paginaValida, unirSelecao } from './interface';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { apiDocumentos, binarioDocumento } from './apiLocal';
import { nomeDoFicheiro } from './modelo';
import { MAX_FONTES_POR_RECOLHA, CATEGORIAS_DOCUMENTOS as categorias, type ArtigoFonteLido, type EvidenciaFonte, type FonteDocumento, type PdfRecolhido, type TarefaDocumentos } from './contratos';

const estadoNome: Record<EvidenciaFonte['estado'], string> = { a_consultar:'Por consultar',concluida:'Consultada',limitada:'Com limitações',erro:'Não acessível',bloqueada:'Requer atenção' };

export function FontesDocumentos({ambito,ocupado,onGuardar,onConcluido,onAbrir,onPrepararArtigo}:{ambito:string;ocupado:boolean;onGuardar:(f:File,p:PdfRecolhido)=>Promise<{id:string;capaCriada:boolean;capaErro?:string;titulo:string}>;onConcluido:()=>void;onAbrir:(id:string)=>void;onPrepararArtigo:(f:ArtigoFonteLido)=>void}) {
  const [fontes,setFontes]=useState<FonteDocumento[]>([]); const [tarefas,setTarefas]=useState<TarefaDocumentos[]>([]); const [auditoria,setAuditoria]=useState<TarefaDocumentos|null>(null);
  const [selecionadas,setSelecionadas]=useState(new Set<number>()); const [pesquisa,setPesquisa]=useState(''); const [categoria,setCategoria]=useState(''); const [erro,setErro]=useState<string|null>(null);
  const [carregando,setCarregando]=useState(true); const [iniciando,setIniciando]=useState(false); const [importando,setImportando]=useState<string|null>(null); const [verNovidades,setVerNovidades]=useState(false);
  const [tarefaNovidadesId,setTarefaNovidadesId]=useState<string|null>(null);
  const [paginaNovidades,setPaginaNovidades]=useState(0);const [pesquisaNovidades,setPesquisaNovidades]=useState('');const [lendoArtigo,setLendoArtigo]=useState<string|null>(null);
  const [paginaFontes,setPaginaFontes]=useState(1);const [repetir,setRepetir]=useState(0);
  const conclusoes=useRef(new Set<string>());
  useEffect(()=>{for(const t of tarefas){if(t.estado==='concluida'&&!conclusoes.current.has(t.id)){conclusoes.current.add(t.id);onConcluido();}}},[tarefas,onConcluido]);
  const importacoes=useRef(new Set<string>()); const aImportar=useRef(false); const vivo=useRef(true);
  const atualizar=useCallback(async()=>{const j=await apiDocumentos<TarefaDocumentos[]>('tarefas',{ambito});if(vivo.current)setTarefas(j);},[ambito]);
  useEffect(()=>{vivo.current=true;setCarregando(true);setErro(null);Promise.all([apiDocumentos<FonteDocumento[]>('fontes'),apiDocumentos<TarefaDocumentos|null>('diagnostico'),atualizar()]).then(([f,a])=>{if(vivo.current){setFontes(f);setAuditoria(a);}}).catch(e=>{if(vivo.current)setErro(e.message);}).finally(()=>{if(vivo.current)setCarregando(false);});return()=>{vivo.current=false;};},[atualizar,repetir]);
  useEffect(()=>{if(!tarefas.some(j=>j.estado==='em_curso'))return;const t=setInterval(()=>void atualizar().catch(e=>setErro(e.message)),1800);return()=>clearInterval(t);},[tarefas,atualizar]);
  const importar=useCallback(async(j:TarefaDocumentos,p:PdfRecolhido)=>{
    if(aImportar.current||ocupado)return;aImportar.current=true;setImportando(p.titulo);importacoes.current.add(`${j.id}:${p.hash}`);
    try{
      const blob=await binarioDocumento({id:j.id,ambito,hash:p.hash});const salvo=await onGuardar(new File([blob],nomeDoFicheiro(p.url),{type:'application/pdf'}),p);
      await apiDocumentos('confirmar',{id:j.id,ambito,hash:p.hash,documentoId:salvo.id,capaCriada:salvo.capaCriada,capaErro:salvo.capaErro,titulo:salvo.titulo});
      onConcluido();
    }catch(e){await apiDocumentos('confirmar',{id:j.id,ambito,hash:p.hash,erro:(e as Error).message}).catch(()=>undefined);if(vivo.current)setErro(`PDF descarregado, mas a leitura/capa não ficou concluída: ${(e as Error).message}`);}
    finally{aImportar.current=false;if(vivo.current){setImportando(null);await atualizar().catch(e=>setErro(e.message));}}
  },[ambito,ocupado,onGuardar,onConcluido,atualizar]);
  useEffect(()=>{
    if(ocupado||aImportar.current)return;
    for(const j of tarefas){const p=j.pdfs.find(p=>p.estado==='descarregado'&&!importacoes.current.has(`${j.id}:${p.hash}`));if(p){void importar(j,p);break;}}
  },[tarefas,ocupado,importar]);
  const visiveis=fontes.filter(f=>(!categoria||f.group_category===categoria)&&normalizarPesquisa(`${f.name} ${f.url}`).includes(normalizarPesquisa(pesquisa)));
  const candidatas=visiveis.filter(f=>f.url.startsWith('https://')&&!selecionadas.has(f.id));
  const vagas=Math.max(0,MAX_FONTES_POR_RECOLHA-selecionadas.size);
  const paginaFonte=paginaValida(paginaFontes,visiveis.length,12);
  const emCurso=tarefas.find(j=>j.estado==='em_curso');const ultima=tarefas[0];
  const referenciaTarefa=tarefas.find(j=>j.id===tarefaNovidadesId)??ultima;
  const novidades=(referenciaTarefa?.descobertas.filter(d=>d.tipo==='artigo')??[]).filter(d=>normalizarPesquisa(`${d.titulo} ${d.nomeFonte}`).includes(normalizarPesquisa(pesquisaNovidades)));
  const evidencias=new Map([...(auditoria?.fontes??[]),...tarefas.slice().reverse().flatMap(j=>j.fontes)].map(e=>[e.fonteId,e]));
  async function iniciar(modo:'diagnostico'|'recolher'){
    if(iniciando||emCurso)return;setIniciando(true);setErro(null);setTarefaNovidadesId(null);
    try{await apiDocumentos('iniciar',{ambito,ids:[...selecionadas],modo});await atualizar();}catch(e){setErro((e as Error).message);}finally{setIniciando(false);}
  }
  return <div className="flex flex-col gap-5">
    <div className="max-w-3xl"><h2 className="text-xl font-semibold">Fontes e recolhas</h2><p className="mt-2 text-sm text-muted-foreground">Escolhe as fontes e recolhe os documentos. O Hub verifica os downloads, extrai texto e cria a capa a partir da primeira página. Notícias e artigos ficam nas referências de cada recolha.</p></div>
    {erro&&<Alert variant="destructive"><AlertDescription><p>{erro}</p><Button variant="outline" className="mt-3 min-h-11" onClick={()=>setRepetir(n=>n+1)}>Atualizar fontes e resultados</Button></AlertDescription></Alert>}
    {carregando?<p role="status">A carregar as fontes…</p>:<>
      <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_16rem]"><div className="flex flex-col gap-1.5"><Label htmlFor="pesquisa-fontes">Pesquisar fontes</Label><Input id="pesquisa-fontes" name="pesquisa-fontes" autoComplete="off" placeholder="Nome ou endereço da fonte…" value={pesquisa} onChange={e=>{setPesquisa(e.target.value);setPaginaFontes(1);}} className="min-h-11" /></div><FiltroDocumentos id="categoria-fontes" nome="Categoria" valor={categoria} opcoes={[{valor:'',nome:'Todas as categorias'},...Object.entries(categorias).filter(([id])=>fontes.some(f=>f.group_category===id)).map(([valor,nome])=>({valor,nome}))]} onChange={v=>{setCategoria(v);setPaginaFontes(1);}} /></div>
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm tabular-nums" role="status">{visiveis.length} {visiveis.length===1?'fonte':'fontes'} · {selecionadas.size} {selecionadas.size===1?'selecionada':'selecionadas'}</p><div className="flex flex-wrap gap-2"><Button variant="outline" className="min-h-11" disabled={!!emCurso||iniciando||!vagas||!candidatas.length} onClick={()=>setSelecionadas(a=>unirSelecao(a,candidatas.slice(0,vagas).map(f=>f.id)))}>Selecionar até 12 fontes</Button><Button variant="ghost" className="min-h-11" disabled={!selecionadas.size||!!emCurso||iniciando} onClick={()=>setSelecionadas(new Set())}>Limpar seleção</Button></div></div>
      <p className="text-xs text-muted-foreground">Até {MAX_FONTES_POR_RECOLHA} fontes por recolha. As escolhas mantêm-se ao pesquisar noutra categoria; limpa a seleção para começar outro lote.</p>
      <div className="flex flex-wrap gap-3"><Button className="min-h-11" disabled={!selecionadas.size||!!emCurso||iniciando||ocupado} onClick={()=>void iniciar('recolher')}>{iniciando&&<Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />}Recolher PDFs e novidades</Button><Button className="min-h-11" variant="outline" disabled={!selecionadas.size||!!emCurso||iniciando} onClick={()=>void iniciar('diagnostico')}>Testar acesso às fontes</Button></div>
      {!visiveis.length?<p role="status" className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Não há fontes com estes filtros. Experimenta outro nome ou categoria.</p>:<ul className="divide-y rounded-xl border bg-card">{visiveis.slice((paginaFonte-1)*12,paginaFonte*12).map(f=>{const ev=evidencias.get(f.id);const valido=f.url.startsWith('https://');return <li key={f.id} className="p-4"><div className="flex items-start gap-3"><label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3" htmlFor={`fonte-pdf-${f.id}`}><span className="flex size-11 shrink-0 items-center justify-center"><Checkbox id={`fonte-pdf-${f.id}`} checked={selecionadas.has(f.id)} disabled={!valido||!!emCurso||iniciando||(!selecionadas.has(f.id)&&!vagas)} onCheckedChange={v=>setSelecionadas(a=>{const n=new Set(a);if(v===true)n.add(f.id);else n.delete(f.id);return n;})} /></span><span className="flex min-w-0 flex-1 flex-col gap-2 py-2"><span className="text-sm font-medium">{f.name}</span><span className="break-all text-xs text-muted-foreground">{valido?f.url:'Endereço interno · configurar uma fonte pública'}</span><span className="text-xs text-muted-foreground">{categorias[f.group_category]??f.group_category}</span></span></label><Badge variant={ev?.estado==='erro'?'destructive':'outline'} className="shrink-0 self-start">{ev?estadoNome[ev.estado]:'Por consultar'}</Badge></div>{ev&&<div className="flex flex-col gap-2 sm:pl-14"><p className="text-xs text-muted-foreground">{ev.pdfs} PDFs candidatos · {ev.novidades} referências</p>{!!ev.detalhes.length&&<details><summary className="flex min-h-11 cursor-pointer items-center text-xs text-primary underline underline-offset-4">Ver diagnóstico da fonte</summary><ul className="flex flex-col gap-2 py-2 text-xs text-muted-foreground">{ev.detalhes.map((d,i)=><li className="break-words" key={i}>{d}</li>)}</ul></details>}</div>}</li>;})}</ul>}
      <PaginacaoDocumentos pagina={paginaFonte} total={visiveis.length} tamanho={12} onChange={setPaginaFontes} nome="fontes" />
      {auditoria&&<p className="text-xs text-muted-foreground">Diagnóstico de {auditoria.total} fontes · {new Date(auditoria.iniciadaEm).toLocaleDateString('pt-PT')}</p>}
      <p className="text-xs text-muted-foreground">Até 4 páginas por fonte, 3 PDFs por fonte e 12 PDFs por recolha (150 MB no total). Sem IA paga. {BACKEND_NUVEM ? 'A recolha e a preparação correm no backend privado quando as tarefas e o serviço agendado estão ativos. Podes fechar esta página e consultar os resultados mais tarde.' : 'Podes mudar de separador no módulo durante a recolha. Mantém o servidor local e esta página do Hub abertos para concluir o texto e as capas.'}</p>
    </>}
    {(emCurso||importando)&&<div className="space-y-3 rounded-xl border p-4" role="status"><p className="flex items-center gap-2 text-sm font-medium"><Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />{importando?`A organizar e criar capa: ${importando}`:emCurso?.atual}</p>{emCurso&&<><Progress value={emCurso.fontes.filter(f=>f.estado!=='a_consultar').length/emCurso.total*100} /><p className="text-xs text-muted-foreground">{emCurso.fontes.filter(f=>f.estado!=='a_consultar').length} de {emCurso.total} fontes consultadas</p></>}</div>}
    {!!tarefas.length&&<section className="space-y-4">
      <h3 className="text-lg font-semibold">Resultados das recolhas</h3>
      {tarefas.slice(0,4).map(j=><details key={j.id} className="rounded-xl border bg-card p-4" open={j.estado==='em_curso'?true:undefined}><summary className="flex min-h-11 cursor-pointer flex-wrap items-center justify-between gap-2 text-sm font-medium"><span>{new Date(j.iniciadaEm).toLocaleString('pt-PT',{timeZone:'Europe/Lisbon',dateStyle:'short',timeStyle:'short'})} · {j.total} {j.total===1?'fonte':'fontes'}</span><span className="text-xs text-muted-foreground">{j.pdfs.filter(p=>p.estado==='guardado').length} no acervo · {j.estado==='em_curso'?'Em curso':j.estado==='interrompida'?'Interrompida':'Consultar resultado'}</span></summary><div className="flex flex-col gap-3 pt-3">
        <div className="flex flex-wrap justify-between gap-2"><p className="text-sm font-medium">{new Date(j.iniciadaEm).toLocaleString('pt-PT',{timeZone:'Europe/Lisbon',dateStyle:'short',timeStyle:'short'})} · {j.total} {j.total===1?'fonte':'fontes'} · {j.modo==='diagnostico'?'Diagnóstico':'Recolha'}</p><span className="text-xs text-muted-foreground">{j.estado==='em_curso'?'Em curso':j.estado==='interrompida'?'Interrompida':'Consulta concluída'}</span></div>
        <p className="text-sm">{j.descobertas.filter(d=>d.tipo==='pdf').length} PDFs candidatos · {j.pdfs.length} {BACKEND_NUVEM?'recebidos pelo servidor':'descarregados em disco'} · {j.pdfs.filter(p=>p.estado==='guardado').length} organizados no acervo · {j.pdfs.filter(p=>p.capaCriada).length} capas criadas</p>
        {!!j.erros.length&&<Alert variant="destructive"><AlertDescription>{j.erros.join(' · ')}</AlertDescription></Alert>}
        {j.estado==='interrompida'&&<Button className="min-h-11" size="sm" variant="outline" onClick={()=>void apiDocumentos('retomar',{id:j.id,ambito}).then(atualizar).catch(e=>setErro(e.message))}><RefreshCw className="mr-2 h-4 w-4" />Retomar</Button>}
        <Button className="min-h-11 justify-start p-0" size="sm" variant="link" onClick={()=>{setTarefaNovidadesId(j.id);setPaginaNovidades(0);setVerNovidades(true);}}>Ver referências desta recolha</Button>
        <ul className="space-y-2">{j.pdfs.map(p=><li key={p.hash} className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="min-w-0 flex-1 break-words">{p.titulo} <span className="text-xs text-muted-foreground">· {p.estado==='guardado'?(p.capaCriada?'No acervo · capa pronta':'No acervo · capa por gerar'):p.estado==='erro'?'Leitura por resolver':'Leitura e capa pendentes'}</span></span>
          {p.estado==='guardado'&&p.documentoId&&<Button className="min-h-11" size="sm" variant="outline" onClick={()=>onAbrir(p.documentoId!)}>Ver documento</Button>}
          {p.estado==='guardado'&&<Button className="min-h-11" size="sm" variant="ghost" disabled={ocupado||!!importando} onClick={()=>void importar(j,p)}>{BACKEND_NUVEM?'Verificar no acervo':'Reimportar do disco'}</Button>}
          {p.estado==='erro'&&<Button className="min-h-11" size="sm" variant="outline" disabled={ocupado||!!importando} onClick={()=>void importar(j,p)}>Tentar ler novamente</Button>}
        </li>)}</ul>
        {j.fontes.some(f=>f.estado==='erro'||f.estado==='bloqueada'||f.estado==='limitada')&&<p className="text-xs text-muted-foreground">Há fontes com limitações nesta consulta. Consulta os diagnósticos na lista acima; não foram contornados bloqueios.</p>}
      </div></details>)}
      <Button className="min-h-11 self-start" variant="outline" onClick={()=>setVerNovidades(v=>!v)}>{verNovidades?'Ocultar referências':'Ver novidades e referências'}</Button>
      {verNovidades&&<div className="flex flex-col gap-3"><h3 className="text-lg font-semibold">Referências da recolha</h3>
        <Label htmlFor="pesquisa-novidades">Pesquisar referências</Label><Input id="pesquisa-novidades" name="pesquisa-novidades" autoComplete="off" className="min-h-11" aria-label="Pesquisar novidades" placeholder="Pesquisar por título ou fonte…" value={pesquisaNovidades} onChange={e=>{setPesquisaNovidades(e.target.value);setPaginaNovidades(0);}} />
        <p className="text-xs text-muted-foreground">{novidades.length} referências · recolha de {referenciaTarefa?new Date(referenciaTarefa.iniciadaEm).toLocaleString('pt-PT',{timeZone:'Europe/Lisbon',dateStyle:'short',timeStyle:'short'}):''}</p>
        {!novidades.length&&<p role="status" className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Não há referências com estes filtros nesta recolha.</p>}<ul className="divide-y rounded-xl border bg-card">{novidades.slice(paginaNovidades*30,(paginaNovidades+1)*30).map((d,i)=><li key={`${d.url}:${i}`} className="space-y-2 p-4">
          <a href={d.url} target="_blank" rel="noreferrer" className="break-words text-sm font-medium text-primary underline underline-offset-4">{d.titulo}</a>
          <p className="text-xs text-muted-foreground">{d.nomeFonte} · {d.nova?'Detetada pela primeira vez':'Já detetada'} · {d.publicadoEm?`publicação: ${new Date(d.publicadoEm).toLocaleDateString('pt-PT')}`:'data de publicação não verificada'}</p>
          <Button className="min-h-11" size="sm" variant="outline" disabled={!!lendoArtigo||ocupado} onClick={async()=>{if(!referenciaTarefa)return;setLendoArtigo(d.url);setErro(null);try{const f=await apiDocumentos<ArtigoFonteLido>('artigo',{ambito,id:referenciaTarefa.id,url:d.url});onPrepararArtigo(f);}catch(e){setErro((e as Error).message);}finally{setLendoArtigo(null);}}}>{lendoArtigo===d.url?<Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />:null}Ler e preparar artigo</Button>
        </li>)}</ul>
        {novidades.length>30&&<div className="flex items-center justify-between gap-3"><Button className="min-h-11" size="sm" variant="outline" disabled={paginaNovidades===0} onClick={()=>setPaginaNovidades(p=>p-1)}>Anteriores</Button><span className="text-xs">Página {paginaNovidades+1} de {Math.ceil(novidades.length/30)}</span><Button className="min-h-11" size="sm" variant="outline" disabled={(paginaNovidades+1)*30>=novidades.length} onClick={()=>setPaginaNovidades(p=>p+1)}>Seguintes</Button></div>}
      </div>}
      <p className="text-xs text-muted-foreground">«Detetada pela primeira vez» refere-se às recolhas deste projeto. Não significa que a notícia tenha sido publicada hoje. Preparar um artigo lê a fonte e abre um rascunho para trabalhar; não gera texto por IA nem publica.</p>
    </section>}
  </div>;
}
