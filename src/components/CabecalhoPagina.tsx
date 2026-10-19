import type { ReactNode, Ref } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Shared page hierarchy; actions keep their own state, labels and permissions. */
export function CabecalhoPagina({ titulo, descricao, icone: Icone, acoes, children, tituloRef, className }: {
  titulo: string;
  descricao?: string;
  icone?: LucideIcon;
  acoes?: ReactNode;
  children?: ReactNode;
  tituloRef?: Ref<HTMLHeadingElement>;
  className?: string;
}) {
  return <header className={cn('hub-page-header', className)}>
    <div className="flex min-w-0 flex-1 basis-72 items-start gap-3">
      {Icone && <span className="hub-page-icon" aria-hidden="true"><Icone className="size-5" strokeWidth={1.75} /></span>}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h1 ref={tituloRef} tabIndex={tituloRef ? -1 : undefined} className="hub-page-title">{titulo}</h1>
        {descricao && <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{descricao}</p>}
        {children}
      </div>
    </div>
    {acoes && <div className="flex min-w-0 flex-wrap items-end gap-3">{acoes}</div>}
  </header>;
}
