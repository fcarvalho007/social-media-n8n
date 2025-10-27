import { useState } from 'react';
import { Menu, ChevronRight, User, LogOut } from 'lucide-react';
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
      <div className="flex h-14 sm:h-16 items-center justify-between px-3 sm:px-4 lg:px-6">
        {/* Left: Mobile Menu + Breadcrumb */}
        <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-10 w-10 rounded-xl hover:bg-primary/10 touch-target"
            onClick={() => (isMobile ? setMobileMenuOpen(true) : setOpen(true))}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <nav className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
            {breadcrumbs.map((crumb, index) => (
              <div key={index} className="flex items-center gap-2">
                {crumb.path ? (
                  <button
                    onClick={() => navigate(crumb.path)}
                    className="text-muted-foreground hover:text-primary transition-colors duration-150 font-semibold"
                  >
                    {crumb.label}
                  </button>
                ) : (
                  <span className="font-bold text-foreground">{crumb.label}</span>
                )}
                {index < breadcrumbs.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            ))}
          </nav>
        </div>

        {/* Right: User Menu */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-10 w-10 rounded-full hover:bg-primary/10"
                aria-label="Menu do utilizador"
              >
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">Utilizador Autenticado</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => signOut()}
                className="text-destructive focus:text-destructive cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Mobile Quick Menu Drawer */}
        <Drawer open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} shouldScaleBackground>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Menu</DrawerTitle>
              <DrawerDescription>Escolha uma opção</DrawerDescription>
            </DrawerHeader>
            <div className="p-4 grid gap-3">
              <Button
                size="lg"
                className="h-14 rounded-xl"
                onClick={() => { navigate('/'); setMobileMenuOpen(false); }}
              >
                Aprovar
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-14 rounded-xl"
                onClick={() => { navigate('/?tab=create'); setMobileMenuOpen(false); }}
              >
                Criar
              </Button>
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </header>
  );
}
