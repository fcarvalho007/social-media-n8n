import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, Check, ChevronRight, Copy, Download, FileText, Loader2, Plus, Save, Sparkles, Trash2, Undo2, X } from 'lucide-react';
import { PlanoGravacao } from './PlanoGravacao';
import { MateriaisGravacao } from './MateriaisGravacao';
import type { ApiMateriais } from '@/services/roteiros-materiais';
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
type Escolha = number | 'fora' | null;
/** Block-by-block assembly: each block shows one version per framework side by side; the result is one script. */
function Montagem({ g, ppm, busy, onCriar, onFechar }: { g: GeracaoRoteiro; ppm: number; busy: boolean; onCriar: (v: VarianteRoteiro) => void; onFechar?: () => void }) {
 const vs = g.resultado!.variantes; const n = Math.max(...vs.map(v => v.cenas.length));
 const [esc, setEsc] = useState<Escolha[]>(() => Array(n).fill(null));
 const definir = (i: number, e: Escolha) => setEsc(x => x.map((y, k) => k === i ? e : y));
 const escolhidas = esc.map((e, i) => typeof e === 'number' ? vs[e].cenas[i] : null).filter((c): c is CenaRoteiro => !!c);
 const feito = esc.every(e => e !== null) && escolhidas.length > 0;
 const criar = () => { const base = vs[esc.find((e): e is number => typeof e === 'number') ?? 0]; onCriar({ id: crypto.randomUUID(), framework: base.framework, titulo: base.titulo, notas: '', cenas: escolhidas.map(c => ({ ...c, id: crypto.randomUUID() })) }); };
 return <section aria-label="Montar o roteiro" className="flex flex-col gap-5">
  <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">Montar o roteiro, bloco a bloco</h2><p className="mt-1 text-sm text-muted-foreground">Para cada bloco, aprova a versão que preferes ou retira-o. No fim fica um roteiro único, que ainda podes limar.</p></div>{onFechar && <Button variant="ghost" onClick={onFechar}>Voltar ao roteiro atual</Button>}</div>
  {Array.from({ length: n }, (_, i) => <div key={i} className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:p-5">
   <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-medium">Bloco {i + 1}</h3><Button size="sm" variant={esc[i] === 'fora' ? 'secondary' : 'ghost'} className="min-h-11" onClick={() => definir(i, esc[i] === 'fora' ? null : 'fora')}><X aria-hidden />{esc[i] === 'fora' ? 'Retirado · repor' : 'Não quero este bloco'}</Button></div>
   <div className={`grid min-w-0 gap-3 ${vs.length > 1 ? 'md:grid-cols-2' : ''} ${vs.length > 2 ? 'xl:grid-cols-3' : ''} ${esc[i] === 'fora' ? 'opacity-50' : ''}`}>
    {vs.map((v, k) => { const c = v.cenas[i]; const sel = esc[i] === k; return c ? <article key={v.id} className={`flex min-w-0 flex-col gap-3 rounded-lg border p-4 transition-colors ${sel ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:border-muted-foreground/40'}`}>
     <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{nomeFramework(v.framework)} · {c.etapa}</p>
     <p className="whitespace-pre-wrap break-words text-base leading-relaxed">{c.locucao}</p>
     <p className="text-xs text-muted-foreground">{palavras(c.locucao)} palavras · ~{segundos(c.locucao, ppm)} s{c.referencias.length ? ` · ${c.referencias.map(r => `§${r}`).join(', ')}` : ''}</p>
     <Button className="mt-auto min-h-11" variant={sel ? 'default' : 'outline'} disabled={esc[i] === 'fora'} onClick={() => definir(i, sel ? null : k)}>{sel ? <><Check aria-hidden />Aprovada</> : 'Aprovar esta versão'}</Button>
    </article> : <div key={v.id} className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">{nomeFramework(v.framework)} não tem este bloco.</div>; })}
   </div>
  </div>)}
  <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4"><p className="text-sm text-muted-foreground" role="status">{esc.filter(e => e !== null).length} de {n} blocos decididos · {escolhidas.length} no roteiro · ~{segundos(escolhidas.map(c => c.locucao).join(' '), ppm)} s</p><Button disabled={busy || !feito} onClick={criar}>Criar roteiro único<ChevronRight aria-hidden /></Button></div>
 </section>;
}
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

export function EditorRoteiro({ api, projectId, curadoria = API_CURADORIA, materiais }: { api: ApiRoteiros; projectId: string; curadoria?: typeof API_CURADORIA; materiais?: ApiMateriais }) {
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
 const [erro, setErro] = useState<string | null>(null); const [tab, setTab] = useState('texto');
 const [geracoes, setGeracoes] = useState<GeracaoRoteiro[]>([]); const [historico, setHistorico] = useState<VersaoRoteiro[]>([]);
 const [confirmarIA, setConfirmarIA] = useState(false); const [sairPara, setSairPara] = useState<string | null>(null);
 const [removido,setRemovido] = useState<{varianteId:string;cena:CenaRoteiro;indice:number}|null>(null);
 const [pedidoRefino,setPedidoRefino] = useState<PedidoRefinamento | undefined>();
 const [jobsRefresh, setJobsRefresh] = useState(0);
 const [montar, setMontar] = useState<string | null>(null); const [descartadas, setDescartadas] = useState<string[]>([]);
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
  setGeracoes(old=>[g,...old.filter(x=>x.id!==g.id)]);if(!g.contexto){setMontar(g.id);setTab('texto');}setJobsRefresh(n=>n+1);
 });
 const aplicar = (g:GeracaoRoteiro,v:VarianteRoteiro) => executar(async()=>{
  let nova=v;
  if(g.contexto){const origem=doc.variantes.find(x=>x.id===g.contexto!.variante_id);if(!origem)throw new Error('A versão de origem já não está disponível.');nova=aplicarRefinamento(origem,v,g.contexto);nova.id=v.id;}
  await guardado({variantes:[...doc.variantes,nova],selecionada:nova.id});setTab(g.contexto?.modo==='visual'?'edicao':'texto');
 });
 const completa = geracoes.find(g => !g.contexto);
 const montagem = completa && completa.estado === 'concluida' && completa.resultado && (montar === completa.id || !variante) ? completa : null;
 const criarUnico = (v: VarianteRoteiro) => executar(async () => { await guardado({ variantes: [...doc.variantes, v], selecionada: v.id }); setMontar(null); toast.success('Roteiro único criado. Podes limar cada bloco.'); });
 const abrirBriefing = () => { const d = opcoesGeracao.current; if (d) { d.open = true; d.scrollIntoView({ block: 'start', behavior: 'smooth' }); } };
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
  {roteiro && fonte && <nav aria-label="Passos do roteiro"><ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
   <li><Link to={BASE} className="rounded px-1 hover:text-foreground">Roteiros</Link></li>
   {([['briefing','Fonte e briefing'],['texto','Roteiro'],['edicao','Preparar gravação'],['historico','Histórico']] as const).map(([k,l])=><li key={k} className="flex items-center gap-1"><ChevronRight className="size-3.5" aria-hidden/><button type="button" aria-current={tab===k?'step':undefined} className={`min-h-9 rounded px-1 hover:text-foreground ${tab===k?'font-medium text-foreground':''}`} onClick={()=>k==='briefing'?abrirBriefing():k==='historico'?void executar(async()=>{setTab('historico');setHistorico(await api.historico(roteiro.id));}):setTab(k)}>{l}</button></li>)}
  </ol></nav>}
  {roteiro && fonte && <div className="flex min-w-0 flex-col gap-6">
   <details className="rounded-xl border bg-card p-4"><summary className="cursor-pointer break-words font-medium">Consultar fonte · {fonte.titulo}</summary>{fonte.nivel==='resumo'&&<p className="mt-3 text-xs text-muted-foreground">Só título/resumo disponível nesta fonte.</p>}<div className="mt-4 flex max-h-72 flex-col gap-3 overflow-auto text-sm leading-relaxed">{paragrafos(fonte.texto).map((p,i)=><p key={i} className="break-words"><span className="mr-1 text-xs text-muted-foreground">§{i+1}</span>{p}</p>)}</div>{fonte.url&&/^https?:\/\//i.test(fonte.url)&&<a href={fonte.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm underline">Abrir artigo original</a>}</details>
   <details ref={opcoesGeracao} open={!variante} className="rounded-xl border bg-card p-4 sm:p-5"><summary className="cursor-pointer text-sm font-medium">{variante?'Gerar outras versões':'Gerar o primeiro roteiro'} · {brief.duracao} s · {brief.frameworks.length} {brief.frameworks.length===1?'estrutura':'estruturas'}</summary><section aria-label="Gerar roteiros" className="mt-5 flex flex-col gap-5"><fieldset disabled={busy}><Brief value={brief} onChange={b=>{setBrief(b);setDirty(true);}}/></fieldset><div className="flex flex-wrap items-center gap-3"><Button disabled={busy||!validarBrief(brief)||api.iaDisponivel===false||emCurso} onClick={()=>abrirPedido()}><Sparkles/>Gerar e comparar roteiros</Button><p className="text-xs text-muted-foreground">{emCurso?'Há um pedido em curso. O resultado aparece no roteiro.':api.iaDisponivel===false?'Ativa a DeepSeek no topo para testar IA local.':`${brief.frameworks.length} propostas · sugestões visuais incluídas`}</p></div><details><summary className="cursor-pointer text-xs text-muted-foreground">Prefiro começar sem IA</summary><Button className="mt-3" variant="outline" disabled={busy||doc.variantes.length>=20} onClick={novaEstrutura}><Plus/>Escrever manualmente</Button></details></section></details>
   <section className="flex min-w-0 flex-col gap-4"><Tabs value={tab} onValueChange={v => { setTab(v); if (v === 'historico') void executar(async () => setHistorico(await api.historico(roteiro.id))); }}>
    <TabsList className="h-auto w-full flex-wrap justify-start"><TabsTrigger value="texto" className="min-h-11">Roteiro</TabsTrigger><TabsTrigger value="edicao" className="min-h-11">Preparar gravação</TabsTrigger><TabsTrigger value="historico" className="min-h-11">Histórico</TabsTrigger></TabsList>
    <TabsContent value="texto" className="flex flex-col gap-5">
     {completa && completa.estado !== 'concluida' && <p role="status" className="flex items-center gap-2 rounded-xl border bg-card p-4 text-sm text-muted-foreground">{completa.estado === 'a_processar' && Date.now() - Date.parse(completa.criado_em) < 300000 ? <><Loader2 className="size-4 animate-spin" aria-hidden />A preparar as versões de cada bloco…</> : completa.estado === 'a_processar' ? 'A resposta não foi confirmada. Não há repetição automática.' : completa.erro}</p>}
     {montagem ? <Montagem key={montagem.id} g={montagem} ppm={brief.ppm} busy={busy} onCriar={criarUnico} onFechar={variante ? () => setMontar(null) : undefined} /> : !variante ? <div className="flex flex-col gap-3 py-8"><FileText className="size-8 text-muted-foreground" aria-hidden /><h2 className="text-lg font-semibold">A fonte está guardada. Agora, a tua versão.</h2><p className="text-sm text-muted-foreground">Gera propostas para comparar ou começa por uma estrutura em branco.</p><Button className="self-start" variant="outline" onClick={novaEstrutura}>Começar a escrever</Button></div> : <>
      {completa?.estado==='concluida'&&<Button variant="outline" className="self-start" onClick={()=>setMontar(completa.id)}>Remontar a partir das propostas</Button>}<label className="flex flex-col gap-2 text-sm">Versão de escrita<Select disabled={busy} value={variante.id} onValueChange={v => alterarDoc({ ...doc, selecionada: v })}><SelectTrigger className="min-w-0"><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{doc.variantes.map((v, i) => <SelectItem key={v.id} value={v.id} className="max-w-sm break-words">{i + 1}. {nomeFramework(v.framework)} · {v.titulo}</SelectItem>)}</SelectGroup></SelectContent></Select></label>
      <fieldset disabled={busy} className="flex min-w-0 flex-col gap-5"><label className="flex flex-col gap-1 text-sm">Título do roteiro<Input className="min-h-11 text-base sm:text-sm" value={variante.titulo} maxLength={200} onChange={e => alterarVariante({ ...variante, titulo: e.target.value })} /></label>
       <p className="text-sm text-muted-foreground" role="status">{palavras(textoLimpo(variante))} palavras · cerca de {segundos(textoLimpo(variante), brief.ppm)} s de leitura · objetivo {brief.duracao} s</p>
       {segundos(textoLimpo(variante), brief.ppm) > brief.duracao * 1.2 && <p className="text-sm text-muted-foreground">O texto está acima da duração pretendida. Encurta uma ideia ou aumenta o tempo no briefing.</p>}
       {variante.cenas.map((c, i) => <div key={c.id} className="flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-2"><Label htmlFor={`cena-${c.id}`}>{i + 1}. {c.etapa}</Label><div className="flex flex-wrap gap-1"><Button size="sm" className="min-h-11" variant="outline" disabled={busy||api.iaDisponivel===false||emCurso} aria-label={`Regenerar com IA · ${c.etapa}`} onClick={()=>abrirPedido({modo:'trecho',variante_id:variante.id,cena_id:c.id,estilo:'alternativa'})}><Sparkles/>Regenerar com IA</Button>{([-1, 1] as const).map(d => <Button key={d} size="icon" className="min-h-11 min-w-11" variant="ghost" aria-label={`${d < 0 ? 'Subir' : 'Descer'} trecho ${i + 1}`} disabled={i + d < 0 || i + d >= variante.cenas.length} onClick={() => { const cenas = [...variante.cenas]; [cenas[i], cenas[i + d]] = [cenas[i + d], cenas[i]]; alterarVariante({ ...variante, cenas }); }}>{d < 0 ? <ArrowUp /> : <ArrowDown />}</Button>)}<Button size="icon" className="min-h-11 min-w-11" variant="ghost" aria-label={`Remover trecho ${i + 1}`} disabled={variante.cenas.length === 1} onClick={()=>removerCena(i)}><Trash2 /></Button></div></div><TextoLocucao id={`cena-${c.id}`} value={c.locucao} onChange={locucao => alterarCena(i, { locucao })} />{(()=>{const alt=geracoes.find(g=>g.contexto?.modo==='trecho'&&g.contexto.cena_id===c.id&&g.contexto.variante_id===variante.id&&!descartadas.includes(g.id));if(!alt)return null;return <div className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 sm:p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="flex items-center gap-2 text-sm font-medium"><Sparkles className="size-4 text-primary" aria-hidden/>Alternativas para «{c.etapa}»</p><Button size="sm" variant="ghost" onClick={()=>setDescartadas(d=>[...d,alt.id])}>Manter o atual</Button></div>{alt.estado!=='concluida'?<p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">{alt.estado==='a_processar'?<><Loader2 className="size-4 animate-spin" aria-hidden/>A preparar alternativas…</>:alt.erro}</p>:<div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-3">{alt.resultado?.variantes.map((v,k)=><article key={v.id} className="flex min-w-0 flex-col gap-3 rounded-lg border bg-card p-3"><p className="text-xs font-medium text-muted-foreground">Opção {k+1}</p><p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{v.cenas[0]?.locucao}</p><Button size="sm" className="mt-auto min-h-11" disabled={busy} onClick={()=>aplicar(alt,v)}>Usar esta alternativa</Button></article>)}</div>}</div>;})()}{c.referencias.length > 0 && <p className="text-xs text-muted-foreground">Referências sugeridas: {c.referencias.map(n => `§${n}`).join(', ')} · revê-as se alterares os factos.</p>}</div>)}
       <Button variant="outline" className="self-start" disabled={variante.cenas.length >= 30} onClick={() => alterarVariante({ ...variante, cenas: [...variante.cenas, { id: crypto.randomUUID(), etapa: 'Novo trecho', locucao: '', visual: '', palavras: [], referencias: [] }] })}><Plus aria-hidden />Adicionar trecho</Button>
      </fieldset>
      {removido&&removido.varianteId===variante.id&&<div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4"><p className="text-sm">Secção «{removido.cena.etapa}» removida.</p><Button variant="outline" disabled={busy||variante.cenas.length>=30} onClick={desfazerRemocao}><Undo2 aria-hidden/>Desfazer remoção</Button></div>}
      <details className="rounded-xl border bg-card p-4"><summary className="cursor-pointer font-medium">Leitura limpa para o BIGVU</summary><p className="mt-4 whitespace-pre-wrap break-words text-base leading-loose">{textoLimpo(variante) || 'Escreve o primeiro trecho para preparar a leitura.'}</p></details>
      <div className="flex flex-wrap gap-2"><Button disabled={!textoLimpo(variante)} onClick={() => copiar(textoLimpo(variante))}><Copy aria-hidden />Copiar para BIGVU</Button><Button variant="outline" disabled={!textoLimpo(variante)} onClick={() => transferir(textoLimpo(variante), 'locucao')}><Download aria-hidden />Descarregar TXT</Button></div>
     </>}
    </TabsContent>
    <TabsContent value="edicao" className="flex flex-col gap-5"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex flex-col gap-2"><h2 className="text-lg font-semibold">Preparar gravação</h2><p className="max-w-prose text-sm text-muted-foreground">O que dizer e o que mostrar, pela ordem do roteiro. A IA prepara as sugestões; tu só revês.</p></div>{variante&&<Button disabled={busy||api.iaDisponivel===false||emCurso||variante.cenas.some(c=>!c.locucao.trim())} onClick={()=>abrirPedido({modo:'visual',variante_id:variante.id})}><Sparkles/>Preparar plano com IA</Button>}</div>
     {!variante?<p className="text-sm">Escolhe um roteiro primeiro.</p>:<>{(()=>{const pv=geracoes.find(g=>g.contexto?.modo==='visual'&&g.contexto.variante_id===variante.id&&!descartadas.includes(g.id));if(!pv)return null;return <div className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4"><p className="text-sm font-medium">Plano de gravação proposto</p>{pv.estado!=='concluida'?<p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">{pv.estado==='a_processar'?<><Loader2 className="size-4 animate-spin" aria-hidden/>A preparar o plano…</>:pv.erro}</p>:pv.resultado?.variantes.slice(0,1).map(v=><div key={v.id} className="flex flex-col gap-3"><p className="whitespace-pre-wrap text-sm leading-relaxed">{v.cenas.map(c=>`${c.etapa}: ${c.visual}`).join('\n\n')}</p><div className="flex gap-2"><Button disabled={busy} onClick={()=>aplicar(pv,v)}>Aplicar plano</Button><Button variant="ghost" onClick={()=>setDescartadas(d=>[...d,pv.id])}>Descartar</Button></div></div>)}</div>;})()}<MateriaisGravacao variante={variante} ppm={brief.ppm} projectId={roteiro.project_id} api={materiais} onMudar={alterarVariante} desativado={busy} erro={setErro} onGuardar={async v=>{if(lock.current)throw new Error("Aguarda a gravação atual.");lock.current=true;setBusy(true);setErro(null);try{await guardado({...doc,variantes:doc.variantes.map(x=>x.id===v.id?v:x)});toast.success("Sequência revista e guardada");}finally{lock.current=false;setBusy(false);}}}/><PlanoGravacao variante={variante} ppm={brief.ppm} erro={setErro}/><details><summary className="cursor-pointer text-sm text-muted-foreground">Ajustar indicações visuais</summary><fieldset disabled={busy} className="mt-4 flex flex-col gap-5">{variante.cenas.map((c,i)=><section key={c.id} className="flex flex-col gap-3"><label className="flex flex-col gap-1 text-sm">{i+1}. {c.etapa} · imagem, corte ou texto no ecrã<Textarea value={c.visual} maxLength={1000} onChange={e=>alterarCena(i,{visual:e.target.value})}/></label><label className="flex flex-col gap-1 text-sm">Palavras para procurar imagens<Input className="min-h-11 text-base sm:text-sm" value={c.palavras.join(', ')} onChange={e=>alterarCena(i,{palavras:e.target.value.split(',').slice(0,12).map(p=>p.trim().slice(0,100))})}/></label></section>)}<label className="flex flex-col gap-1 text-sm">Notas gerais de edição<Textarea value={variante.notas} maxLength={4000} onChange={e=>alterarVariante({...variante,notas:e.target.value})}/></label></fieldset></details></>}
    </TabsContent>
    <TabsContent value="historico" className="flex flex-col gap-4"><h2 className="text-lg font-semibold">Versões guardadas</h2><p className="text-sm text-muted-foreground">Recuperar carrega uma versão para revisão. Só “Guardar versão” confirma a alteração.</p>{historico.map(v => <div key={v.revisao} className="flex flex-wrap items-center justify-between gap-3 border-b py-3"><p className="text-sm">Versão {v.revisao} · {data(v.criado_em)} · {v.documento.variantes.length} {v.documento.variantes.length === 1 ? 'opção' : 'opções'} de escrita</p><Button variant="outline" disabled={busy || dirty || v.revisao === roteiro.revisao} onClick={() => { setRemovido(null); setBrief(v.brief); alterarDoc(v.documento); setTab('texto'); }}>Recuperar versão {v.revisao}</Button></div>)}{dirty && <p className="text-sm text-muted-foreground">Guarda as alterações atuais antes de recuperar outra versão.</p>}</TabsContent>
   </Tabs></section>
  </div>}

  <AlertDialog open={confirmarIA} onOpenChange={setConfirmarIA}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{pedidoRefino?.modo==='trecho'?'Gerar alternativas para este bloco?':pedidoRefino?.modo==='visual'?'Preparar o plano de gravação?':`Gerar ${brief.frameworks.length} roteiros para comparar?`}</AlertDialogTitle><AlertDialogDescription>Um pedido pago à DeepSeek. {pedidoRefino?.modo==='trecho'?'As alternativas aparecem lado a lado logo abaixo do bloco; ficas na mesma página e escolhes qual usar.':'As versões aparecem bloco a bloco, lado a lado, para aprovares a melhor de cada.'} Nada é aplicado sem a tua escolha.</AlertDialogDescription></AlertDialogHeader>{pedidoRefino?.modo==='trecho'&&<fieldset><legend className="mb-3 text-sm">Que mudança procuras?</legend><ToggleGroup type="single" variant="outline" className="flex-wrap justify-start" value={pedidoRefino.estilo??'alternativa'} onValueChange={v=>{if(v)setPedidoRefino({...pedidoRefino,estilo:v as EstiloTrecho});}}>{[['alternativa','Outra abordagem'],['pergunta','Uma pergunta'],['direto','Mais direto'],['mais_curto','Mais curto']].map(([v,l])=><ToggleGroupItem key={v} value={v}>{l}</ToggleGroupItem>)}</ToggleGroup></fieldset>}<AlertDialogFooter><AlertDialogCancel>Voltar ao roteiro</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={gerar}>{pedidoRefino?.modo==='visual'?'Preparar plano':pedidoRefino?'Gerar alternativas':'Gerar propostas'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  <AlertDialog open={!!sairPara} onOpenChange={open => { if (!open) setSairPara(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Tens alterações por guardar</AlertDialogTitle><AlertDialogDescription>{roteiro?'Guarda a versão e continua, ou volta à edição.':'Guarda a fonte no editor antes de sair, ou continua a preencher.'}</AlertDialogDescription></AlertDialogHeader>{erro&&<p role="alert" className="text-sm text-destructive">{erro}</p>}<AlertDialogFooter><AlertDialogCancel disabled={busy}>Continuar a editar</AlertDialogCancel>{roteiro&&<Button disabled={busy} onClick={()=>executar(async()=>{const dest=sairPara!;await guardado();setSairPara(null);navigate(dest);})}>Guardar e sair</Button>}<AlertDialogAction disabled={busy} className="bg-secondary text-secondary-foreground hover:bg-secondary/80" onClick={() => { const dest = sairPara!; dirtyRef.current = false; setDirty(false); setSairPara(null); navigate(dest); }}>Sair sem guardar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
 </div>;
}

export function ListaRoteiros({ api, projectId }: { api: ApiRoteiros; projectId: string }) {
 const [itens, setItens] = useState<Roteiro[] | null>(null); const [erro, setErro] = useState(''); const [tentativa, setTentativa] = useState(0);
 useEffect(() => { let alive = true; setItens(null); setErro(''); api.listar(projectId).then(r => alive && setItens(r)).catch(e => alive && setErro(e.message)); return () => { alive = false; }; }, [api, projectId, tentativa]);
 return <div className="mx-auto flex max-w-5xl flex-col gap-6 p-4 sm:p-6"><header className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-semibold">Roteiros de Reels</h1><p className="mt-2 text-sm text-muted-foreground">Texto para gravar, com a fonte e as versões sempre à mão.</p></div><Button asChild><Link to={`${BASE}/novo`}><Plus aria-hidden />Criar roteiro</Link></Button></header>{erro && <Alert variant="destructive"><AlertTitle>Não foi possível carregar</AlertTitle><AlertDescription>{erro}<Button variant="outline" onClick={() => setTentativa(n => n + 1)}>Tentar novamente</Button></AlertDescription></Alert>}{!itens && !erro && <Skeleton className="h-32 w-full" />}{itens?.length === 0 && <p className="py-8 text-sm text-muted-foreground">Ainda não há roteiros nesta marca. Escolhe uma notícia aprovada na Curadoria ou cola o teu texto.</p>}<ul className="flex flex-col">{itens?.map(r => <li key={r.id} className="flex flex-wrap items-center justify-between gap-4 border-b py-5"><div className="min-w-0 flex-1"><h2 className="break-words font-semibold">{r.documento.variantes.find(v => v.id === r.documento.selecionada)?.titulo ?? r.fonte.titulo}</h2><p className="mt-1 text-xs text-muted-foreground">{r.brief.duracao} s pretendidos · versão {r.revisao} · {data(r.atualizado_em)}</p></div><Button asChild variant="outline"><Link to={`${BASE}/${r.id}`}>Abrir roteiro</Link></Button></li>)}</ul>{itens?.length === 100 && <p className="text-sm text-muted-foreground">A mostrar os 100 roteiros mais recentes desta marca.</p>}</div>;
}
