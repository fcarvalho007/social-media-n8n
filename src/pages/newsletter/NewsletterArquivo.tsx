import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { criarEdicao, listarEdicoes } from '@/services/estudio';
import { useCurrentUserRoles } from '@/hooks/useUserRoles';

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString('pt-PT') : '—');

export default function NewsletterArquivo() {
  const navigate = useNavigate();
  const { isAdmin, isEditor } = useCurrentUserRoles();
  const { data = [], isLoading, error } = useQuery({ queryKey: ['nl-edicoes'], queryFn: listarEdicoes });

  const nova = async () => {
    try { navigate(`/newsletter/${await criarEdicao()}`); }
    catch (e) { toast.error(`Não foi possível criar a edição: ${(e as Error).message}`); }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Newsletter DIGITALSPRINT</h1>
          <p className="text-sm text-muted-foreground">Arquivo de edições.</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && <Button variant="outline" asChild><Link to="/newsletter/migracao"><Upload className="mr-1 h-4 w-4" />Migração</Link></Button>}
          {(isAdmin || isEditor) && <Button onClick={nova}><Plus className="mr-1 h-4 w-4" />Nova edição</Button>}
        </div>
      </header>
      {isLoading && <p className="text-sm text-muted-foreground">A carregar…</p>}
      {error && <p className="text-sm text-destructive">Erro ao carregar edições.</p>}
      {!isLoading && data.length === 0 && (
        <Card className="p-6 text-sm text-muted-foreground">Ainda não há edições. {isAdmin ? 'Importa o arquivo em Migração ou cria uma nova edição.' : ''}</Card>
      )}
      <ul className="divide-y rounded-md border">
        {data.map((e) => (
          <li key={e.id}>
            <Link to={`/newsletter/${e.id}`} className="flex items-center gap-3 p-3 hover:bg-muted/50">
              <span className="w-12 font-mono text-sm text-muted-foreground">#{e.numero}</span>
              <span className="flex-1 truncate">{e.assunto || 'Sem assunto'}</span>
              <span className="hidden text-xs text-muted-foreground sm:inline">{fmt(e.enviada_em ?? e.data_envio_prevista)}</span>
              <Badge variant={e.estado === 'enviada' ? 'secondary' : 'outline'}>{e.estado === 'enviada' ? 'Enviada' : 'Rascunho'}</Badge>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
