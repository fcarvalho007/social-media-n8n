import { Link, Navigate, useLocation } from 'react-router-dom';
import { DOCUMENTOS_DISPONIVEL } from '@/features/documentos/modelo';
import { cn } from '@/lib/utils';

export function CuradoriaNavegacao() {
  const { pathname, search } = useLocation();
  const documentos = pathname === '/curadoria/documentos' || pathname === '/documentos';
  const separador = new URLSearchParams(search).get('separador');
  const atual = documentos ? 'documentos' : separador === 'emails' || separador === 'fontes' ? separador : 'noticias';
  const destinos = [
    { id:'noticias', nome:'Notícias', to:'/curadoria' },
    { id:'emails', nome:'Emails', to:'/curadoria?separador=emails' },
    ...(DOCUMENTOS_DISPONIVEL ? [{ id:'documentos', nome:'Documentos e relatórios', to:'/curadoria/documentos' }] : []),
    { id:'fontes', nome:'Fontes de notícias', to:'/curadoria?separador=fontes' },
  ];
  return <nav aria-label="Áreas da curadoria" className="hub-section-nav flex-wrap">
    {destinos.map(d => {
      const params = new URLSearchParams(documentos || d.id === 'documentos' ? '' : search);
      params.delete('noticia');
      if (d.id === 'emails' || d.id === 'fontes') params.set('separador', d.id); else params.delete('separador');
      const to = d.id === 'documentos' ? d.to : `/curadoria${params.size ? `?${params}` : ''}`;
      return <Link key={d.id} to={to} aria-current={atual === d.id ? 'page' : undefined} className={cn('hub-section-link')}>{d.nome}</Link>; })}
  </nav>;
}

/** Existing bookmarks keep project, document, filters, anchor and transfer state. */
export function RedirecionarDocumentos() {
  const { search, hash, state } = useLocation();
  return <Navigate replace to={{pathname:'/curadoria/documentos',search,hash}} state={state} />;
}
