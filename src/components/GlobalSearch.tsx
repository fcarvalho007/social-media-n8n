import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { CheckSquare, FolderOpen, Loader2, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { DESTINOS_NAVEGACAO } from '@/lib/navegacao';

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const normalizar = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-PT').trim();

// Mounted only while open: merely visiting an area never loads every project and task for search.
function ResultadosPesquisa({ aoEscolher }: { aoEscolher: (url: string) => void }) {
  const [query, setQuery] = useState('');
  const projetos = useProjects();
  const tarefas = useTasks();
  const queryClient = useQueryClient();
  const termo = normalizar(query);
  const coincide = (...campos: (string | null | undefined)[]) => campos.some((c) => normalizar(c ?? '').includes(termo));
  const destinos = DESTINOS_NAVEGACAO.filter((d) => coincide(d.label, d.descricao, d.grupo));
  const projetosFiltrados = termo ? projetos.projects.filter((p) => coincide(p.name, p.description)) : [];
  const tarefasFiltradas = termo ? tarefas.tasks.filter((t) => coincide(t.title, t.description)) : [];
  const aCarregar = projetos.isLoading || tarefas.isLoading;
  const erro = projetos.error || tarefas.error;
  const total = destinos.length + projetosFiltrados.length + tarefasFiltradas.length;

  const repetir = () => {
    if (projetos.error) void queryClient.refetchQueries({ queryKey: ['projects'], type: 'active' });
    if (tarefas.error) void queryClient.refetchQueries({ queryKey: ['tasks'], type: 'active' });
  };

  return (
    <Command shouldFilter={false} label="Pesquisar na aplicação">
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Áreas, projetos e tarefas…"
        aria-label="Pesquisar na aplicação"
        className="h-14 pr-12 text-base"
      />
      <CommandList aria-label="Resultados da pesquisa" className="max-h-[min(65dvh,28rem)] p-2">
        {destinos.length > 0 && (
          <CommandGroup heading="Áreas da aplicação">
            {destinos.map((d) => (
              <CommandItem key={d.url} value={`area:${d.url}`} onSelect={() => aoEscolher(d.url)} className="min-h-12 gap-3 px-3 py-2.5">
                <d.icon className="h-5 w-5 shrink-0" aria-hidden />
                <span className="min-w-0"><span className="block font-medium">{d.label}</span><span className="block text-xs opacity-75">{d.descricao}</span></span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {projetosFiltrados.length > 0 && (
          <CommandGroup heading="Projetos">
            {projetosFiltrados.map((p) => (
              <CommandItem key={p.id} value={`projeto:${p.id}`} onSelect={() => aoEscolher(`/projects/${encodeURIComponent(p.id)}`)} className="min-h-12 gap-3 px-3 py-2.5">
                <FolderOpen className="h-5 w-5 shrink-0" aria-hidden />
                <span className="min-w-0"><span className="block truncate font-medium">{p.name}</span>{p.description && <span className="block truncate text-xs opacity-75">{p.description}</span>}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {tarefasFiltradas.length > 0 && (
          <CommandGroup heading="Tarefas · abrir projeto">
            {tarefasFiltradas.map((t) => (
              <CommandItem key={t.id} value={`tarefa:${t.id}`} onSelect={() => aoEscolher(`/projects/${encodeURIComponent(t.project_id)}`)} className="min-h-12 gap-3 px-3 py-2.5">
                <CheckSquare className="h-5 w-5 shrink-0" aria-hidden />
                <span className="min-w-0"><span className="block truncate font-medium">{t.title}</span><span className="block truncate text-xs opacity-75">{projetos.projects.find((p) => p.id === t.project_id)?.name ?? 'Projeto da tarefa'}</span></span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {aCarregar && <p role="status" className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" aria-hidden />A carregar projetos e tarefas…</p>}
        {erro && (
          <div role="alert" className="space-y-2 px-3 py-4 text-sm">
            <p>Não foi possível carregar {projetos.error && tarefas.error ? 'os projetos e as tarefas' : projetos.error ? 'os projetos' : 'as tarefas'}. Os atalhos da aplicação continuam disponíveis.</p>
            <Button variant="outline" size="sm" onClick={repetir}><RefreshCw className="mr-2 h-4 w-4" aria-hidden />Tentar de novo</Button>
          </div>
        )}
        {!aCarregar && !erro && total === 0 && <CommandEmpty>Nenhum resultado. Experimenta outro termo.</CommandEmpty>}
      </CommandList>
      <p className="border-t px-4 py-2 text-xs text-muted-foreground">Usa ↑ ↓ para escolher e Enter para abrir.</p>
    </Command>
  );
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const navigate = useNavigate();
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey) && !e.repeat) {
        e.preventDefault();
        onOpenChange(true);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw_-_2rem)] max-w-xl gap-0 overflow-hidden rounded-xl p-0">
        <DialogTitle className="sr-only">Pesquisa na aplicação</DialogTitle>
        <DialogDescription className="sr-only">Abre uma área, um projeto ou o projeto de uma tarefa. Usa as setas e Enter para escolher.</DialogDescription>
        {open && <ResultadosPesquisa aoEscolher={(url) => { navigate(url); onOpenChange(false); }} />}
      </DialogContent>
    </Dialog>
  );
}
