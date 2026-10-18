import { useProjeto } from '@/contexts/ProjetoContext';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
export function ProjetoPesquisa() {
  const ctx = useProjeto();
  return <div className="flex w-full flex-col gap-2 sm:w-72"><Label htmlFor="projeto-pesquisa">Projeto de trabalho</Label><Select value={ctx.projetoId ?? ''} disabled={ctx.estado !== 'pronto' || ctx.aGuardar} onValueChange={id => void ctx.escolher(id).catch(e => toast.error(e.message))}><SelectTrigger id="projeto-pesquisa" className="min-h-11"><SelectValue placeholder={ctx.estado === 'a_carregar' ? 'A carregar projetos…' : 'Escolhe um projeto'} /></SelectTrigger><SelectContent><SelectGroup>{ctx.projetos.map(p => <SelectItem value={p.id} key={p.id}>{p.name}</SelectItem>)}</SelectGroup></SelectContent></Select>{ctx.erro && <p role="alert" className="text-sm text-destructive">{ctx.erro} <Button variant="link" onClick={ctx.recarregar}>Tentar novamente</Button></p>}</div>;
}
