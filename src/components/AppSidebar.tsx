import { Home, CheckCircle2, PlusCircle, BarChart3, Settings, User, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const menuItems = [
  {
    title: 'Dashboard',
    icon: Home,
    url: '/',
  },
  {
    title: 'Aprovação',
    icon: CheckCircle2,
    url: '/pending',
  },
  {
    title: 'Criação',
    icon: PlusCircle,
    url: '/pending?tab=create',
  },
  {
    title: 'Relatórios',
    icon: BarChart3,
    url: '/reports',
    disabled: true,
  },
  {
    title: 'Configurações',
    icon: Settings,
    url: '/settings',
    disabled: true,
  },
];

export function AppSidebar() {
  const { open, setOpen } = useSidebar();
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <>
      {/* Mobile Overlay */}
      {open && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={() => setOpen(false)}
        />
      )}
      
      <Sidebar className={cn(
        "w-20 border-r border-border transition-all duration-300",
        "fixed lg:sticky inset-y-0 left-0 z-50 lg:z-auto",
        "bg-white shadow-lg",
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Mobile Close Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 lg:hidden z-10 h-8 w-8 rounded-lg hover:bg-iconosquare-blue/10"
          onClick={() => setOpen(false)}
        >
          <X className="h-4 w-4 text-iconosquare-blue" />
        </Button>

        <SidebarContent className="flex flex-col h-full py-4">
          {/* Logo no Topo */}
          <div className="flex justify-center mb-6 px-3">
            <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-2xl">N</span>
            </div>
          </div>

          {/* Menu Items */}
          <SidebarGroup className="flex-1">
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                <TooltipProvider delayDuration={150}>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton 
                            asChild={!item.disabled}
                            disabled={item.disabled}
                            className="h-auto p-0"
                          >
                            {item.disabled ? (
                              <div className="flex h-12 w-12 items-center justify-center rounded-xl mx-auto opacity-30 cursor-not-allowed">
                                <item.icon className="h-5 w-5 text-muted-foreground" strokeWidth={2} />
                              </div>
                            ) : (
                              <NavLink
                                to={item.url}
                                onClick={() => setOpen(false)}
                                className={({ isActive }) =>
                                  cn(
                                    'flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-200 mx-auto',
                                    'focus:outline-none focus:ring-2 focus:ring-primary/50',
                                    isActive
                                      ? 'bg-primary text-white shadow-md'
                                      : 'text-muted-foreground hover:text-primary hover:bg-primary/5'
                                  )
                                }
                              >
                                <item.icon 
                                  className="h-5 w-5" 
                                  strokeWidth={2} 
                                />
                              </NavLink>
                            )}
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent 
                          side="right" 
                          className="font-medium text-sm"
                        >
                          {item.title}
                        </TooltipContent>
                      </Tooltip>
                    </SidebarMenuItem>
                  ))}
                </TooltipProvider>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* User Avatar no Fundo */}
          <div className="flex justify-center mt-auto px-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-12 w-12 rounded-xl p-0 hover:bg-primary/5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary text-white font-semibold text-base">
                      {user?.email?.charAt(0).toUpperCase() || 'A'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                side="right" 
                align="end" 
                className="w-56 rounded-xl"
              >
                <DropdownMenuLabel className="font-semibold">
                  Minha Conta
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer rounded-lg">
                  <User className="mr-2 h-4 w-4" />
                  Perfil
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer rounded-lg">
                  <Settings className="mr-2 h-4 w-4" />
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
        </SidebarContent>
      </Sidebar>
    </>
  );
}
