import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ESTUDIO_MARCA_KEY, apagarArtigo, guardarArtigo, listarArtigos, listarProjetos } from '@/services/estudio';

type Form = { id?: string; titulo: string; resumo: string; corpo: string; project_id: string | null };
const vazio = (): Form => {
  const m = localStorage.getItem(ESTUDIO_MARCA_KEY);
  return { titulo: '', resumo: '', corpo: '', project_id: m && m !== 'nenhuma' ? m : null };
};

export default function Artigos() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ['art-rascunhos'], queryFn: listarArtigos });
  const { data: projetos = [] } = useQuery({ queryKey: ['estudio-projetos'], queryFn: listarProjetos });
  const [f, setF] = useState<Form>(vazio);

  const guardar = async () => {
    if (!f.titulo.trim()) { toast.error('Indica um título'); return; }
    try { await guardarArtigo(f); toast.success('Rascunho guardado'); setF(vazio()); qc.invalidateQueries({ queryKey: ['art-rascunhos'] }); }
    catch (e) { toast.error(`Erro ao guardar: ${(e as Error).message}`); }
  };
  const apagar = async (id: string) => {
    try { await apagarArtigo(id); qc.invalidateQueries({ queryKey: ['art-rascunhos'] }); }
    catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <header>
        <h1 className="text-2xl font-semibold">Artigos de blog</h1>
        <p className="text-sm text-muted-foreground">Rascunhos internos. Nada é publicado a partir daqui.</p>
      </header>
      <Card className="space-y-2 p-4">
        <Input aria-label="Título" placeholder="Título" value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} />
        <Input aria-label="Resumo" placeholder="Resumo" value={f.resumo} onChange={(e) => setF({ ...f, resumo: e.target.value })} />
        <Textarea aria-label="Texto" rows={8} placeholder="Texto do artigo" value={f.corpo} onChange={(e) => setF({ ...f, corpo: e.target.value })} />
        <Select value={f.project_id ?? 'nenhuma'} onValueChange={(v) => setF({ ...f, project_id: v === 'nenhuma' ? null : v })}>
          <SelectTrigger className="max-w-sm" aria-label="Projeto"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="nenhuma">Sem projeto associado</SelectItem>
            {projetos.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button onClick={guardar}>{f.id ? 'Actualizar' : 'Guardar rascunho'}</Button>
          {f.id && <Button variant="outline" onClick={() => setF(vazio())}>Cancelar</Button>}
        </div>
      </Card>
      {isLoading && <p className="text-sm text-muted-foreground">A carregar…</p>}
      <ul className="space-y-2">
        {data.map((a) => (
          <li key={a.id}>
            <Card className="flex items-center gap-2 p-3">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{a.titulo}</div>
                <div className="text-xs text-muted-foreground">Actualizado em {new Date(a.updated_at).toLocaleDateString('pt-PT')}</div>
              </div>
              <Button size="sm" variant="outline" onClick={() => setF({ id: a.id, titulo: a.titulo, resumo: a.resumo ?? '', corpo: a.corpo, project_id: a.project_id })}>Editar</Button>
              <Button size="sm" variant="ghost" onClick={() => apagar(a.id)}>Apagar</Button>
            </Card>
          </li>
        ))}
        {!isLoading && data.length === 0 && <li className="text-sm text-muted-foreground">Ainda não há rascunhos.</li>}
      </ul>
    </div>
  );
}
