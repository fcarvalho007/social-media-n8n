import { Outlet, useLocation } from 'react-router-dom';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { DashboardHeader } from '@/components/DashboardHeader';
import { Suspense, useEffect } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { PageLoading } from '@/components/PageLoading';
import { migalhasNavegacao } from '@/lib/navegacao';

export function MainLayout() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    const migalhas = migalhasNavegacao(pathname, search);
    document.title = `${migalhas.at(-1)?.label ?? 'Painel'} · Hub de conteúdo`;
  }, [pathname, search]);
  const editorIsolado = pathname === '/estudio/editor-prova' || (/^\/estudio\/carrosseis\/[^/]+$/.test(pathname) && pathname !== '/estudio/carrosseis/novo');

  // SidebarProvider kept only as context for legacy consumers; navigation is the header drawer.
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="flex min-h-screen w-full">
        <a href="#conteudo-principal" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-3 focus:text-foreground focus:ring-2 focus:ring-ring">Saltar para o conteúdo</a>
        <SidebarInset className="min-w-0 flex-1 flex flex-col overflow-x-clip">
          {!editorIsolado && <DashboardHeader />}
          {/* NB: NÃO usar `overflow-x-hidden` aqui — quebra `position: sticky`
              em descendentes (ex.: PreviewPanel em /manual-create). */}
          <main id="conteudo-principal" tabIndex={-1} className={editorIsolado ? "min-h-0 min-w-0 flex-1 p-0" : "mx-auto w-full max-w-[90rem] min-w-0 flex-1 p-0 xs:p-1 sm:p-4 md:p-6 xl:px-10"}>
            <ErrorBoundary key={pathname} inline>
              <Suspense fallback={<PageLoading />}><Outlet /></Suspense>
            </ErrorBoundary>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
