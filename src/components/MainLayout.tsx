import { Outlet, useLocation } from 'react-router-dom';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { DashboardHeader } from '@/components/DashboardHeader';

export function MainLayout() {
  const { pathname } = useLocation();
  const editorIsolado = pathname === '/estudio/editor-prova' || /^\/estudio\/carrosseis\/[^/]+$/.test(pathname);

  // SidebarProvider kept only as context for legacy consumers; navigation is the header drawer.
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="flex min-h-screen w-full">
        <SidebarInset className="min-w-0 flex-1 flex flex-col">
          {!editorIsolado && <DashboardHeader />}
          {/* NB: NÃO usar `overflow-x-hidden` aqui — quebra `position: sticky`
              em descendentes (ex.: PreviewPanel em /manual-create). */}
          <main className={editorIsolado ? "min-h-0 min-w-0 flex-1 p-0" : "mx-auto w-full max-w-[90rem] min-w-0 flex-1 p-0 xs:p-1 sm:p-4 md:p-6 xl:px-10"}>
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
