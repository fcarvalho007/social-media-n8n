import { Fragment } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Migalha } from '@/lib/navegacao';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';

/** Keep the parent reachable on narrow screens instead of hiding the whole path. */
export function BreadcrumbsHub({ migalhas, compacto = false }: { migalhas: Migalha[]; compacto?: boolean }) {
  const visiveis = compacto ? migalhas.slice(-2) : migalhas;
  return <Breadcrumb aria-label="Localização atual" className="min-w-0">
    <BreadcrumbList className="min-w-0 gap-x-2 gap-y-0">
      {visiveis.map((m, i) => <Fragment key={`${m.label}-${i}`}>
        {i > 0 && <BreadcrumbSeparator />}
        <BreadcrumbItem className="min-w-0 max-w-full">
        {m.path ? <BreadcrumbLink asChild><Link to={m.path} className="inline-flex min-h-11 min-w-0 items-center gap-1 rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {compacto && i === 0 && <ChevronLeft className="size-4 shrink-0" aria-hidden="true" />}
          <span className="break-words">{m.label}</span>
        </Link></BreadcrumbLink> : <BreadcrumbPage className="break-words py-2 font-semibold">{m.label}</BreadcrumbPage>}
        </BreadcrumbItem>
      </Fragment>)}
    </BreadcrumbList>
  </Breadcrumb>;
}
