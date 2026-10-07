import { Link } from 'react-router-dom';
import { ExternalLink, GalleryHorizontal, ImageIcon, Images, Layers, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Legacy n8n entry points: real Google Forms URL kept for demos/recovery. Do not invent others.
const FORMS_CARROSSEL = 'https://docs.google.com/forms/d/e/1FAIpQLScHxiU2xQOQz-7Z480crzkvTbIjYhHcdtb8Nuv98JSotdPcNg/viewform';

const FORMATOS = [
  {
    id: 'carrossel',
    titulo: 'Carrossel',
    descricao: 'Várias páginas',
    detalhe: '1080 × 1350',
    icon: GalleryHorizontal,
  },
  {
    id: 'post',
    titulo: 'Post',
    descricao: 'Uma imagem vertical',
    detalhe: '1080 × 1350',
    icon: ImageIcon,
  },
  {
    id: 'story',
    titulo: 'Story',
    descricao: 'Uma imagem de ecrã inteiro',
    detalhe: '1080 × 1920',
    icon: Video,
  },
] as const;

export function AssistedFormatActions({ onChoose }: { onChoose?: () => void }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {FORMATOS.map(({ id, titulo, descricao, detalhe, icon: Icon }) => (
        <Button
          key={id}
          asChild
          variant="outline"
          className="h-auto min-h-24 items-start justify-start whitespace-normal border-border bg-background p-4 text-left hover:border-primary/60 hover:bg-primary/5"
        >
          <Link to={`/estudio/carrosseis/novo?formato=${id}`} onClick={onChoose}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold text-foreground">{titulo}</span>
              <span className="block text-xs font-normal text-muted-foreground">{descricao}</span>
              <span className="mt-1 block text-xs font-medium text-foreground/70">{detalhe}</span>
            </span>
          </Link>
        </Button>
      ))}
    </div>
  );
}

export const ActionButtons = ({ className }: { className?: string }) => (
  <div className={cn('space-y-5', className)}>
    <section aria-labelledby="ia-titulo" className="space-y-3">
      <h2 id="ia-titulo" className="text-xl font-semibold">Assistido por IA</h2>
      <p className="text-sm text-muted-foreground">Escolhe o formato e trabalha o conteúdo no compositor.</p>
      <AssistedFormatActions />
      <div className="flex flex-wrap gap-2 pt-1">
        <Button asChild variant="ghost" size="sm"><Link to="/estudio/carrosseis"><Layers aria-hidden />Meus carrosséis</Link></Button>
        <Button asChild variant="ghost" size="sm"><Link to="/estudio/redes-sociais"><Images aria-hidden />Carrosséis da crónica</Link></Button>
      </ul>
    </section>

    <LegadoN8n />
  </div>
);

export const LegadoN8n = () => (
  <details className="group rounded-md border border-dashed border-border/70 px-3 py-2">
      <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between text-xs font-medium text-muted-foreground">
        <span>Versão anterior · n8n</span>
        <span className="text-[11px] group-open:hidden">Mostrar</span>
        <span className="hidden text-[11px] group-open:inline">Ocultar</span>
      </summary>
      <div className="border-t border-border/60 pb-1 pt-2">
        <a href={FORMS_CARROSSEL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-2 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <GalleryHorizontal className="h-4 w-4" aria-hidden />Abrir formulário antigo de carrossel<ExternalLink className="h-3.5 w-3.5" aria-hidden /><span className="sr-only">(abre noutro separador)</span>
        </a>
      </div>
  </details>
);
