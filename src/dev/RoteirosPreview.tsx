import { createRoot } from 'react-dom/client';
import { useEffect,useMemo,useState } from 'react';
import { BrowserRouter,Link,Route,Routes,useLocation } from 'react-router-dom';
import { Toaster,toast } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { EditorRoteiro,ListaRoteiros } from '@/features/roteiros/EditorRoteiro';
import { CuradoriaNoticias } from '@/features/curadoria/CuradoriaNoticias';
import { apiRoteirosLocal,curadoriaRoteirosLocal,local } from './roteirosLocal';
import '@/index.css';
function CuradoriaLocal() {
 const [titulo,setTitulo]=useState('');const [texto,setTexto]=useState('');const [version,setVersion]=useState(0);const [busy,setBusy]=useState(false);
 return <main className="mx-auto flex max-w-5xl flex-col gap-6 p-6"><h1 className="text-2xl font-semibold">Curadoria local</h1><details className="rounded-xl border p-4"><summary className="cursor-pointer font-medium">Inserir conteúdo para validar o percurso</summary><form className="mt-4 flex flex-col gap-3" onSubmit={async e=>{e.preventDefault();setBusy(true);try{await local('noticia_criar',{titulo,texto});setTitulo('');setTexto('');setVersion(n=>n+1);toast.success('Conteúdo guardado e aprovado na base local');}catch(e){toast.error((e as Error).message);}finally{setBusy(false);}}}><label>Título<Input value={titulo} maxLength={200} onChange={e=>setTitulo(e.target.value)} /></label><label>Texto original<Textarea value={texto} maxLength={60000} onChange={e=>setTexto(e.target.value)} /></label><Button className="self-start" disabled={busy||!titulo.trim()||texto.trim().length<40}>Guardar notícia local</Button></form></details><CuradoriaNoticias key={version} api={curadoriaRoteirosLocal} /></main>;
}
function ConfigurarIALocal({alterar}:{alterar:(ativo:boolean)=>void}) {
 const [chave,setChave]=useState('');const [limite,setLimite]=useState(3);const [ativo,setAtivo]=useState(false);const [busy,setBusy]=useState(false);const [erro,setErro]=useState('');
 useEffect(()=>{local<{disponivel:boolean;limite:number}>('ia_estado').then(e=>{setAtivo(e.disponivel&&e.limite>0);alterar(e.disponivel&&e.limite>0);}).catch(e=>setErro(e.message));},[alterar]);
 return <details className="mx-auto max-w-5xl px-4 py-3 sm:px-6"><summary className="cursor-pointer text-xs text-muted-foreground">{ativo?'DeepSeek local ativa · pedidos pagos só por confirmação':'Ativar IA na pré-visualização local'}</summary><p className="mt-3 text-sm text-muted-foreground">A chave fica na memória do servidor local até o reiniciares. Não vai para o GitHub ou Lovable. Cada geração usa a tua conta DeepSeek; o limite é diário.</p><form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={async e=>{e.preventDefault();setBusy(true);setErro('');try{await local('ia_configurar',{chave,limite});setChave('');setAtivo(true);alterar(true);toast.success('IA local ativada');}catch(e){setErro((e as Error).message);}finally{setBusy(false);}}}><label className="flex flex-col gap-1 text-sm">Chave DeepSeek<Input type="password" autoComplete="off" value={chave} onChange={e=>setChave(e.target.value)}/></label><label className="flex flex-col gap-1 text-sm">Limite diário de pedidos<Input type="number" min={1} max={20} value={limite} onChange={e=>setLimite(Number(e.target.value))}/></label><Button disabled={busy||chave.length<10}>Ativar IA local</Button></form>{erro&&<p role="alert" className="mt-3 text-sm">{erro}</p>}</details>;
}
function Preview() {
 const [ia,setIa]=useState(false);
 const api=useMemo(()=>({...apiRoteirosLocal,iaDisponivel:ia}),[ia]);
 const [project,setProject]=useState<string|null>(null);const [erro,setErro]=useState('');const l=useLocation();
 useEffect(()=>{local<Array<{id:string}>>('projetos').then(p=>setProject(p[0]?.id??null)).catch(e=>setErro(e.message));},[]);
 if(import.meta.env.MODE!=='roteiros'||!import.meta.env.DEV) return <p>Pré-visualização apenas local.</p>;
 return <TooltipProvider><div className="min-h-screen bg-background text-foreground"><header className="flex flex-wrap items-center justify-between gap-3 border-b bg-card px-5 py-3"><p className="text-xs text-muted-foreground">Hub de conteúdo · validação local · publicação desligada</p><nav className="flex gap-4 text-sm"><Link className="underline" to="/curadoria">Curadoria local</Link><Link className="underline" to="/estudio/roteiros">Meus roteiros</Link></nav></header><ConfigurarIALocal alterar={setIa}/>{erro?<p role="alert" className="p-6">{erro}</p>:!project?<p className="p-6">A abrir a base local…</p>:<Routes><Route path="/curadoria" element={<CuradoriaLocal/>}/><Route path="/estudio/roteiros/novo" element={<EditorRoteiro key={l.pathname} api={api} projectId={project} curadoria={curadoriaRoteirosLocal}/>}/><Route path="/estudio/roteiros/:id" element={<EditorRoteiro key={l.pathname} api={api} projectId={project} curadoria={curadoriaRoteirosLocal}/>}/><Route path="*" element={<ListaRoteiros api={api} projectId={project}/>}/></Routes>}</div><Toaster/></TooltipProvider>;
}
createRoot(document.getElementById('root')!).render(<BrowserRouter><Preview/></BrowserRouter>);
