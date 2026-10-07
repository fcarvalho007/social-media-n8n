import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, Copy, Download, FileText, Plus, Save, Sparkles, Trash2, Undo2 } from 'lucide-react';
import { PlanoGravacao } from './PlanoGravacao';
import { aplicarRefinamento, type PedidoRefinamento, type EstiloTrecho } from '../../../supabase/functions/_shared/roteiros/refinar';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { transferirTexto } from './transferir';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { CuradoriaNoticias, API_CURADORIA } from '@/features/curadoria/CuradoriaNoticias';
import { type ApiRoteiros, type VersaoRoteiro } from '@/services/roteiros';
import { FRAMEWORKS, briefInicial, estruturaManual, paragrafos, palavras, segundos, textoLimpo, validarBrief, validarDocumento, type Roteiro, type FonteRoteiro, type BriefRoteiro, type DocumentoRoteiro, type GeracaoRoteiro, type VarianteRoteiro, type CenaRoteiro } from '../../../supabase/functions/_shared/roteiros/modelo';
const nomeFramework = (id: string) => FRAMEWORKS.find(f => f.id === id)?.nome ?? id;
const data = (iso: string) => new Date(iso).toLocaleString('pt-PT');
const BASE = '/estudio/roteiros';
function TextoLocucao({ id, value, onChange }: { id: string; value: string; onChange: (texto: string) => void }) {
 const ref = useRef<HTMLTextAreaElement>(null);
 useLayoutEffect(() => {
  const ajustar = () => { const el = ref.current; if (el) { el.style.height = 'auto'; el.style.height = `${Math.max(112, el.scrollHeight + 2)}px`; } };
  ajustar(); window.addEventListener('resize', ajustar); return () => window.removeEventListener('resize', ajustar);
 }, [value]);
 return <Textarea ref={ref} id={id} className="min-h-28 resize-none overflow-hidden text-base leading-relaxed" value={value} maxLength={3000} placeholder="Escreve apenas as palavras que vais dizer." onChange={e => onChange(e.target.value)} />;
}


function Brief({ value, onChange }: { value: BriefRoteiro; onChange: (v: BriefRoteiro) => void }) {
 return <fieldset className="flex min-w-0 flex-col gap-4"><legend className="mb-3 font-semibold">Como queres contar esta história?</legend>
  <div className="flex flex-wrap gap-6"><fieldset><legend className="mb-2 text-sm">Duração</legend><ToggleGroup type="single" variant="outline" className="justify-start" value={String(value.duracao)} onValueChange={v=>{if(v)onChange({...value,duracao:Number(v)});}}>{[30,60,90].map(n=><ToggleGroupItem key={n} value={String(n)}>{n} s</ToggleGroupItem>)}</ToggleGroup></fieldset><fieldset><legend className="mb-2 text-sm">Objetivo</legend><ToggleGroup type="single" variant="outline" className="flex-wrap justify-start" value={value.objetivo} onValueChange={v=>{if(v)onChange({...value,objetivo:v});}}>{['Explicar','Informar','Inspirar'].map(o=><ToggleGroupItem key={o} value={o}>{o}</ToggleGroupItem>)}</ToggleGroup></fieldset></div>
  {![30,60,90].includes(value.duracao)&&<p className="text-xs text-muted-foreground">Duração personalizada · {value.duracao} s</p>}
  {!validarBrief(value)&&<p role="alert" className="text-sm text-destructive">Escolhe uma a três estruturas, duração entre 15 e 180 segundos e ritmo entre 90 e 220 palavras/minuto.</p>}
  {value.objetivo&&!['Explicar','Informar','Inspirar'].includes(value.objetivo)&&<p className="text-xs text-muted-foreground">Objetivo personalizado · {value.objetivo}</p>}
  <details><summary className="cursor-pointer text-sm text-muted-foreground">Personalizar público, ritmo e duração</summary><div className="mt-4 flex flex-col gap-4">
   <div className="grid gap-4 sm:grid-cols-2"><label className="flex flex-col gap-1 text-sm">Duração pretendida (segundos)<Input className="min-h-11 text-base sm:text-sm" type="number" min={15} max={180} step={1} value={value.duracao} onChange={e=>onChange({...value,duracao:Number(e.target.value)})}/></label><label className="flex flex-col gap-1 text-sm">Ritmo de leitura (palavras/minuto)<Input className="min-h-11 text-base sm:text-sm" type="number" min={90} max={220} step={1} value={value.ppm} onChange={e=>onChange({...value,ppm:Number(e.target.value)})}/></label></div>
   <label className="flex flex-col gap-1 text-sm">Para quem é o vídeo?<Input className="min-h-11 text-base sm:text-sm" value={value.publico} maxLength={300} onChange={e=>onChange({...value,publico:e.target.value})} placeholder="Opcional · a IA usa o contexto da notícia"/></label>
   <label className="flex flex-col gap-1 text-sm">O que deve ficar claro no final?<Input className="min-h-11 text-base sm:text-sm" value={value.objetivo} maxLength={500} onChange={e=>onChange({...value,objetivo:e.target.value})}/></label>
  </div></details>
  <details><summary className="cursor-pointer text-sm font-medium">Comparar {value.frameworks.length} estruturas de escrita</summary><p className="mt-3 text-xs text-muted-foreground">A IA escreve uma proposta completa por estrutura. Depois escolhes a que preferes.</p><fieldset className="mt-3 flex flex-col gap-2"><legend className="mb-2 text-sm">Escolhe entre uma e três</legend>{FRAMEWORKS.map(f=><label key={f.id} className="flex min-h-11 cursor-pointer items-start gap-3 py-1 text-sm"><Checkbox className="mt-1" checked={value.frameworks.includes(f.id)} disabled={(!value.frameworks.includes(f.id)&&value.frameworks.length===3)||(value.frameworks.includes(f.id)&&value.frameworks.length===1)} onCheckedChange={checked=>onChange({...value,frameworks:checked?[...value.frameworks,f.id]:value.frameworks.filter(id=>id!==f.id)})}/><span><span className="block font-medium">{f.nome}</span><span className="text-xs text-muted-foreground">{f.uso}</span></span></label>)}</fieldset></details>
 </fieldset>;
}

export function EditorRoteiro({ api, projectId, curadoria = API_CURADORIA }: { api: ApiRoteiros; projectId: string; curadoria?: typeof API_CURADORIA }) {
 const obter=api.obter;
 const opcoesGeracao=useRef<HTMLDetailsElement>(null);
 const { id } = useParams(); const [search] = useSearchParams(); const navigate = useNavigate();
 const [roteiro, setRoteiro] = useState<Roteiro | null>(null);
 const [brief, setBrief] = useState<BriefRoteiro>(briefInicial);
 const [doc, setDoc] = useState<DocumentoRoteiro>({ variantes: [], selecionada: null });
 const [fonte, setFonte] = useState<FonteRoteiro | null>(null);
 const [noticiaInicial, setNoticiaInicial] = useState<string | undefined>(search.get('noticia') ?? undefined);
 const [tipo, setTipo] = useState('curadoria'); const [titulo, setTitulo] = useState(''); const [texto, setTexto] = useState('');
 const [dirty, setDirty] = useState(false); const dirtyRef = useRef(false); dirtyRef.current = dirty;
 const [busy, setBusy] = useState(false); const lock = useRef(false);
 const [erro, setErro] = useState<string | null>(null); const [tab, setTab] = useState(search.get('comparar')==='1'?'comparar':'texto');
 const [geracoes, setGeracoes] = useState<GeracaoRoteiro[]>([]); const [historico, setHistorico] = useState<VersaoRoteiro[]>([]);
 const [confirmarIA, setConfirmarIA] = useState(false); const [sairPara, setSairPara] = useState<string | null>(null);
 const [removido,setRemovido] = useState<{varianteId:string;cena:CenaRoteiro;indice:number}|null>(null);
 const [pedidoRefino,setPedidoRefino] = useState<PedidoRefinamento | undefined>();
 const [jobsRefresh, setJobsRefresh] = useState(0);
 const [recarga, setRecarga] = useState(0); const [criarId] = useState(() => crypto.randomUUID());
 const pedidoId = useRef<string | null>(null);
 const pedidoPendente = useRef<{id:string;roteiro:Roteiro;pedido?:PedidoRefinamento}|null>(null);
 useEffect(() => {
  const unload = (e: BeforeUnloadEvent) => { if (dirtyRef.current) { e.preventDefault(); e.returnValue = ''; } };
  const links = (e: MouseEvent) => { const a = (e.target as HTMLElement).closest('a'); if (dirtyRef.current && a && a.target !== '_blank' && a.origin === location.origin && (a.pathname + a.search) !== (location.pathname + location.search)) { e.preventDefault(); e.stopPropagation(); setSairPara(a.pathname + a.search); } };
  window.addEventListener('beforeunload', unload); document.addEventListener('click', links, true);
  return () => { window.removeEventListener('beforeunload', unload); document.removeEventListener('click', links, true); };
 }, []);
 useEffect(() => {
  if (!id) return; let alive = true; setRoteiro(null); setErro(null);
  obter(id).then(r => { if (alive) { setRoteiro(r); setBrief(r.brief); setDoc(r.documento); setFonte(r.fonte); setDirty(false); } }).catch(e => alive && setErro(e.message));
  return () => { alive = false; };
 }, [id, obter, recarga]);
 useEffect(() => {
  if (!id) return; let alive = true; let timer: ReturnType<typeof setTimeout>;
  async function ler() { try { const list = await api.geracoes(id!); if (!alive) return; setGeracoes(list); if (list.some(g => g.estado === 'a_processar' && Date.now() - Date.parse(g.criado_em) < 300000)) timer = setTimeout(ler, 2500); } catch (e) { if (alive) setErro((e as Error).message); } }
  void ler(); return () => { alive = false; clearTimeout(timer); };
 }, [id, api, jobsRefresh]);
 const guardado = async (d = doc, b = brief) => {
  if (!roteiro) throw new Error('Guarda a fonte primeiro.');
  if (!validarBrief(b) || !validarDocumento(d)) throw new Error('Revê a duração, o ritmo e a seleção de estruturas.');
  const r = await api.guardar(roteiro.id, roteiro.revisao, b, d); setRoteiro(r); setDoc(r.documento); setBrief(r.brief); dirtyRef.current=false; setDirty(false); return r;
 };
 const executar = async (fn: () => Promise<void>) => {
  if (lock.current) return; lock.current = true; setBusy(true); setErro(null);
  try { await fn(); } catch (e) { setErro((e as Error).message); } finally { lock.current = false; setBusy(false); }
 };
 const salvar = () => executar(async()=>{await guardado();toast.success('Versão guardada');});
 const atalhoGuardar=useRef<(()=>void)|null>(null);
 atalhoGuardar.current=roteiro&&dirty&&!busy&&!confirmarIA&&!sairPara?()=>{void salvar();}:null;
 useEffect(()=>{
  const tecla=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();atalhoGuardar.current?.();}};
  document.addEventListener('keydown',tecla);return()=>document.removeEventListener('keydown',tecla);
 },[]);
 const alterarDoc = (d: DocumentoRoteiro) => { setDoc(d); setDirty(true); };
 const variante = doc.variantes.find(v => v.id === doc.selecionada) ?? null;
 const alterarVariante = (v: VarianteRoteiro) => alterarDoc({ ...doc, variantes: doc.variantes.map(x => x.id === v.id ? v : x) });
 const alterarCena = (i: number, patch: Partial<CenaRoteiro>) => { if (variante) alterarVariante({ ...variante, cenas: variante.cenas.map((c, n) => n === i ? { ...c, ...patch } : c) }); };
 const removerCena = (i:number) => {if(!variante||variante.cenas.length<=1)return;setRemovido({varianteId:variante.id,cena:variante.cenas[i],indice:i});alterarVariante({...variante,cenas:variante.cenas.filter((_,n)=>n!==i)});};
 const desfazerRemocao = () => {if(!removido)return;const v=doc.variantes.find(x=>x.id===removido.varianteId);if(!v||v.cenas.length>=30||v.cenas.some(c=>c.id===removido.cena.id))return;const cenas=[...v.cenas];cenas.splice(Math.min(removido.indice,cenas.length),0,removido.cena);alterarDoc({...doc,variantes:doc.variantes.map(x=>x.id===v.id?{...v,cenas}:x)});setRemovido(null);};
 const copiar = async (t: string) => { try { await navigator.clipboard.writeText(t); toast.success('Texto copiado. Podes colá-lo no BIGVU.'); } catch { setErro('O navegador não permitiu copiar. Seleciona o texto na leitura limpa ou descarrega o TXT.'); } };
 const transferir = (t: string, sufixo: string) => { try { transferirTexto(t, `roteiro-${sufixo}.txt`); } catch { setErro('Não foi possível preparar o ficheiro. Usa Copiar para BIGVU.'); } };
 const novaEstrutura = () => { const v = estruturaManual(brief.frameworks[0] ?? 'hva', fonte?.titulo ?? 'Roteiro'); alterarDoc({ variantes: [...doc.variantes, v], selecionada: v.id }); setTab('texto'); };
 const fonteAtual = () => tipo === 'texto' ? {tipo:'texto' as const,titulo:titulo.trim()||texto.trim().split(/\n|[.!?]/)[0].slice(0,100)||'Texto fornecido',texto,url:null} : fonte!;
 const pronto = validarBrief(brief) && (roteiro || (tipo==='texto'?texto.trim().length>=40:fonte));
 const emCurso = geracoes.some(g=>g.estado==='a_processar'&&Date.now()-Date.parse(g.criado_em)<300000);
 const abrirPedido = (p?:PedidoRefinamento) => {if(pedidoPendente.current){setErro('O pedido anterior não foi confirmado. Atualiza as propostas antes de iniciar outro.');return;}setPedidoRefino(p);setConfirmarIA(true);};
 const gerar = () => executar(async () => {
  setConfirmarIA(false);
  let r = pedidoPendente.current?.roteiro;
  if(!r) r = roteiro ? (dirty?await guardado():roteiro) : await api.criar(criarId,projectId,fonteAtual(),brief);
  pedidoId.current ??= crypto.randomUUID();
  pedidoPendente.current ??= {id:pedidoId.current,roteiro:r,pedido:pedidoRefino};
  const g = await api.gerar(pedidoPendente.current.id,r,pedidoPendente.current.pedido);
  pedidoId.current = null; pedidoPendente.current=null;
  if(!id){dirtyRef.current=false;setDirty(false);navigate(`${BASE}/${r.id}?comparar=1`,{replace:true});return;}
  setGeracoes(old=>[g,...old.filter(x=>x.id!==g.id)]);setTab('comparar');setJobsRefresh(n=>n+1);
 });
 const aplicar = (g:GeracaoRoteiro,v:VarianteRoteiro) => executar(async()=>{
  let nova=v;
  if(g.contexto){const origem=doc.variantes.find(x=>x.id===g.contexto!.variante_id);if(!origem)throw new Error('A versão de origem já não está disponível.');nova=aplicarRefinamento(origem,v,g.contexto);nova.id=v.id;}
  await guardado({variantes:[...doc.variantes,nova],selecionada:nova.id});setTab(g.contexto?.modo==='visual'?'edicao':'texto');
 });
 const loading = !!id && !roteiro && !erro;
 return <div className={`mx-auto flex max-w-5xl flex-col gap-6 p-4 sm:p-6 ${roteiro&&dirty?'pb-40 sm:pb-28':''}`}>
  <header className="flex flex-wrap items-start justify-between gap-4"><div className="flex min-w-0 flex-col gap-2"><Link to={BASE} className="text-sm text-muted-foreground underline underline-offset-4">Meus roteiros</Link><h1 className="text-2xl font-semibold">{id ? 'Preparar roteiro' : 'Criar roteiro de Reels'}</h1><p className="text-sm text-muted-foreground">Escolhe uma proposta, ajusta a tua voz e leva o texto para o BIGVU.</p></div>
   {roteiro && <div className="flex flex-col items-end gap-2"><Button disabled={busy || !dirty} onClick={salvar}><Save aria-hidden />{busy ? 'A concluir…' : 'Guardar versão'}</Button><p role="status" className="text-xs text-muted-foreground">{dirty ? 'Alterações por guardar' : `Guardado · versão ${roteiro.revisao}`}</p></div>}
  </header>
  {roteiro&&dirty&&<aside aria-label="Alterações pendentes" className="fixed inset-x-4 bottom-4 z-20 flex max-w-sm flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3 sm:left-auto"><div><p className="text-sm font-medium">Por guardar</p><p className="text-xs text-muted-foreground">Ctrl/⌘ + S</p></div><Button disabled={busy} onClick={salvar}><Save aria-hidden/>Guardar alterações</Button></aside>}
  {erro && <Alert variant="destructive"><AlertTitle>Não foi possível concluir</AlertTitle><AlertDescription className="flex flex-col gap-2">{erro}{pedidoPendente.current&&<Button variant="outline" className="self-start" onClick={gerar}>Verificar pedido pendente</Button>}{!dirty && <Button variant="outline" className="self-start" onClick={() => setRecarga(n => n + 1)}>Tentar carregar novamente</Button>}</AlertDescription></Alert>}
  {loading && <div role="status" aria-label="A carregar roteiro"><Skeleton className="h-64 w-full" /></div>}
  {!id && <fieldset disabled={busy} className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,1fr)]">
   <section className="flex min-w-0 flex-col gap-4"><h2 className="text-lg font-semibold">Escolher a fonte</h2><Tabs value={tipo} onValueChange={setTipo}><TabsList><TabsTrigger value="curadoria">Da curadoria</TabsTrigger><TabsTrigger value="texto">Colar texto</TabsTrigger></TabsList>
    <TabsContent value="curadoria">{fonte ? <div className="flex flex-col gap-3 py-3"><p className="text-sm text-primary">Notícia selecionada</p><h3 className="font-semibold">{fonte.titulo}</h3><p className="max-h-64 overflow-auto whitespace-pre-wrap text-sm leading-relaxed">{fonte.texto}</p><Button variant="outline" className="self-start" onClick={() => { setNoticiaInicial(undefined); setFonte(null); }}>Escolher outra notícia</Button></div> : <CuradoriaNoticias api={curadoria} noticiaInicial={noticiaInicial} selecionar={f => { setFonte({ ...f, tipo: 'curadoria' }); setDirty(true); }} />}</TabsContent>
    <TabsContent value="texto" className="flex flex-col gap-4"><label className="flex flex-col gap-1 text-sm">Título da fonte (opcional)<Input className="min-h-11 text-base sm:text-sm" value={titulo} maxLength={200} onChange={e => { setTitulo(e.target.value); setDirty(true); }} /></label><label className="flex flex-col gap-1 text-sm">Texto original<Textarea className="min-h-64 text-base leading-relaxed" value={texto} maxLength={60000} onChange={e => { setTexto(e.target.value); setDirty(true); }} placeholder="Cola a notícia ou o texto que queres transformar num roteiro." /></label><p className="text-xs text-muted-foreground">Mínimo de 40 caracteres. Esta cópia fica associada ao roteiro.</p></TabsContent>
   </Tabs></section>
   <section className="flex min-w-0 flex-col gap-5"><Brief value={brief} onChange={b => { setBrief(b); setDirty(true); }} /><Button disabled={busy || !pronto || api.iaDisponivel===false} onClick={()=>abrirPedido()}><Sparkles/>Gerar e comparar roteiros</Button><Button variant="outline" disabled={busy || !validarBrief(brief) || (tipo === 'texto' ? texto.trim().length < 40 : !fonte)} onClick={() => executar(async () => { const f = fonteAtual(); const r = await api.criar(criarId, projectId, f, brief); dirtyRef.current = false; setDirty(false); navigate(`${BASE}/${r.id}`, { replace: true }); })}>{busy ? 'A guardar fonte…' : 'Guardar fonte e abrir editor'}</Button><p className="text-xs text-muted-foreground">{api.iaDisponivel===false?'IA local desligada. Ativa a DeepSeek no topo ou guarda a fonte para continuar sem IA.':!pronto?'Escolhe uma notícia ou cola um texto para começar.':'A fonte está pronta para gerar.'}</p><p className="text-xs text-muted-foreground">A geração prepara até três roteiros e sugestões visuais. Os campos de personalização são opcionais.</p></section>
  </fieldset>}
  {roteiro && fonte && <div className="flex min-w-0 flex-col gap-6">
   <details className="rounded-xl border bg-card p-4"><summary className="cursor-pointer break-words font-medium">Consultar fonte · {fonte.titulo}</summary>{fonte.nivel==='resumo'&&<p className="mt-3 text-xs text-muted-foreground">Só título/resumo disponível nesta fonte.</p>}<div className="mt-4 flex max-h-72 flex-col gap-3 overflow-auto text-sm leading-relaxed">{paragrafos(fonte.texto).map((p,i)=><p key={i} className="break-words"><span className="mr-1 text-xs text-muted-foreground">§{i+1}</span>{p}</p>)}</div>{fonte.url&&/^https?:\/\//i.test(fonte.url)&&<a href={fonte.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm underline">Abrir artigo original</a>}</details>
   <details ref={opcoesGeracao} open={!variante} className="rounded-xl border bg-card p-4 sm:p-5"><summary className="cursor-pointer text-sm font-medium">{variante?'Gerar outras versões':'Gerar o primeiro roteiro'} · {brief.duracao} s · {brief.frameworks.length} {brief.frameworks.length===1?'estrutura':'estruturas'}</summary><section aria-label="Gerar roteiros" className="mt-5 flex flex-col gap-5"><fieldset disabled={busy}><Brief value={brief} onChange={b=>{setBrief(b);setDirty(true);}}/></fieldset><div className="flex flex-wrap items-center gap-3"><Button disabled={busy||!validarBrief(brief)||api.iaDisponivel===false||emCurso} onClick={()=>abrirPedido()}><Sparkles/>Gerar e comparar roteiros</Button><p className="text-xs text-muted-foreground">{emCurso?'Há um pedido em curso. Consulta Comparar propostas.':api.iaDisponivel===false?'Ativa a DeepSeek no topo para testar IA local.':`${brief.frameworks.length} propostas · sugestões visuais incluídas`}</p></div><details><summary className="cursor-pointer text-xs text-muted-foreground">Prefiro começar sem IA</summary><Button className="mt-3" variant="outline" disabled={busy||doc.variantes.length>=20} onClick={novaEstrutura}><Plus/>Escrever manualmente</Button></details></section></details>
   <section className="flex min-w-0 flex-col gap-4"><Tabs value={tab} onValueChange={v => { setTab(v); if (v === 'historico') void executar(async () => setHistorico(await api.historico(roteiro.id))); }}>
    <TabsList className="h-auto w-full flex-wrap justify-start"><TabsTrigger value="texto" className="min-h-11">Roteiro</TabsTrigger><TabsTrigger value="comparar" className="min-h-11">Comparar propostas</TabsTrigger><TabsTrigger value="edicao" className="min-h-11">Preparar gravação</TabsTrigger><TabsTrigger value="historico" className="min-h-11">Histórico</TabsTrigger></TabsList>
    <TabsContent value="texto" className="flex flex-col gap-5">
     {!variante ? <div className="flex flex-col gap-3 py-8"><FileText className="size-8 text-muted-foreground" aria-hidden /><h2 className="text-lg font-semibold">A fonte está guardada. Agora, a tua versão.</h2><p className="text-sm text-muted-foreground">Gera propostas para comparar ou começa por uma estrutura em branco.</p><Button className="self-start" variant="outline" onClick={novaEstrutura}>Começar a escrever</Button></div> : <>
      <label className="flex flex-col gap-2 text-sm">Versão de escrita<Select disabled={busy} value={variante.id} onValueChange={v => alterarDoc({ ...doc, selecionada: v })}><SelectTrigger className="min-w-0"><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{doc.variantes.map((v, i) => <SelectItem key={v.id} value={v.id} className="max-w-sm break-words">{i + 1}. {nomeFramework(v.framework)} · {v.titulo}</SelectItem>)}</SelectGroup></SelectContent></Select></label>
      <fieldset disabled={busy} className="flex min-w-0 flex-col gap-5"><label className="flex flex-col gap-1 text-sm">Título do roteiro<Input className="min-h-11 text-base sm:text-sm" value={variante.titulo} maxLength={200} onChange={e => alterarVariante({ ...variante, titulo: e.target.value })} /></label>
       <p className="text-sm text-muted-foreground" role="status">{palavras(textoLimpo(variante))} palavras · cerca de {segundos(textoLimpo(variante), brief.ppm)} s de leitura · objetivo {brief.duracao} s</p>
       {segundos(textoLimpo(variante), brief.ppm) > brief.duracao * 1.2 && <p className="text-sm text-muted-foreground">O texto está acima da duração pretendida. Encurta uma ideia ou aumenta o tempo no briefing.</p>}
       {variante.cenas.map((c, i) => <div key={c.id} className="flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-2"><Label htmlFor={`cena-${c.id}`}>{i + 1}. {c.etapa}</Label><div className="flex flex-wrap gap-1"><Button size="sm" className="min-h-11" variant="outline" disabled={busy||api.iaDisponivel===false||emCurso} aria-label={`Regenerar com IA · ${c.etapa}`} onClick={()=>abrirPedido({modo:'trecho',variante_id:variante.id,cena_id:c.id,estilo:'alternativa'})}><Sparkles/>Regenerar com IA</Button>{([-1, 1] as const).map(d => <Button key={d} size="icon" className="min-h-11 min-w-11" variant="ghost" aria-label={`${d < 0 ? 'Subir' : 'Descer'} trecho ${i + 1}`} disabled={i + d < 0 || i + d >= variante.cenas.length} onClick={() => { const cenas = [...variante.cenas]; [cenas[i], cenas[i + d]] = [cenas[i + d], cenas[i]]; alterarVariante({ ...variante, cenas }); }}>{d < 0 ? <ArrowUp /> : <ArrowDown />}</Button>)}<Button size="icon" className="min-h-11 min-w-11" variant="ghost" aria-label={`Remover trecho ${i + 1}`} disabled={variante.cenas.length === 1} onClick={()=>removerCena(i)}><Trash2 /></Button></div></div><TextoLocucao id={`cena-${c.id}`} value={c.locucao} onChange={locucao => alterarCena(i, { locucao })} />{c.referencias.length > 0 && <p className="text-xs text-muted-foreground">Referências sugeridas: {c.referencias.map(n => `§${n}`).join(', ')} · revê-as se alterares os factos.</p>}</div>)}
       <Button variant="outline" className="self-start" disabled={variante.cenas.length >= 30} onClick={() => alterarVariante({ ...variante, cenas: [...variante.cenas, { id: crypto.randomUUID(), etapa: 'Novo trecho', locucao: '', visual: '', palavras: [], referencias: [] }] })}><Plus aria-hidden />Adicionar trecho</Button>
      </fieldset>
      {removido&&removido.varianteId===variante.id&&<div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4"><p className="text-sm">Secção «{removido.cena.etapa}» removida.</p><Button variant="outline" disabled={busy||variante.cenas.length>=30} onClick={desfazerRemocao}><Undo2 aria-hidden/>Desfazer remoção</Button></div>}
      <details className="rounded-xl border bg-card p-4"><summary className="cursor-pointer font-medium">Leitura limpa para o BIGVU</summary><p className="mt-4 whitespace-pre-wrap break-words text-base leading-loose">{textoLimpo(variante) || 'Escreve o primeiro trecho para preparar a leitura.'}</p></details>
      <div className="flex flex-wrap gap-2"><Button disabled={!textoLimpo(variante)} onClick={() => copiar(textoLimpo(variante))}><Copy aria-hidden />Copiar para BIGVU</Button><Button variant="outline" disabled={!textoLimpo(variante)} onClick={() => transferir(textoLimpo(variante), 'locucao')}><Download aria-hidden />Descarregar TXT</Button></div>
     </>}
    </TabsContent>
    <TabsContent value="comparar" className="flex flex-col gap-5"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm text-muted-foreground">Escolher uma proposta preserva as versões que já escreveste.</p><Button variant="outline" disabled={busy} onClick={() => executar(async () => { const list=await api.geracoes(roteiro.id);setGeracoes(list);if(pedidoPendente.current&&list.some(g=>g.id===pedidoPendente.current!.id)){pedidoPendente.current=null;pedidoId.current=null;setJobsRefresh(n=>n+1);} })}>Atualizar propostas</Button></div>
     {!geracoes.length && <div className="flex flex-col gap-3 py-6"><h2 className="font-semibold">Uma notícia, várias formas de a contar</h2><p className="text-sm text-muted-foreground">As estruturas escolhidas tornam-se roteiros completos lado a lado.</p><Button variant="outline" className="self-start" onClick={()=>{if(opcoesGeracao.current){opcoesGeracao.current.open=true;opcoesGeracao.current.scrollIntoView({block:'start'});opcoesGeracao.current.querySelector('summary')?.focus();}}}>Ver opções de geração</Button></div>}
     {geracoes.map(g => <section key={g.id} className="flex flex-col gap-3"><h2 className="text-sm font-medium">{g.contexto?.modo==='trecho'?`Alternativas · ${g.contexto.variante.cenas.find(c=>c.id===g.contexto?.cena_id)?.etapa}`:g.contexto?.modo==='visual'?'Plano de gravação':'Roteiros completos'} · {data(g.criado_em)} · versão {g.revisao_base}</h2>{g.estado !== 'concluida' ? <p role="status" className="text-sm text-muted-foreground">{g.estado === 'a_processar' ? Date.now() - Date.parse(g.criado_em) >= 300000 ? 'A resposta não foi confirmada. Atualiza para verificar; não há repetição automática.' : 'A preparar as propostas. Podes continuar a editar; o resultado fica guardado separadamente.' : g.erro}</p> : <div className="grid min-w-0 gap-4 xl:grid-cols-3">{g.resultado?.variantes.map(v => <article key={v.id} className="flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-4"><h3 className="font-semibold">{g.contexto?.modo==='trecho'?v.titulo:g.contexto?.modo==='visual'?'Plano visual':nomeFramework(v.framework)}</h3><p className="text-xs text-muted-foreground">{palavras(textoLimpo(v))} palavras · ~{segundos(textoLimpo(v), brief.ppm)} s</p><p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{g.contexto?.modo==='visual'?v.cenas.map(c=>`${c.etapa}: ${c.visual}`).join('\n\n'):textoLimpo(v)}</p>{v.notas && <p className="text-xs text-muted-foreground">{v.notas}</p>}<Button className="mt-auto" disabled={busy || doc.variantes.length >= 20 || doc.variantes.some(x => x.id === v.id)} onClick={()=>aplicar(g,v)}>{doc.variantes.some(x => x.id === v.id) ? 'Já aplicada' : g.contexto?.modo==='trecho'?'Usar esta alternativa':g.contexto?.modo==='visual'?'Aplicar plano':'Aplicar e editar'}</Button></article>)}</div>}</section>)}
    </TabsContent>
    <TabsContent value="edicao" className="flex flex-col gap-5"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex flex-col gap-2"><h2 className="text-lg font-semibold">Preparar gravação</h2><p className="max-w-prose text-sm text-muted-foreground">O que dizer e o que mostrar, pela ordem do roteiro. A IA prepara as sugestões; tu só revês.</p></div>{variante&&<Button disabled={busy||api.iaDisponivel===false||emCurso||variante.cenas.some(c=>!c.locucao.trim())} onClick={()=>abrirPedido({modo:'visual',variante_id:variante.id})}><Sparkles/>Preparar plano com IA</Button>}</div>
     {!variante?<p className="text-sm">Escolhe um roteiro primeiro.</p>:<><PlanoGravacao variante={variante} ppm={brief.ppm} erro={setErro}/><details><summary className="cursor-pointer text-sm text-muted-foreground">Ajustar indicações visuais</summary><fieldset disabled={busy} className="mt-4 flex flex-col gap-5">{variante.cenas.map((c,i)=><section key={c.id} className="flex flex-col gap-3"><label className="flex flex-col gap-1 text-sm">{i+1}. {c.etapa} · imagem, corte ou texto no ecrã<Textarea value={c.visual} maxLength={1000} onChange={e=>alterarCena(i,{visual:e.target.value})}/></label><label className="flex flex-col gap-1 text-sm">Palavras para procurar imagens<Input className="min-h-11 text-base sm:text-sm" value={c.palavras.join(', ')} onChange={e=>alterarCena(i,{palavras:e.target.value.split(',').slice(0,12).map(p=>p.trim().slice(0,100))})}/></label></section>)}<label className="flex flex-col gap-1 text-sm">Notas gerais de edição<Textarea value={variante.notas} maxLength={4000} onChange={e=>alterarVariante({...variante,notas:e.target.value})}/></label></fieldset></details></>}
    </TabsContent>
    <TabsContent value="historico" className="flex flex-col gap-4"><h2 className="text-lg font-semibold">Versões guardadas</h2><p className="text-sm text-muted-foreground">Recuperar carrega uma versão para revisão. Só “Guardar versão” confirma a alteração.</p>{historico.map(v => <div key={v.revisao} className="flex flex-wrap items-center justify-between gap-3 border-b py-3"><p className="text-sm">Versão {v.revisao} · {data(v.criado_em)} · {v.documento.variantes.length} {v.documento.variantes.length === 1 ? 'opção' : 'opções'} de escrita</p><Button variant="outline" disabled={busy || dirty || v.revisao === roteiro.revisao} onClick={() => { setRemovido(null); setBrief(v.brief); alterarDoc(v.documento); setTab('texto'); }}>Recuperar versão {v.revisao}</Button></div>)}{dirty && <p className="text-sm text-muted-foreground">Guarda as alterações atuais antes de recuperar outra versão.</p>}</TabsContent>
   </Tabs></section>
  </div>}

  <AlertDialog open={confirmarIA} onOpenChange={setConfirmarIA}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{pedidoRefino?.modo==='trecho'?'Preparar três alternativas para esta secção?':pedidoRefino?.modo==='visual'?'Preparar o plano de gravação?':`Gerar ${brief.frameworks.length} roteiros para comparar?`}</AlertDialogTitle><AlertDialogDescription>Um pedido pago à DeepSeek. A fonte e as alterações são guardadas primeiro. Só aplicas a proposta que escolheres; as outras secções ficam preservadas.</AlertDialogDescription></AlertDialogHeader>{pedidoRefino?.modo==='trecho'&&<fieldset><legend className="mb-3 text-sm">Que mudança procuras?</legend><ToggleGroup type="single" variant="outline" className="flex-wrap justify-start" value={pedidoRefino.estilo??'alternativa'} onValueChange={v=>{if(v)setPedidoRefino({...pedidoRefino,estilo:v as EstiloTrecho});}}>{[['alternativa','Outra abordagem'],['pergunta','Uma pergunta'],['direto','Mais direto'],['mais_curto','Mais curto']].map(([v,l])=><ToggleGroupItem key={v} value={v}>{l}</ToggleGroupItem>)}</ToggleGroup></fieldset>}<AlertDialogFooter><AlertDialogCancel>Voltar ao roteiro</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={gerar}>{pedidoRefino?.modo==='visual'?'Preparar plano':pedidoRefino?'Gerar alternativas':'Gerar propostas'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  <AlertDialog open={!!sairPara} onOpenChange={open => { if (!open) setSairPara(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Tens alterações por guardar</AlertDialogTitle><AlertDialogDescription>{roteiro?'Guarda a versão e continua, ou volta à edição.':'Guarda a fonte no editor antes de sair, ou continua a preencher.'}</AlertDialogDescription></AlertDialogHeader>{erro&&<p role="alert" className="text-sm text-destructive">{erro}</p>}<AlertDialogFooter><AlertDialogCancel disabled={busy}>Continuar a editar</AlertDialogCancel>{roteiro&&<Button disabled={busy} onClick={()=>executar(async()=>{const dest=sairPara!;await guardado();setSairPara(null);navigate(dest);})}>Guardar e sair</Button>}<AlertDialogAction disabled={busy} className="bg-secondary text-secondary-foreground hover:bg-secondary/80" onClick={() => { const dest = sairPara!; dirtyRef.current = false; setDirty(false); setSairPara(null); navigate(dest); }}>Sair sem guardar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
 </div>;
}

export function ListaRoteiros({ api, projectId }: { api: ApiRoteiros; projectId: string }) {
 const [itens, setItens] = useState<Roteiro[] | null>(null); const [erro, setErro] = useState(''); const [tentativa, setTentativa] = useState(0);
 useEffect(() => { let alive = true; setItens(null); setErro(''); api.listar(projectId).then(r => alive && setItens(r)).catch(e => alive && setErro(e.message)); return () => { alive = false; }; }, [api, projectId, tentativa]);
 return <div className="mx-auto flex max-w-5xl flex-col gap-6 p-4 sm:p-6"><header className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-semibold">Roteiros de Reels</h1><p className="mt-2 text-sm text-muted-foreground">Texto para gravar, com a fonte e as versões sempre à mão.</p></div><Button asChild><Link to={`${BASE}/novo`}><Plus aria-hidden />Criar roteiro</Link></Button></header>{erro && <Alert variant="destructive"><AlertTitle>Não foi possível carregar</AlertTitle><AlertDescription>{erro}<Button variant="outline" onClick={() => setTentativa(n => n + 1)}>Tentar novamente</Button></AlertDescription></Alert>}{!itens && !erro && <Skeleton className="h-32 w-full" />}{itens?.length === 0 && <p className="py-8 text-sm text-muted-foreground">Ainda não há roteiros nesta marca. Escolhe uma notícia aprovada na Curadoria ou cola o teu texto.</p>}<ul className="flex flex-col">{itens?.map(r => <li key={r.id} className="flex flex-wrap items-center justify-between gap-4 border-b py-5"><div className="min-w-0 flex-1"><h2 className="break-words font-semibold">{r.documento.variantes.find(v => v.id === r.documento.selecionada)?.titulo ?? r.fonte.titulo}</h2><p className="mt-1 text-xs text-muted-foreground">{r.brief.duracao} s pretendidos · versão {r.revisao} · {data(r.atualizado_em)}</p></div><Button asChild variant="outline"><Link to={`${BASE}/${r.id}`}>Abrir roteiro</Link></Button></li>)}</ul>{itens?.length === 100 && <p className="text-sm text-muted-foreground">A mostrar os 100 roteiros mais recentes desta marca.</p>}</div>;
}
