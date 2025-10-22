import { CheckCircle2, PlusCircle, User, X, Bell, Settings } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';

const menuItems = [
  {
    title: 'Aprovação',
    label: 'Approve',
    icon: CheckCircle2,
    url: '/pending',
    showBadge: true,
    disabled: false,
  },
  {
    title: 'Criação',
    label: 'Create',
    icon: PlusCircle,
    url: '/pending?tab=create',
    disabled: false,
  },
];

export function AppSidebar() {
  const { open, setOpen } = useSidebar();
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
  };

  // Mock notification count - você pode conectar isso ao estado real
  const notificationCount = 3;

  return (
    <>
      {/* Mobile Overlay */}
      {open && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={() => setOpen(false)}
        />
      )}
      
      <Sidebar 
        className={cn(
          "w-24 border-none transition-all duration-300",
          "fixed lg:sticky inset-y-0 left-0 z-50 lg:z-auto",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        style={{
          background: 'linear-gradient(180deg, #E0E3EC 0%, #F8FAFC 100%)',
          boxShadow: '2px 0 8px rgba(0, 0, 0, 0.05)'
        }}
      >
        {/* Mobile Close Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 lg:hidden z-10 h-8 w-8 rounded-lg hover:bg-white/40 transition-all duration-150"
          onClick={() => setOpen(false)}
        >
          <X className="h-4 w-4 text-[#4169A0]" />
        </Button>

        <SidebarContent className="flex flex-col h-full py-12">
          {/* Menu Items - Centralizados com labels */}
          <SidebarGroup className="flex-1 flex items-center">
            <SidebarGroupContent className="w-full">
              <SidebarMenu className="space-y-8">
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild={!item.disabled}
                      disabled={item.disabled}
                      className="h-auto p-0 hover:bg-transparent"
                    >
                      {item.disabled ? (
                        <div className="flex flex-col items-center gap-2 mx-auto opacity-30 cursor-not-allowed">
                          <div className="flex h-14 w-14 items-center justify-center rounded-xl relative">
                            <item.icon className="h-6 w-6 text-[#B2B7C8]" strokeWidth={1.5} />
                          </div>
                          <span className="text-xs text-[#6B7280] font-medium">{item.label}</span>
                        </div>
                      ) : (
                        <NavLink
                          to={item.url}
                          onClick={() => setOpen(false)}
                          className="flex flex-col items-center gap-2 mx-auto group"
                        >
                          {({ isActive }) => (
                            <>
                              <div
                                className={cn(
                                  'flex h-14 w-14 items-center justify-center rounded-xl relative',
                                  'transition-all duration-200 ease-in-out',
                                  'focus:outline-none focus:ring-2 focus:ring-[#4169A0]/30',
                                  isActive
                                    ? 'text-white'
                                    : 'text-[#B2B7C8] group-hover:text-[#4169A0]'
                                )}
                                style={
                                  isActive
                                    ? {
                                        background: '#4169A0',
                                        boxShadow: '0 0 0 10px rgba(65, 105, 160, 0.15), 0 4px 12px rgba(65, 105, 160, 0.3)'
                                      }
                                    : {}
                                }
                                onMouseEnter={(e) => {
                                  if (!isActive) {
                                    e.currentTarget.style.background = 'rgba(65, 105, 160, 0.15)';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isActive) {
                                    e.currentTarget.style.background = '';
                                  }
                                }}
                              >
                                <item.icon 
                                  className="h-6 w-6" 
                                  strokeWidth={1.5} 
                                />
                                {item.showBadge && notificationCount > 0 && (
                                  <Badge 
                                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px] bg-[#BC2139] border-2 border-[#E0E3EC] shadow-sm"
                                  >
                                    {notificationCount}
                                  </Badge>
                                )}
                              </div>
                              <span 
                                className={cn(
                                  "text-xs font-medium transition-colors duration-200",
                                  isActive ? "text-[#4169A0]" : "text-[#6B7280] group-hover:text-[#4169A0]"
                                )}
                              >
                                {item.label}
                              </span>
                            </>
                          )}
                        </NavLink>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Spacer */}
          <div className="flex-1" />

          {/* User Profile - Bottom Section */}
          <div className="flex flex-col items-center px-3 mt-6">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-14 w-14 rounded-xl p-0 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#4169A0]/30 hover:bg-transparent group"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Avatar className="h-11 w-11 transition-all duration-200 group-hover:ring-2 group-hover:ring-[#4169A0]/30">
                      <AvatarFallback 
                        className="font-semibold text-base text-white"
                        style={{
                          background: '#4169A0',
                          boxShadow: '0 2px 8px rgba(65, 105, 160, 0.25)'
                        }}
                      >
                        {user?.email?.charAt(0).toUpperCase() || 'A'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-[#6B7280] font-medium group-hover:text-[#4169A0] transition-colors">
                      Account
                    </span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                side="right" 
                align="end" 
                className="w-56 rounded-xl bg-white border border-[#4169A0]/10"
                style={{
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)'
                }}
              >
                <DropdownMenuLabel className="font-semibold text-[#4169A0]">
                  {user?.email?.split('@')[0] || 'Utilizador'}
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
