import { Link, Navigate, useLocation } from 'react-router-dom';
import { DOCUMENTOS_LOCAL } from '@/features/documentos/modelo';
import { cn } from '@/lib/utils';

export function CuradoriaNavegacao() {
  const { pathname, search } = useLocation();
  const documentos = pathname === '/curadoria/documentos' || pathname === '/documentos';
  const separador = new URLSearchParams(search).get('separador');
  const atual = documentos ? 'documentos' : separador === 'emails' || separador === 'fontes' ? separador : 'noticias';
  const destinos = [
    { id:'noticias', nome:'Notícias', to:'/curadoria' },
    { id:'emails', nome:'Emails', to:'/curadoria?separador=emails' },
    ...(DOCUMENTOS_LOCAL ? [{ id:'documentos', nome:'Documentos e relatórios', to:'/curadoria/documentos' }] : []),
    { id:'fontes', nome:'Fontes de notícias', to:'/curadoria?separador=fontes' },
  ];
  return <nav aria-label="Áreas da curadoria" className="flex flex-wrap gap-1 border-b pb-3">
    {destinos.map(d => <Link key={d.id} to={d.to} aria-current={atual === d.id ? 'page' : undefined} className={cn('inline-flex min-h-11 items-center rounded-md px-4 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', atual === d.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>{d.nome}</Link>)}
  </nav>;
}

/** Existing bookmarks keep project, document, filters, anchor and transfer state. */
export function RedirecionarDocumentos() {
  const { search, hash, state } = useLocation();
  return <Navigate replace to={{pathname:'/curadoria/documentos',search,hash}} state={state} />;
}
