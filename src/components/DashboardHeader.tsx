import { useState } from 'react';
import { Menu, ChevronRight, User, LogOut, CheckCircle2, PlusCircle, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { useAuth } from '@/contexts/AuthContext';
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

export function DashboardHeader() {
  const { setOpen } = useSidebar();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  const activeTab = searchParams.get('tab');
  const getBreadcrumbs = () => {
    if (location.pathname === '/' || location.pathname === '/pending') {
      if (activeTab === 'create') {
        // Check if mode is set in localStorage for breadcrumb detail
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

  return (
    <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-lg border-b-2 border-border shadow-lg">
      <div className="flex h-16 md:h-18 items-center justify-between px-4 md:px-6">
        {/* Left: Mobile Menu + Breadcrumb */}
        <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden min-h-[44px] min-w-[44px] rounded-xl hover:bg-primary/10"
            onClick={() => (isMobile ? setMobileMenuOpen(true) : setOpen(true))}
            aria-label="Menu"
          >
            <Menu className="h-6 w-6" />
          </Button>

          <nav className="flex items-center gap-2 text-sm md:text-base overflow-x-auto scrollbar-hide">
            {breadcrumbs.map((crumb, index) => (
              <div key={index} className="flex items-center gap-2 flex-shrink-0">
                {crumb.path ? (
                  <button
                    onClick={() => navigate(crumb.path)}
                    className="text-muted-foreground hover:text-primary transition-colors duration-150 font-semibold min-h-[44px] px-2 -my-2 touch-target"
                  >
                    {crumb.label}
                  </button>
                ) : (
                  <span className="font-bold text-foreground">{crumb.label}</span>
                )}
                {index < breadcrumbs.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
              </div>
            ))}
          </nav>
        </div>

        {/* Right: Quota Badge + User Menu */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <QuotaBadge />
          
          {user && (
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="min-h-[44px] min-w-[44px] rounded-full hover:bg-primary/10 flex-shrink-0"
                aria-label="Menu do utilizador"
              >
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 md:w-72 bg-popover z-50">
              <DropdownMenuLabel className="font-normal py-3">
                <div className="flex flex-col space-y-1.5">
                  <p className="text-sm font-semibold leading-none">Utilizador Autenticado</p>
                  <p className="text-xs leading-none text-muted-foreground truncate">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => signOut()}
                className="text-destructive focus:text-destructive cursor-pointer py-3 text-base"
              >
                <LogOut className="mr-3 h-5 w-5" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          )}
        </div>

        {/* Mobile Quick Menu Drawer */}
        <Drawer open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} shouldScaleBackground>
          <DrawerContent className="pb-8">
            <DrawerHeader className="text-left">
              <DrawerTitle className="text-2xl">Menu de Navegação</DrawerTitle>
              <DrawerDescription className="text-base">Escolha para onde deseja ir</DrawerDescription>
            </DrawerHeader>
            <div className="px-6 py-4 grid gap-4">
              <Button
                size="lg"
                className="min-h-[56px] rounded-xl text-lg font-semibold"
                onClick={() => { navigate('/'); setMobileMenuOpen(false); }}
              >
                <CheckCircle2 className="mr-3 h-6 w-6" />
                Aprovar Publicações
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="min-h-[56px] rounded-xl text-lg font-semibold"
                onClick={() => { navigate('/?tab=create'); setMobileMenuOpen(false); }}
              >
                <PlusCircle className="mr-3 h-6 w-6" />
                Criar Publicação
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="min-h-[56px] rounded-xl text-lg font-semibold"
                onClick={() => { navigate('/calendar'); setMobileMenuOpen(false); }}
              >
                <Calendar className="mr-3 h-6 w-6" />
                Calendário
              </Button>
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </header>
  );
}
