import { useState } from 'react';
import { FileText, Import, ExternalLink, EyeOff, RotateCcw, Trash2, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { TarefaDocumentos } from './contratos';
import {tituloCandidato} from './tituloFonte';
import { normalizarPesquisa } from './interface';
export type CandidatoRecolha = TarefaDocumentos['descobertas'][number];
export function ResultadosRecolhas({ tarefas, ocupado, onImportar, onDecidir, onAbrir, onRetomar, onReferencias }: { tarefas: TarefaDocumentos[]; ocupado: boolean; onImportar: (j:TarefaDocumentos,d:CandidatoRecolha)=>void; onDecidir:(j:TarefaDocumentos,d:CandidatoRecolha,acao:'ignorar'|'repor'|'remover')=>void; onAbrir:(id:string)=>void; onRetomar:(j:TarefaDocumentos)=>void; onReferencias:(j:TarefaDocumentos)=>void }) {
  const [ignorados,setIgnorados]=useState(false), [q,setQ]=useState(''), [limite,setLimite]=useState(12);
  const [remover,setRemover]=useState<{j:TarefaDocumentos;d:CandidatoRecolha}|null>(null);
  const vistos=new Set<string>();
  const todos=tarefas.flatMap(j=>j.descobertas.filter(d=>d.tipo==='pdf').map(d=>({j,d}))).filter(({d})=>{if(vistos.has(d.url))return false;vistos.add(d.url);return true;});
  const filtrados=todos.filter(({d})=>(ignorados?d.decisao==='ignorado':d.decisao!=='ignorado')&&normalizarPesquisa(`${d.titulo} ${d.nomeFonte}`).includes(normalizarPesquisa(q)));
  return <section id="resultados-pdfs" className="scroll-mt-32 space-y-5" aria-labelledby="titulo-resultados-pdfs">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 id="titulo-resultados-pdfs" className="text-xl font-semibold">2. Revê os PDFs encontrados</h3><p className="mt-1 text-sm text-muted-foreground">Só entram na biblioteca quando escolhes importar. A capa e o texto são preparados nessa altura.</p></div><Badge variant="secondary">{todos.length} ligações encontradas</Badge></div>
    <div className="flex flex-wrap items-center gap-2"><Button variant={!ignorados?'secondary':'ghost'} onClick={()=>{setIgnorados(false);setLimite(12);}} aria-pressed={!ignorados}>Para rever</Button><Button variant={ignorados?'secondary':'ghost'} onClick={()=>{setIgnorados(true);setLimite(12);}} aria-pressed={ignorados}>Ignorados ({todos.filter(x=>x.d.decisao==='ignorado').length})</Button><Input className="sm:ml-auto sm:max-w-xs" aria-label="Pesquisar PDFs encontrados" placeholder="Título ou fonte…" value={q} onChange={e=>{setQ(e.target.value);setLimite(12);}}/></div>
    {!filtrados.length&&<div className="rounded-xl border border-dashed bg-card p-8 text-center"><Search className="mx-auto mb-3 size-6 text-muted-foreground" aria-hidden/><p className="font-medium">{ignorados?'Nenhum PDF ignorado':'Sem PDFs para rever'}</p><p className="mt-2 text-sm text-muted-foreground">{q?'Experimenta outra pesquisa.':'Seleciona fontes acima e usa «Procurar PDFs». Se não houver ligações acessíveis, consulta o diagnóstico de cada site.'}</p></div>}
    <ul className="grid gap-4 lg:grid-cols-2">{filtrados.slice(0,limite).map(({j,d})=>{
      const p=tarefas.flatMap(t=>t.pdfs).find(p=>(p.candidatoUrl??p.url)===d.url);
      return <li key={d.url} className="flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-5">
        <div className="flex items-start gap-3"><FileText className="mt-1 size-5 shrink-0 text-primary" aria-hidden/><div className="min-w-0"><h4 className="break-words font-semibold leading-snug">{tituloCandidato(d.titulo)}</h4><p className="mt-2 text-xs text-muted-foreground">{d.nomeFonte} · encontrado em {new Date(j.iniciadaEm).toLocaleDateString('pt-PT')}</p></div></div>
        <div className="flex flex-wrap gap-2"><Badge variant={p?.documentoId?'secondary':'outline'}>{p?.documentoId?'Na biblioteca':d.decisao==='ignorado'?'Ignorado':'Por importar'}</Badge>{!p&&<span className="text-xs text-muted-foreground">Ligação candidata · ficheiro por verificar</span>}</div>
        {p?.erro&&<Alert variant="destructive"><AlertDescription>{p.erro}</AlertDescription></Alert>}
        <a className="inline-flex min-h-11 items-center gap-2 self-start text-sm text-primary underline underline-offset-4" href={d.url} target="_blank" rel="noreferrer">Ver na origem<ExternalLink className="size-3" aria-hidden/><span className="sr-only"> (abre noutro separador)</span></a>
        <div className="mt-auto flex flex-wrap gap-2 border-t pt-4">{p?.documentoId?<Button variant="outline" onClick={()=>onAbrir(p.documentoId!)}>Abrir documento</Button>:<Button disabled={ocupado||j.estado==='em_curso'} onClick={()=>onImportar(j,d)}>{ocupado?<Loader2 className="animate-spin" aria-hidden/>:<Import aria-hidden/>}Importar PDF</Button>}
          <Button variant="ghost" disabled={ocupado||j.estado==='em_curso'} onClick={()=>onDecidir(j,d,ignorados?'repor':'ignorar')}>{ignorados?<RotateCcw aria-hidden/>:<EyeOff aria-hidden/>}{ignorados?'Repor':'Ignorar'}</Button>
          {!p?.documentoId&&<Button variant="ghost" size="icon" className="ml-auto text-muted-foreground hover:text-destructive" aria-label={`Eliminar resultado: ${d.titulo}`} disabled={ocupado||j.estado==='em_curso'} onClick={()=>setRemover({j,d})}><Trash2 aria-hidden/></Button>}
        </div>
      </li>;
    })}</ul>
    {filtrados.length>limite&&<Button variant="outline" onClick={()=>setLimite(n=>n+12)}>Mostrar mais PDFs ({filtrados.length-limite})</Button>}
    {!!tarefas.length&&<details className="rounded-xl border bg-card p-4"><summary className="min-h-11 cursor-pointer py-2 font-medium">Histórico e diagnóstico das pesquisas ({tarefas.length})</summary><ul className="divide-y">{tarefas.map(j=><li key={j.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="text-sm font-medium">{new Date(j.iniciadaEm).toLocaleString('pt-PT')} · {j.total} fontes</p><p className="mt-1 text-xs text-muted-foreground">{j.estado==='em_curso'?'Em curso':j.estado==='interrompida'?'Interrompida':'Concluída'} · {j.descobertas.filter(d=>d.tipo==='pdf').length} PDFs candidatos · {j.pdfs.filter(p=>p.estado==='guardado').length} importados</p>{j.erros.map((e,i)=><p className="mt-1 text-sm text-destructive" key={i}>{e}</p>)}</div><div className="flex flex-wrap gap-2">{j.estado==='interrompida'&&<Button variant="outline" disabled={ocupado} onClick={()=>onRetomar(j)}>Retomar pesquisa</Button>}<Button variant="ghost" onClick={()=>onReferencias(j)}>Ver notícias e referências</Button></div></li>)}</ul></details>}
    <Dialog open={!!remover} onOpenChange={v=>{if(!v)setRemover(null);}}><DialogContent><DialogHeader><DialogTitle>Eliminar este resultado?</DialogTitle><DialogDescription>Remove esta ligação das pesquisas deste projeto e os respetivos downloads temporários. Pode voltar a ser encontrada numa pesquisa futura. Não elimina documentos já importados. Para manter a opção de voltar atrás, usa «Ignorar».</DialogDescription></DialogHeader><p className="break-words font-medium">{remover?.d.titulo}</p><div className="flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={()=>setRemover(null)}>Cancelar</Button><Button variant="destructive" onClick={()=>{if(remover)onDecidir(remover.j,remover.d,'remover');setRemover(null);}}>Eliminar resultado</Button></div></DialogContent></Dialog>
  </section>;
}
