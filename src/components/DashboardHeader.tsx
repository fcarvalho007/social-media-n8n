import { Menu, Bell, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';
import { useLocation, useSearchParams } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

export function DashboardHeader() {
  const { setOpen } = useSidebar();
  const { user, signOut } = useAuth();
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

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-lg border-b border-border/50 shadow-sm animate-fade-in">
      <div className="flex h-16 items-center justify-between px-4 lg:px-6">
        {/* Left: Mobile Menu + Breadcrumb */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-10 w-10 rounded-xl hover:bg-primary/10"
            onClick={() => setOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="hidden sm:flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{breadcrumbs.section}</span>
            <span className="text-muted-foreground">/</span>
            <span className="font-semibold text-foreground">{breadcrumbs.page}</span>
          </div>
        </div>

        {/* Right: Notifications + User Menu */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="relative h-10 w-10 rounded-xl hover:bg-primary/10"
          >
            <Bell className="h-5 w-5" />
            <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px] bg-destructive">
              3
            </Badge>
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-10 px-3 gap-2 rounded-xl hover:bg-primary/10 transition-all"
              >
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center shadow-md">
                  <User className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="hidden md:inline-block font-medium text-sm">
                  {user?.email?.split('@')[0] || 'Utilizador'}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl">
              <DropdownMenuLabel className="font-semibold">Minha Conta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer rounded-lg">
                Perfil
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer rounded-lg">
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer text-destructive focus:text-destructive rounded-lg"
              >
                Terminar Sessão
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
