import { useState } from 'react';
import { Menu, ChevronRight, Settings, Search, Users, FileText, AlertTriangle, History, Sparkles } from 'lucide-react';
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
import { AICreditsBadge } from '@/components/ai/AICreditsBadge';

export function DashboardHeader() {
  const { setOpen, toggleSidebar } = useSidebar();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  const [searchOpen, setSearchOpen] = useState(false);
  const activeTab = searchParams.get('tab');
  const getBreadcrumbs = (): { label: string; path: string | null }[] => {
    const p = location.pathname;
    const E = { label: 'Estúdio', path: '/' };
    const S = { label: 'Painel social', path: '/redes-sociais' };
    if (p === '/') return [{ label: 'Estúdio', path: null }];
    if (p === '/redes-sociais') return [E, { label: 'Painel social', path: null }];
    if (p === '/estudio/redes-sociais') return [E, { label: 'Carrosséis', path: null }];
    if (p.startsWith('/estudio/redes-sociais/')) return [E, { label: 'Carrosséis', path: '/estudio/redes-sociais' }, { label: 'Editor', path: null }];
    if (p === '/estudio/ligacoes') return [E, { label: 'Ligações', path: null }];
    if (p === '/newsletter/migracao') return [E, { label: 'Newsletter', path: '/newsletter' }, { label: 'Migração', path: null }];
    if (p.startsWith('/newsletter/')) return [E, { label: 'Newsletter', path: '/newsletter' }, { label: 'Detalhe', path: null }];
    if (p === '/newsletter') return [E, { label: 'Newsletter', path: null }];
    if (p === '/artigos') return [E, { label: 'Artigos', path: null }];
    if (p === '/manual-create') return [E, { label: 'Publicação livre', path: null }];
    if (p === '/definicoes/seguranca') return [E, { label: 'Segurança da conta', path: null }];
    if (p === '/users') return [S, { label: 'Utilizadores', path: null }];
    if (p === '/projects') return [E, { label: 'Projetos', path: null }];
    if (p.startsWith('/projects/')) return [E, { label: 'Projetos', path: '/projects' }, { label: 'Detalhes', path: null }];
    if (p === '/pending') {
      if (activeTab === 'create') {
        const mode = localStorage.getItem('preferredCreationMode');
        const modeLabel = mode === 'manual' ? 'Manual' : mode === 'ia' ? 'IA' : '';
        return [S, { label: 'Criar', path: null }, ...(modeLabel ? [{ label: modeLabel, path: null }] : [])];
      }
      return [S, { label: 'Pendentes', path: null }];
    }
    if (p.startsWith('/review')) return [S, { label: 'Revisão', path: null }];
    return [S];
  };

  const breadcrumbs = getBreadcrumbs();

  // On mobile show only the current area name so it is never cut behind other controls
  const displayBreadcrumbs = isMobile ? breadcrumbs.slice(-1) : breadcrumbs;
  // Quotas only help where something is published
  const mostraQuotas = /^\/(manual-create|redes-sociais|calendar|drafts|pending|quota)/.test(location.pathname);

  return (
    <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-lg border-b border-border shadow-sm max-w-[100vw] overflow-hidden">
      <div className="flex h-12 xs:h-14 sm:h-16 items-center justify-between px-2 xs:px-3 sm:px-4 md:px-6 gap-1 xs:gap-2 sm:gap-3 w-full max-w-[100vw]">
        {/* Left: Mobile Menu + Breadcrumb */}
        <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 xs:h-11 xs:w-11 min-h-[40px] min-w-[40px] touch-target rounded-lg hover:bg-primary/10 active:scale-95 transition-transform duration-150"
            onClick={() => toggleSidebar()}
            aria-label="Menu"
          >
            <Menu className="h-5 w-5 xs:h-6 xs:w-6" />
          </Button>

          <nav className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm overflow-x-auto scrollbar-hide min-w-0">
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
                    className="font-semibold text-foreground whitespace-nowrap truncate max-w-[55vw] sm:max-w-none" 
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
        <div className="flex items-center gap-0.5 xs:gap-1 sm:gap-2 flex-shrink-0">
          {/* Global Search Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSearchOpen(true)}
            className="h-9 w-9 xs:h-10 xs:w-10 min-h-[36px] min-w-[36px] touch-target rounded-lg hover:bg-primary/10 active:scale-95 transition-all duration-150"
            aria-label="Pesquisar (Cmd+K)"
          >
            <Search className="h-4 w-4 xs:h-5 xs:w-5" />
          </Button>

          {/* Notifications */}
          <NotificationBell />

          {/* Quota Badge - Hidden on very small screens */}
          {mostraQuotas && (
            <>
              <div className="hidden sm:block">
                <QuotaBadge />
              </div>
              <div className="hidden md:block">
                <AICreditsBadge />
              </div>
            </>
          )}
          
          {/* Settings Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 xs:h-10 xs:w-10 min-h-[36px] min-w-[36px] touch-target rounded-lg hover:bg-primary/10 active:scale-95 transition-all duration-150"
                aria-label="Definições"
              >
                <Settings className="h-4 w-4 xs:h-5 xs:w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Definições</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/quota')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Configurações de Quota</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/ai-settings')}>
                <Sparkles className="mr-2 h-4 w-4" />
                <span>Preferências de IA</span>
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
