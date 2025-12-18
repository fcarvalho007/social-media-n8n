import { useState } from 'react';
import { Menu, ChevronRight, User, Settings, Search, Users, FileText, AlertTriangle, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { QuotaBadge } from '@/components/QuotaBadge';
import { GlobalSearch } from '@/components/GlobalSearch';
import { NotificationBell } from '@/components/NotificationBell';

export function DashboardHeader() {
  const { setOpen, toggleSidebar } = useSidebar();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  const [searchOpen, setSearchOpen] = useState(false);
  const activeTab = searchParams.get('tab');
  const getBreadcrumbs = () => {
    if (location.pathname === '/dashboard') {
      return [{ label: 'Dashboard', path: null }];
    }
    if (location.pathname === '/users') {
      return [
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Utilizadores', path: null },
      ];
    }
    if (location.pathname === '/projects') {
      return [
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Projetos', path: null },
      ];
    }
    if (location.pathname.startsWith('/projects/')) {
      return [
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Projetos', path: '/projects' },
        { label: 'Detalhes', path: null },
      ];
    }
    if (location.pathname === '/' || location.pathname === '/pending') {
      if (activeTab === 'create') {
        const mode = localStorage.getItem('preferredCreationMode');
        const modeLabel = mode === 'manual' ? 'Manual' : mode === 'ia' ? 'IA' : '';
        
        return [
          { label: 'Painel de Conteúdo', path: '/' },
          { label: 'Criar', path: null },
          ...(modeLabel ? [{ label: modeLabel, path: null }] : []),
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

  // Em mobile, esconder "Painel de Conteúdo" quando é o único breadcrumb
  const displayBreadcrumbs = isMobile 
    ? breadcrumbs.filter(crumb => !(breadcrumbs.length === 1 && crumb.label === 'Painel de Conteúdo'))
    : breadcrumbs;

  return (
    <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-lg border-b border-border shadow-sm">
      <div className="flex h-16 items-center justify-between px-3 sm:px-4 md:px-6 gap-2 sm:gap-3">
        {/* Left: Mobile Menu + Breadcrumb */}
        <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 min-h-[48px] min-w-[48px] touch-target rounded-lg hover:bg-primary/10 active:scale-95 transition-transform duration-150"
            onClick={() => toggleSidebar()}
            aria-label="Menu"
          >
            <Menu className="h-6 w-6" />
          </Button>

          <nav className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm overflow-x-auto scrollbar-hide">
            {displayBreadcrumbs.map((crumb, index) => (
              <div key={index} className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                {crumb.path ? (
                  <button
                    onClick={() => navigate(crumb.path)}
                    className="text-muted-foreground hover:text-primary transition-colors duration-150 font-medium px-1 whitespace-nowrap truncate max-w-[120px] sm:max-w-none"
                    title={crumb.label}
                  >
                    {crumb.label}
                  </button>
                ) : (
                  <span 
                    className="font-semibold text-foreground whitespace-nowrap truncate max-w-[120px] sm:max-w-none" 
                    title={crumb.label}
                  >
                    {crumb.label}
                  </span>
                )}
                {index < displayBreadcrumbs.length - 1 && (
                  <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                )}
              </div>
            ))}
          </nav>
        </div>

        {/* Right: Search + Notifications + Quota Badge + Settings */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
          {/* Global Search Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSearchOpen(true)}
            className="h-10 w-10 min-h-[44px] min-w-[44px] touch-target rounded-lg hover:bg-primary/10 active:scale-95 transition-all duration-150"
            aria-label="Pesquisar (Cmd+K)"
          >
            <Search className="h-5 w-5" />
          </Button>

          {/* Notifications */}
          <NotificationBell />

          {/* Quota Badge - Hidden on small mobile */}
          <div className="hidden xs:block">
            <QuotaBadge />
          </div>
          
          {/* Settings Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 min-h-[44px] min-w-[44px] touch-target rounded-lg hover:bg-primary/10 active:scale-95 transition-all duration-150"
                aria-label="Definições"
              >
                <Settings className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Definições</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/quota')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Configurações de Quota</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/users')}>
                <Users className="mr-2 h-4 w-4" />
                <span>Gestão de Utilizadores</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">Conteúdos</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigate('/drafts')}>
                <FileText className="mr-2 h-4 w-4" />
                <span>Rascunhos</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/failed-publications')}>
                <AlertTriangle className="mr-2 h-4 w-4" />
                <span>Publicações Falhadas</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/publication-history')}>
                <History className="mr-2 h-4 w-4" />
                <span>Histórico de Publicações</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Global Search Dialog */}
        <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
      </div>
    </header>
  );
}
