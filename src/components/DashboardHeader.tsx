import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';
import { useLocation, useSearchParams } from 'react-router-dom';

export function DashboardHeader() {
  const { setOpen } = useSidebar();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  const activeTab = searchParams.get('tab');

  const getBreadcrumbs = () => {
    if (location.pathname === '/') {
      return { section: 'Dashboard', page: 'Visão Geral' };
    }
    if (location.pathname === '/pending') {
      if (activeTab === 'create') {
        return { section: 'Painel de Conteúdo', page: 'Criação' };
      }
      return { section: 'Painel de Conteúdo', page: 'Aprovação' };
    }
    if (location.pathname.startsWith('/review')) {
      return { section: 'Painel de Conteúdo', page: 'Revisão' };
    }
    return { section: 'Dashboard', page: 'Conteúdo' };
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-gray-100 shadow-sm animate-fade-in">
      <div className="flex h-16 items-center justify-between px-4 lg:px-6">
        {/* Left: Mobile Menu + Breadcrumb */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-10 w-10 rounded-xl hover:bg-[#4169A0]/10"
            onClick={() => setOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-2 text-sm">
            <span className="text-[#6B7280]">{breadcrumbs.section}</span>
            <span className="text-[#6B7280]">/</span>
            <span className="font-semibold text-foreground">{breadcrumbs.page}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
