import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { guardarCronica, guardarEdicao, obterEdicao } from '@/services/estudio';

export default function NewsletterEditor() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ['nl-edicao', id], queryFn: () => obterEdicao(id), enabled: !!id });
  const [assunto, setAssunto] = useState('');
  const [cTitulo, setCTitulo] = useState('');
  const [cConteudo, setCConteudo] = useState('');
  const [aGuardar, setAGuardar] = useState(false);

  useEffect(() => {
    if (!data) return;
    setAssunto(data.edicao.assunto ?? '');
    setCTitulo(data.cronica?.titulo ?? '');
    setCConteudo(data.cronica?.conteudo ?? '');
  }, [data]);

  if (isLoading) return <p className="p-4 text-sm text-muted-foreground">A carregar…</p>;
  if (error || !data) return <p className="p-4 text-sm text-destructive">Edição não encontrada ou sem permissão.</p>;
  const enviada = data.edicao.estado === 'enviada';

  const guardar = async () => {
    setAGuardar(true);
    try {
      await guardarEdicao(id, assunto);
      await guardarCronica(id, cTitulo, cConteudo);
      await qc.invalidateQueries({ queryKey: ['nl-edicao', id] });
      toast.success('Edição guardada');
    } catch (e) { toast.error(`Erro ao guardar: ${(e as Error).message}`); }
    finally { setAGuardar(false); }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <Link to="/newsletter" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="mr-1 h-4 w-4" />Arquivo</Link>
      <header className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold">Edição #{data.edicao.numero}</h1>
        <Badge variant={enviada ? 'secondary' : 'outline'}>{enviada ? 'Enviada' : 'Rascunho'}</Badge>
      </header>
      {enviada && <p className="text-sm text-muted-foreground">Edição enviada: apenas leitura.</p>}
      <div className="space-y-1">
        <Label htmlFor="assunto">Assunto</Label>
        <Input id="assunto" value={assunto} disabled={enviada} onChange={(e) => setAssunto(e.target.value)} />
      </div>
      <Card className="space-y-2 p-4">
        <h2 className="font-medium">Crónica</h2>
        <Input aria-label="Título da crónica" placeholder="Título" value={cTitulo} disabled={enviada} onChange={(e) => setCTitulo(e.target.value)} />
        <Textarea aria-label="Texto da crónica" rows={10} value={cConteudo} disabled={enviada} onChange={(e) => setCConteudo(e.target.value)} />
      </Card>
      <Card className="p-4">
        <h2 className="mb-2 font-medium">Notícias ({data.noticias.length})</h2>
        {data.noticias.length === 0 && <p className="text-sm text-muted-foreground">Sem notícias associadas.</p>}
        <ol className="space-y-2">
          {data.noticias.map((n) => (
            <li key={n.id} className="text-sm">
              <span className="font-medium">{n.titulo}</span>{' '}
              <Badge variant="outline" className="ml-1">{n.categoria}</Badge>
              {n.descricao && <p className="text-muted-foreground">{n.descricao}</p>}
            </li>
          ))}
        </ol>
      </Card>
      {!enviada && <Button onClick={guardar} disabled={aGuardar}>{aGuardar ? 'A guardar…' : 'Guardar'}</Button>}
      <p className="text-xs text-muted-foreground">O envio por e-mail ainda não está activo nesta aplicação.</p>
    </div>
  );
}
