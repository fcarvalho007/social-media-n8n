import { FileSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CommandGroup, CommandItem } from '@/components/ui/command';
import { usePesquisaHub } from './api';
import { NOMES_PESQUISA } from './pesquisa';
export function PesquisaRapida({ consulta, abrir }: { consulta: string; abrir: (url: string) => void }) {
  const q = usePesquisaHub(consulta);
  if (consulta.trim().length < 2) return null;
  return <><CommandGroup heading="Conteúdos do Hub">{q.data?.itens.slice(0, 5).map(r => <CommandItem key={r.id} value={r.id} onSelect={() => abrir(r.url)} className="min-h-12 gap-3 px-3 py-2.5"><FileSearch className="size-5 shrink-0" aria-hidden /><span className="min-w-0"><span className="block truncate font-medium">{r.titulo}</span><span className="block text-xs opacity-75">{NOMES_PESQUISA[r.tipo]}{r.pagina ? ` · página ${r.pagina}` : ''}</span><span className="line-clamp-2 text-xs opacity-75">{r.excerto}</span></span></CommandItem>)}</CommandGroup>{q.aPesquisar && <p role="status" className="px-3 py-2 text-sm text-muted-foreground">A procurar nos conteúdos…</p>}{q.error && <p role="alert" className="px-3 py-2 text-sm text-destructive">A pesquisa de conteúdos não respondeu. Abre a pesquisa completa para tentar novamente.</p>}{q.data?.avisos.length > 0 && <p className="px-3 py-2 text-xs text-muted-foreground">Algumas fontes não foram pesquisadas. Consulta os detalhes na pesquisa completa.</p>}<div className="border-t px-3 py-2"><Button variant="link" className="min-h-11 px-0" onClick={() => abrir(`/pesquisa?q=${encodeURIComponent(consulta.trim())}`)}>Abrir pesquisa completa{q.data ? ` · ${q.data.total} resultados` : ''}</Button>{!q.pronto && <p className="text-xs text-muted-foreground">Escolhe um projeto na pesquisa completa.</p>}</div></>;
}
