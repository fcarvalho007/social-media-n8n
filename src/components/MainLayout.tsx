import { Outlet, useLocation } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { DashboardHeader } from '@/components/DashboardHeader';
import { Suspense, useEffect, type CSSProperties } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { PageLoading } from '@/components/PageLoading';
import { migalhasNavegacao } from '@/lib/navegacao';

export function MainLayout() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    const migalhas = migalhasNavegacao(pathname, search);
    document.title = `${migalhas.at(-1)?.label ?? 'Início'} · Hub de conteúdo`;
  }, [pathname, search]);
  const parametros=new URLSearchParams(search);
  const editorRedacao=pathname==='/artigos/plano'&&!!parametros.get('id')&&parametros.get('secao')==='texto';
  const editorIsolado = editorRedacao || /^\/campanhas\/[^/]+\/compositor\/[^/]+$/.test(pathname) || pathname === '/estudio/editor-prova' || (/^\/estudio\/carrosseis\/[^/]+$/.test(pathname) && pathname !== '/estudio/carrosseis/novo');

  return (
    <SidebarProvider defaultOpen={window.innerWidth >= 1024} className="hub-navigation" style={{ '--sidebar-width': '16.25rem' } as CSSProperties}>
      <div className="flex min-h-screen w-full">
        <a href="#conteudo-principal" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-3 focus:text-foreground focus:ring-2 focus:ring-ring">Saltar para o conteúdo</a>
        {!editorIsolado && <AppSidebar />}
        <div className="min-w-0 flex-1 flex flex-col overflow-x-clip">
          {!editorIsolado && <DashboardHeader />}
          {/* NB: NÃO usar `overflow-x-hidden` aqui — quebra `position: sticky`
              em descendentes (ex.: PreviewPanel em /manual-create). */}
          <main id="conteudo-principal" tabIndex={-1} className={editorIsolado ? "min-h-0 min-w-0 flex-1 p-0" : "mx-auto w-full max-w-[90rem] min-w-0 flex-1 p-4 md:p-6 xl:p-8"}>
            <ErrorBoundary key={pathname} inline>
              <Suspense fallback={<PageLoading />}><Outlet /></Suspense>
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
