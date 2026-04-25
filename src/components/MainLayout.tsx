import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { DashboardHeader } from '@/components/DashboardHeader';

export function MainLayout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col">
          <DashboardHeader />
          {/* NB: NÃO usar `overflow-x-hidden` aqui — quebra `position: sticky`
              em descendentes (ex.: PreviewPanel em /manual-create). Páginas
              que precisem de contenção horizontal devem fazê-lo no seu wrapper
              interno usando `min-w-0` em colunas de grid/flex. */}
          <main className="flex-1 p-0 xs:p-1 sm:p-4 md:p-6 max-w-full">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
