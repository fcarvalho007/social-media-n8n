import { Menu, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom';

export function DashboardHeader() {
  const { setOpen } = useSidebar();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const activeTab = searchParams.get('tab');

  const getBreadcrumbs = () => {
    if (location.pathname === '/' || location.pathname === '/pending') {
      if (activeTab === 'create') {
        return [
          { label: 'Painel de Conteúdo', path: '/' },
          { label: 'Criação', path: null },
        ];
      }
      return [
        { label: 'Painel de Conteúdo', path: null },
      ];
    }
    if (location.pathname.startsWith('/review')) {
      return [
        { label: 'Painel de Conteúdo', path: '/' },
        { label: 'Revisão', path: null },
      ];
    }
    return [
      { label: 'Painel de Conteúdo', path: null },
    ];
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-gray-100 shadow-sm">
      <div className="flex h-14 sm:h-16 items-center justify-between px-3 sm:px-4 lg:px-6">
        {/* Left: Mobile Menu + Breadcrumb */}
        <div className="flex items-center gap-2 sm:gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-10 w-10 rounded-xl hover:bg-[#4169A0]/10 touch-target"
            onClick={() => setOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <nav className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
            {breadcrumbs.map((crumb, index) => (
              <div key={index} className="flex items-center gap-2">
                {crumb.path ? (
                  <button
                    onClick={() => navigate(crumb.path)}
                    className="text-[#6B7280] hover:text-[#4169A0] transition-colors duration-150 font-medium"
                  >
                    {crumb.label}
                  </button>
                ) : (
                  <span className="font-semibold text-foreground">{crumb.label}</span>
                )}
                {index < breadcrumbs.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-[#B2B7C8]" />
                )}
              </div>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
