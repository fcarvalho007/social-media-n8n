import { Link } from 'react-router-dom';
import { ExternalLink, GalleryHorizontal, ImageIcon, Images, Layers, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Legacy n8n entry points: real Google Forms URL kept for demos/recovery. Do not invent others.
const FORMS_CARROSSEL = 'https://docs.google.com/forms/d/e/1FAIpQLScHxiU2xQOQz-7Z480crzkvTbIjYhHcdtb8Nuv98JSotdPcNg/viewform';

function EmConstrucao({ icon: Icon, titulo, nota }: { icon: typeof Video; titulo: string; nota: string }) {
  return (
    <li className="flex min-h-11 items-start gap-3 py-2 text-muted-foreground" aria-disabled="true">
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      <div><span className="font-medium text-foreground">{titulo}</span> · 🚧 Em construção<p className="text-sm">{nota}</p></div>
    </li>
  );
}

export const ActionButtons = ({ className }: { className?: string }) => (
  <div className={cn('space-y-8', className)}>
    <section aria-labelledby="ia-titulo" className="space-y-3">
      <h2 id="ia-titulo" className="text-xl font-semibold">Assistido por IA</h2>
      <p className="text-base text-muted-foreground">Cria um carrossel a partir de texto, link ou PDF, revê e exporta no Hub.</p>
      <div className="flex flex-wrap gap-2">
        <Button asChild size="lg" className="min-h-11"><Link to="/estudio/carrosseis/novo"><GalleryHorizontal className="mr-2 h-5 w-5" aria-hidden />Criar conteúdo visual</Link></Button>
        <Button asChild size="lg" variant="outline" className="min-h-11"><Link to="/estudio/carrosseis"><Layers className="mr-2 h-5 w-5" aria-hidden />Meus carrosséis</Link></Button>
        <Button asChild size="lg" variant="ghost" className="min-h-11"><Link to="/estudio/redes-sociais"><Images className="mr-2 h-5 w-5" aria-hidden />Carrosséis da crónica</Link></Button>
      </div>
      <ul className="divide-y border-y">
        <EmConstrucao icon={Video} titulo="Stories assistidos" nota="Ainda não disponível. Para já, usa o modo Manual." />
        <EmConstrucao icon={ImageIcon} titulo="Post individual assistido" nota="Ainda não disponível. Para já, usa o modo Manual." />
      </ul>
    </section>

    <LegadoN8n />
  </div>
);

export const LegadoN8n = () => (
  <details open className="group space-y-2 rounded-md border border-dashed p-4">
      <summary className="min-h-11 cursor-pointer text-base font-semibold">Versão anterior · n8n</summary>
      <p className="text-sm text-muted-foreground">Fluxo antigo por formulário externo, mantido para demonstração e recuperação. Não faz parte do motor novo.</p>
      <ul className="divide-y">
        <li className="py-2">
          <a href={FORMS_CARROSSEL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-3 font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <GalleryHorizontal className="h-5 w-5" aria-hidden />Carrossel (Forms)<ExternalLink className="h-4 w-4" aria-hidden /><span className="sr-only">(abre noutro separador)</span>
          </a>
        </li>
        <EmConstrucao icon={Video} titulo="Stories (n8n)" nota="Não desenvolvido nesta versão." />
        <EmConstrucao icon={ImageIcon} titulo="Post individual (n8n)" nota="Não desenvolvido nesta versão." />
      </ul>
  </details>
);
