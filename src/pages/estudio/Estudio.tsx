import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Mail, Share2, FileText } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ESTUDIO_MARCA_KEY, listarProjetos } from '@/services/estudio';
import { cn } from '@/lib/utils';

const MODULOS = [
  { id: 'newsletter', titulo: 'Newsletter', descricao: 'Edições da DIGITALSPRINT: arquivo e editor.', icon: Mail, url: '/newsletter' },
  { id: 'social', titulo: 'Redes sociais', descricao: 'Criar, aprovar e agendar publicações.', icon: Share2, url: '/manual-create' },
  { id: 'artigos', titulo: 'Artigos de blog', descricao: 'Rascunhos internos, sem publicação.', icon: FileText, url: '/artigos' },
];

export default function Estudio() {
  const navigate = useNavigate();
  const [marca, setMarca] = useState<string>(() => localStorage.getItem(ESTUDIO_MARCA_KEY) ?? 'nenhuma');
  const { data: projetos = [], isLoading } = useQuery({ queryKey: ['estudio-projetos'], queryFn: listarProjetos });

  useEffect(() => { localStorage.setItem(ESTUDIO_MARCA_KEY, marca); }, [marca]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4">
      <header>
        <h1 className="text-2xl font-semibold">Estúdio de conteúdos</h1>
        <p className="text-sm text-muted-foreground">Escolhe o que queres fazer e para quem.</p>
      </header>

      <section className="space-y-2">
        <Label htmlFor="marca">Para quem?</Label>
        <Select value={marca} onValueChange={setMarca}>
          <SelectTrigger id="marca" className="max-w-sm">
            <SelectValue placeholder={isLoading ? 'A carregar projetos…' : 'Escolhe um projeto'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="nenhuma">Sem projeto associado</SelectItem>
            {projetos.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {!isLoading && projetos.length === 0 && (
          <p className="text-xs text-muted-foreground">Ainda não há projetos. Podes criá-los em Projetos.</p>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">O que queres fazer?</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {MODULOS.map((m) => (
            <button key={m.id} type="button" onClick={() => navigate(m.url)} className="text-left">
              <Card className={cn('h-full p-4 transition-colors hover:border-primary focus-visible:border-primary')}>
                <m.icon className="mb-2 h-6 w-6 text-primary" aria-hidden />
                <div className="font-medium">{m.titulo}</div>
                <p className="text-sm text-muted-foreground">{m.descricao}</p>
              </Card>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
