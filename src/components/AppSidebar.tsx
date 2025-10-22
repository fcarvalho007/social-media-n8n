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
        "w-24 border-r-0 transition-all duration-300",
        "fixed lg:sticky inset-y-0 left-0 z-50 lg:z-auto rounded-r-lg lg:rounded-r-none",
        "bg-gradient-to-b from-iconosquare-bg to-background shadow-xl",
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

        <SidebarContent className="flex flex-col h-full py-6">
          {/* Logo no Topo */}
          <div className="flex justify-center mb-8 px-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-iconosquare-blue to-primary flex items-center justify-center shadow-lg glow-iconosquare">
              <span className="text-white font-bold text-2xl">N</span>
            </div>
          </div>

          {/* Menu Items */}
          <SidebarGroup className="flex-1">
            <SidebarGroupContent>
              <SidebarMenu className="space-y-3">
                <TooltipProvider delayDuration={100}>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton 
                            asChild={!item.disabled}
                            disabled={item.disabled}
                          >
                            {item.disabled ? (
                              <div className="flex h-14 w-14 items-center justify-center rounded-xl mx-auto opacity-40 cursor-not-allowed">
                                <item.icon className="h-6 w-6 text-iconosquare-inactive" strokeWidth={2} />
                              </div>
                            ) : (
                              <NavLink
                                to={item.url}
                                onClick={() => setOpen(false)}
                                className={({ isActive }) =>
                                  cn(
                                    'flex h-14 w-14 items-center justify-center rounded-xl transition-all duration-200 mx-auto group',
                                    'hover:bg-iconosquare-blue/15 focus:outline-none focus:ring-2 focus:ring-iconosquare-blue',
                                    isActive
                                      ? 'bg-iconosquare-blue text-white shadow-lg glow-iconosquare'
                                      : 'text-iconosquare-inactive hover:text-iconosquare-blue'
                                  )
                                }
                              >
                                <item.icon 
                                  className={cn(
                                    "h-6 w-6 transition-transform duration-200",
                                    "group-hover:scale-110"
                                  )} 
                                  strokeWidth={2} 
                                />
                              </NavLink>
                            )}
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent 
                          side="right" 
                          className="font-medium text-sm bg-white text-iconosquare-blue border-iconosquare-blue/20 shadow-lg"
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
          <div className="flex justify-center mt-auto px-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-14 w-14 rounded-xl p-0 hover:bg-iconosquare-blue/15 transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-iconosquare-blue"
                >
                  <Avatar className="h-11 w-11 border-2 border-iconosquare-inactive group-hover:border-iconosquare-blue transition-colors">
                    <AvatarFallback className="bg-gradient-to-br from-iconosquare-blue to-primary text-white font-semibold text-lg">
                      {user?.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                side="right" 
                align="end" 
                className="w-56 rounded-xl bg-white shadow-xl border-iconosquare-blue/20"
              >
                <DropdownMenuLabel className="font-semibold text-iconosquare-blue">
                  Minha Conta
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer rounded-lg focus:bg-iconosquare-blue/10">
                  <User className="mr-2 h-4 w-4" />
                  Perfil
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer rounded-lg focus:bg-iconosquare-blue/10">
                  <Settings className="mr-2 h-4 w-4" />
                  Configurações
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-iconosquare-alert focus:text-iconosquare-alert focus:bg-iconosquare-alert/10 rounded-lg"
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
