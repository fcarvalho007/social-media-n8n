import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Newspaper, BookOpen, ClipboardPaste, ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { chaveRecuperacao, guardarRecuperacao, lerRecuperacao } from '@/lib/recuperacaoLocal';
import { prepararTextoCampanha, schemaTextoCampanha, type FonteCampanha } from './modelo';
import { PercursoCampanha } from './PercursoCampanha';
import type { ReferenciaDescoberta } from './api';
import { ambitoAcervo, type DocumentoAcervo } from '../documentos/modelo';
import { listarAcervo } from '../documentos/acervoLocal';
import { GaleriaDocumentos } from '../documentos/GaleriaDocumentos';
import { lerEstadoBiblioteca, selecionarIntervalo } from '../documentos/interface';
import { PaginacaoDocumentos } from '../documentos/ControlosDocumentos';
import { schemaRascunhoTextoCampanha } from './rascunhoFonte';
const Noticias = lazy(() => import('../curadoria/CuradoriaNoticias').then(m => ({ default: m.CuradoriaNoticias })));
const opcoes = [
  { tipo: 'noticia', nome: 'Uma notícia', texto: 'Escolhe uma notícia aprovada na Curadoria.', icon: Newspaper },
  { tipo: 'documento', nome: 'Um estudo ou PDF', texto: 'Seleciona as páginas relevantes do teu acervo.', icon: BookOpen },
  { tipo: 'texto', nome: 'Colar conteúdo', texto: 'Parte de um texto, apontamentos ou uma ideia desenvolvida.', icon: ClipboardPaste },
];
export function EscolherFonteCampanha({ userId, projetoId, aoEscolher, aoColar }: { userId: string; projetoId: string; aoEscolher: (r: ReferenciaDescoberta) => void; aoColar: (f: FonteCampanha) => void }) {
  const [params, setParams] = useSearchParams();
  const inicio=useRef<HTMLDivElement>(null),titulo=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{inicio.current?.scrollIntoView?.({block:'start'});titulo.current?.focus({preventScroll:true});},[]);
  const tipo = params.get('origem');
  return <div ref={inicio} className="flex min-w-0 scroll-mt-28 flex-col gap-7">
    <PercursoCampanha passo={1} />
    <section aria-labelledby="campanha-fonte-titulo" className="flex min-w-0 flex-col gap-5">
      <div><p className="mb-2 text-xs font-medium uppercase tracking-wide text-primary">Passo 1 de 4</p><h2 ref={titulo} tabIndex={-1} id="campanha-fonte-titulo" className="text-xl font-semibold focus:outline-none">De onde parte esta campanha?</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">Escolhe uma fonte. Depois defines o objetivo, conferes o plano e trabalhas as peças nos editores do Hub.</p></div>
      <div className="grid gap-3 md:grid-cols-3">{opcoes.map(o => <button type="button" key={o.tipo} aria-pressed={tipo === o.tipo} onClick={() => setParams({ origem: o.tipo })} className={`flex min-w-0 items-start gap-3 rounded-xl border p-5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${tipo === o.tipo ? 'border-primary bg-primary/5' : 'bg-card hover:border-primary/40 hover:bg-muted/30'}`}><o.icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden /><span className="min-w-0"><span className="block font-semibold">{o.nome}</span><span className="mt-2 block text-sm leading-relaxed text-muted-foreground">{o.texto}</span></span></button>)}</div>
      {tipo === 'noticia' ? <Suspense fallback={<p role="status">A abrir notícias aprovadas…</p>}><Noticias selecionar={f => aoEscolher({ tipo: 'noticia', id: f.noticia_id, paginas: [] })} /></Suspense> : tipo === 'documento' ? <EscolherEstudo key={projetoId} userId={userId} projetoId={projetoId} aoEscolher={aoEscolher} /> : tipo === 'texto' ? <ColarFonte key={`${userId}:${projetoId}`} userId={userId} projetoId={projetoId} aoColar={aoColar} /> : <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">No final terás um plano com as peças que escolheres: artigo, destaque na newsletter, Story, carrossel ou continuidade. Cada peça tem um objetivo e um momento sugerido.</p>}
    </section>
  </div>;
}
function ColarFonte({ userId, projetoId, aoColar }: { userId: string; projetoId: string; aoColar: (f: FonteCampanha) => void }) {
  const chave = chaveRecuperacao(userId, 'fonte-campanha', 'texto', projetoId);
  const [form, setForm] = useState(() => { const r = schemaRascunhoTextoCampanha.safeParse(lerRecuperacao(chave, userId)?.dados); return r.success ? r.data : { titulo: '', texto: '', url: '' }; });
  const [erro, setErro] = useState(''), [busy, setBusy] = useState(false); const ocupado = useRef(false);
  useEffect(() => { if (form.titulo || form.texto || form.url) guardarRecuperacao(chave, form); }, [chave, form]);
  return <form noValidate onSubmit={async e => { e.preventDefault(); if (ocupado.current) return; const r=schemaTextoCampanha.safeParse(form);if(!r.success){setErro(r.error.issues.map(i=>i.message).join(' '));return;}ocupado.current = true; setBusy(true); setErro(''); try { const f = await prepararTextoCampanha(r.data); guardarRecuperacao(chave, form); aoColar(f); } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível usar este conteúdo.'); } finally { ocupado.current = false; setBusy(false); } }} className="flex max-w-3xl flex-col gap-5 rounded-xl border bg-card p-5 sm:p-7">
    <div><h3 className="text-lg font-semibold">O conteúdo de partida</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Cola o material que queres desenvolver. A campanha conserva uma cópia; confirmar a origem e os factos continua a fazer parte da revisão.</p></div>
    <fieldset disabled={busy} className="flex min-w-0 flex-col gap-5"><div className="flex flex-col gap-2"><Label htmlFor="fonte-colada-titulo">Título do conteúdo</Label><Input id="fonte-colada-titulo" maxLength={300} className="min-h-11" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} /></div><div className="flex flex-col gap-2"><Label htmlFor="fonte-colada-texto">Conteúdo para a campanha</Label><Textarea id="fonte-colada-texto" rows={9} maxLength={20000} value={form.texto} onChange={e => setForm(f => ({ ...f, texto: e.target.value }))} aria-describedby="fonte-colada-limite" /><p id="fonte-colada-limite" className="text-xs text-muted-foreground">{form.texto.length.toLocaleString('pt-PT')} / 20 000 caracteres · pelo menos 40 para continuar</p></div><div className="flex flex-col gap-2"><Label htmlFor="fonte-colada-url">Ligação à origem · opcional</Label><Input id="fonte-colada-url" type="url" placeholder="https://…" className="min-h-11" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} /><p className="text-xs text-muted-foreground">Se citaste terceiros, acrescenta a fonte pública. Sem ligação, a produção do artigo vai precisar de referências verificáveis.</p></div></fieldset>
    {erro && <Alert variant="destructive"><AlertTitle>Revê o conteúdo de partida</AlertTitle><AlertDescription>{erro}</AlertDescription></Alert>}
    <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4"><p className="text-xs text-muted-foreground">Rascunho recuperável neste navegador, só para esta conta e projeto.</p><Button type="submit" className="min-h-11" disabled={busy}>{busy ? 'A preparar a fonte…' : 'Continuar para a direção'}<ArrowRight className="size-4" aria-hidden /></Button></div>
  </form>;
}
function EscolherEstudo({ userId, projetoId, aoEscolher }: { userId: string; projetoId: string; aoEscolher: (r: ReferenciaDescoberta) => void }) {
  const [params,setParams]=useSearchParams();
  const [docs, setDocs] = useState<DocumentoAcervo[]>([]), [erro, setErro] = useState(''), [carregando, setCarregando] = useState(true), [tentativa, setTentativa] = useState(0);
  const [filtros, setFiltros] = useState(new URLSearchParams()), [pagina, setPagina] = useState(1), [intervalo, setIntervalo] = useState(''), [aviso, setAviso] = useState('');
  const lerPaginas=(p:URLSearchParams)=>new Set((p.get('selecionadas')??'').split(',').map(Number).filter(n=>Number.isInteger(n)&&n>0&&n<=600));
  const id=params.get('estudo'),paginas=lerPaginas(params);
  function setId(id:string|null){setParams(p=>{const n=new URLSearchParams(p);if(id)n.set('estudo',id);else n.delete('estudo');n.delete('selecionadas');return n;});}
  function setPaginas(valor:Set<number>|((s:Set<number>)=>Set<number>)){setParams(p=>{const n=new URLSearchParams(p),s=typeof valor==='function'?valor(lerPaginas(p)):valor;if(s.size)n.set('selecionadas',[...s].sort((a,b)=>a-b).join(','));else n.delete('selecionadas');return n;},{replace:true});}
  useEffect(() => { let vivo = true; setCarregando(true); setErro(''); listarAcervo<DocumentoAcervo>('documentos', ambitoAcervo(userId, projetoId)).then(d => { if (vivo) setDocs(d); }).catch(e => { if (vivo) setErro(e.message); }).finally(() => { if (vivo) setCarregando(false); }); return () => { vivo = false; }; }, [userId, projetoId, tentativa]);
  const d = docs.find(d => d.id === id), escolhidas = d?.pdf.paginas.filter(p => paginas.has(p.n)&&p.texto.trim()) ?? [], texto = escolhidas.map(p => `[Página ${p.n}]\n${p.texto}`).join('\n\n');
  if (erro) return <Alert variant="destructive"><AlertTitle>Não foi possível abrir o acervo</AlertTitle><AlertDescription>{erro}<Button className="mt-3 min-h-11" variant="outline" onClick={() => setTentativa(n => n + 1)}>Tentar novamente</Button></AlertDescription></Alert>;
  return !d ? <div className="flex flex-col gap-4"><p className="text-sm text-muted-foreground">Escolhe o documento. A seguir, selecionas as páginas a usar e continuas nesta campanha.</p><GaleriaDocumentos docs={docs} carregando={carregando} estado={lerEstadoBiblioteca(filtros)} mudar={dados => setFiltros(p => { const n = new URLSearchParams(p); Object.entries(dados).forEach(([k,v]) => v === null ? n.delete(k) : n.set(k, String(v))); return n; })} abrir={d => { setId(d.id); setPagina(1); setAviso(''); }} />{!carregando && !docs.length && <Button variant="outline" className="min-h-11 self-start" asChild><Link to="/curadoria/documentos">Adicionar um PDF ao acervo</Link></Button>}</div> : <section aria-label="Selecionar páginas para a campanha" className="flex flex-col gap-5 rounded-xl border bg-card p-5 sm:p-7">
    <Button variant="ghost" className="min-h-11 self-start px-0" onClick={() => setId(null)}><ArrowLeft className="size-4" aria-hidden />Escolher outro documento</Button><div><h3 className="break-words text-xl font-semibold">{d.titulo}</h3><p className="mt-2 text-sm text-muted-foreground">Escolhe as páginas relevantes. O excerto selecionado acompanha todas as peças.</p></div>
    <div className="flex flex-wrap items-end gap-3"><div className="flex min-w-0 flex-1 flex-col gap-2 sm:max-w-80"><Label htmlFor="campanha-intervalo">Páginas ou intervalos</Label><Input id="campanha-intervalo" placeholder="Por exemplo: 1–3, 7" value={intervalo} onChange={e => setIntervalo(e.target.value)} className="min-h-11" /></div><Button variant="outline" className="min-h-11" onClick={() => { try { const r = selecionarIntervalo(intervalo, d.pdf.paginas); setPaginas(r.selecionadas); setAviso(r.semTexto.length ? `Páginas sem texto excluídas: ${r.semTexto.join(', ')}.` : 'Seleção aplicada.'); } catch (e) { setAviso((e as Error).message); } }}>Aplicar seleção</Button><Button variant="ghost" className="min-h-11" onClick={() => setPaginas(new Set())}>Limpar seleção</Button></div>
    {!d.pdf.paginas.some(p => p.texto.trim()) && <Alert><AlertTitle>Este PDF ainda precisa de texto</AlertTitle><AlertDescription>Abre o documento no acervo para concluir a extração ou reconhecer a digitalização por OCR.<Link className="ml-1 underline" to={`/curadoria/documentos?documento=${encodeURIComponent(d.id)}`}>Abrir documento</Link></AlertDescription></Alert>}
    <ul className="divide-y">{d.pdf.paginas.slice((pagina - 1) * 8, pagina * 8).map(p => <li key={p.n} className="py-3"><label className="flex min-h-11 cursor-pointer items-center gap-3"><Checkbox checked={paginas.has(p.n)} disabled={!p.texto.trim()} onCheckedChange={v => setPaginas(s => { const n = new Set(s); if (v === true) n.add(p.n); else n.delete(p.n); return n; })} /><span className="text-sm font-medium">Página {p.n}{!p.texto.trim() ? ' · sem texto pesquisável' : p.ocr ? ' · texto reconhecido por OCR' : ''}</span></label>{p.texto && <details className="pl-7"><summary className="min-h-11 cursor-pointer py-3 text-sm text-primary underline underline-offset-4">Ler página {p.n}</summary><p className="max-h-64 overflow-y-auto whitespace-pre-wrap break-words pb-3 text-sm leading-relaxed">{p.texto}</p></details>}</li>)}</ul><PaginacaoDocumentos pagina={pagina} total={d.pdf.paginas.length} tamanho={8} onChange={setPagina} nome="páginas do estudo" />
    {aviso && <p role="status" className="text-sm text-muted-foreground">{aviso}</p>}
    <footer className="flex flex-wrap items-center justify-between gap-4 border-t pt-5"><div className="text-sm"><p aria-live="polite">{escolhidas.length} {escolhidas.length === 1 ? 'página selecionada' : 'páginas selecionadas'} · {texto.length.toLocaleString('pt-PT')} / 20 000 caracteres</p>{texto.length < 40 || texto.length > 20000 ? <p className="mt-1 text-xs text-muted-foreground">Seleciona um excerto entre 40 e 20 000 caracteres para continuar.</p> : null}</div><Button className="min-h-11" disabled={texto.length < 40 || texto.length > 20000} onClick={() => aoEscolher({ tipo: 'documento', id: d.id, paginas: escolhidas.map(p=>p.n).sort((a,b) => a-b) })}>Usar páginas e continuar<ArrowRight className="size-4" aria-hidden /></Button></footer>
  </section>;
}
