import { useLocation } from 'react-router-dom';
import { useProjeto } from '@/contexts/ProjetoContext';
import { apiRoteiros } from '@/services/roteiros';
import { EditorRoteiro, ListaRoteiros } from '@/features/roteiros/EditorRoteiro';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
export default function Roteiros() {
 const p = useProjeto(); const location = useLocation();
 if (p.estado === 'a_carregar') return <p className="p-6" role="status">A carregar as marcas…</p>;
 if (p.estado === 'erro') return <div className="p-6"><p role="alert">{p.erro}</p><Button onClick={p.recarregar}>Tentar novamente</Button></div>;
 if (!p.projetoId) return <section className="mx-auto flex max-w-lg flex-col gap-4 p-6"><h1 className="text-2xl font-semibold">Para quem é o roteiro?</h1><p className="text-sm text-muted-foreground">Escolhe uma marca para guardar o texto no sítio certo.</p><Select disabled={p.aGuardar} onValueChange={id => p.escolher(id).catch(e => toast.error(e.message))}><SelectTrigger aria-label="Marca do roteiro"><SelectValue placeholder="Escolher marca" /></SelectTrigger><SelectContent><SelectGroup>{p.projetos.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectGroup></SelectContent></Select></section>;
 return location.pathname === '/estudio/roteiros' ? <ListaRoteiros api={apiRoteiros} projectId={p.projetoId} /> : <EditorRoteiro key={location.pathname} api={apiRoteiros} projectId={p.projetoId} />;
}
