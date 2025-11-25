import { useState, useEffect } from 'react';
import { CheckCircle2, PlusCircle, Calendar, X, FolderKanban, LayoutDashboard, Settings, LogOut } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { usePendingCounts } from '@/hooks/usePendingCounts';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const menuItems = [
  {
    title: 'Dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    url: '/dashboard',
    disabled: false,
    isMain: false,
  },
  {
    title: 'Aprovação',
    label: 'Aprovar',
    icon: CheckCircle2,
    url: '/pending',
    showBadge: true,
    disabled: false,
    isMain: true,
  },
  {
    title: 'Criação',
    label: 'Criar',
    icon: PlusCircle,
    url: '/pending?tab=create',
    disabled: false,
    isMain: false,
  },
  {
    title: 'Calendário',
    label: 'Calendário',
    icon: Calendar,
    url: '/calendar',
    disabled: false,
    isMain: false,
  },
  {
    title: 'Projetos',
    label: 'Projetos',
    icon: FolderKanban,
    url: '/projects',
    disabled: false,
    isMain: false,
  },
];

export function AppSidebar() {
  const { open, setOpen, isMobile, openMobile } = useSidebar();
  const { counts } = usePendingCounts();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const totalPending = counts.stories + counts.carousels + counts.posts;
  const [userOpened, setUserOpened] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  // When sidebar opens in mobile, mark it as user-opened
  useEffect(() => {
    if (isMobile && open) {
      setUserOpened(true);
    }
  }, [isMobile, open]);

  return (
    <>
      {/* Mobile: Dark overlay with backdrop blur - only show when user explicitly opened sidebar */}
      {isMobile && open && userOpened && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 animate-fade-in"
          onClick={() => {
            setUserOpened(false);
            setOpen(false);
          }}
          aria-hidden="true"
        />
      )}
      
      <Sidebar 
        collapsible="offcanvas"
        className={cn(
          "border-none transition-all duration-300 ease-out z-50",
          !isMobile && "w-[110px]",
          "bg-gradient-to-b from-muted/30 via-background/50 to-background/80",
          "backdrop-blur-xl",
          "shadow-[2px_0_24px_rgba(0,0,0,0.06)]"
        )}
      >
        {/* Mobile Close Button */}
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-10 h-11 w-11 rounded-xl hover:bg-primary/10 active:scale-95 transition-all duration-200 touch-target"
            onClick={() => {
              setUserOpened(false);
              setOpen(false);
            }}
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5 text-primary" />
          </Button>
        )}

        <SidebarContent className="flex flex-col h-full py-8">
          {/* Menu Items */}
          <SidebarGroup className="flex-1 flex items-center">
            <SidebarGroupContent className="w-full px-2">
              <SidebarMenu className="space-y-2">
                {menuItems.map((item, index) => (
                  <SidebarMenuItem 
                    key={item.title}
                    style={{
                      animation: `fade-in 0.3s ease-out ${index * 0.05}s both`
                    }}
                  >
                    <SidebarMenuButton 
                      asChild={!item.disabled}
                      disabled={item.disabled}
                      className="h-auto p-0 hover:bg-transparent"
                    >
                      {item.disabled ? (
                        <div className="flex flex-col items-center gap-2.5 mx-auto opacity-40 cursor-not-allowed">
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50 relative">
                            <item.icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                          </div>
                          <span className="text-[11px] text-muted-foreground font-medium text-center leading-tight">{item.label}</span>
                        </div>
                      ) : (
                        <NavLink
                          to={item.url}
                          onClick={() => isMobile && setOpen(false)}
                          className="flex flex-col items-center gap-2.5 mx-auto group w-full py-2.5 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ease-out min-h-[72px] touch-target rounded-2xl"
                        >
                          {({ isActive }) => {
                            const isApprovalItem = item.url === '/pending';
                            const showBadge = isApprovalItem && totalPending > 0;
                            
                            return (
                              <>
                                <div 
                                  className={cn(
                                    "flex h-[60px] w-[60px] sm:h-[64px] sm:w-[64px] items-center justify-center rounded-2xl relative transition-all duration-300 ease-out",
                                    isActive && item.isMain && "bg-primary shadow-[0_8px_32px_-8px_hsl(var(--primary)/0.5)] ring-2 ring-primary/20 ring-offset-2 ring-offset-background",
                                    isActive && !item.isMain && "bg-primary/10 ring-2 ring-primary/20",
                                    !isActive && "bg-card/80 backdrop-blur-sm group-hover:bg-card group-hover:shadow-lg group-hover:ring-2 group-hover:ring-primary/10"
                                  )}
                                >
                                  <item.icon 
                                    className={cn(
                                      "h-6 w-6 sm:h-7 sm:w-7 transition-all duration-300",
                                      isActive && item.isMain && "text-primary-foreground",
                                      isActive && !item.isMain && "text-primary",
                                      !isActive && "text-muted-foreground group-hover:text-primary group-hover:scale-110"
                                    )} 
                                    strokeWidth={isActive ? 2.5 : 2}
                                  />
                                  
                                  {/* Pending Badge */}
                                  {showBadge && (
                                    <TooltipProvider delayDuration={0}>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Badge 
                                            variant="destructive" 
                                            className="absolute -top-1 -right-1 h-6 w-6 rounded-full p-0 flex items-center justify-center shadow-lg text-xs font-bold animate-pulse cursor-help"
                                          >
                                            {totalPending}
                                          </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent 
                                          side="right" 
                                          className="bg-popover text-popover-foreground border border-border shadow-xl"
                                        >
                                          <div className="text-sm space-y-1">
                                            {counts.stories > 0 && (
                                              <p className="font-medium">
                                                Stories: <span className="text-destructive">{counts.stories}</span>
                                              </p>
                                            )}
                                            {counts.carousels > 0 && (
                                              <p className="font-medium">
                                                Carrosséis: <span className="text-destructive">{counts.carousels}</span>
                                              </p>
                                            )}
                                            {counts.posts > 0 && (
                                              <p className="font-medium">
                                                Posts: <span className="text-destructive">{counts.posts}</span>
                                              </p>
                                            )}
                                          </div>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                                
                                <span 
                                  className={cn(
                                    "text-[11px] font-semibold text-center leading-tight transition-all duration-300 tracking-wide",
                                    isActive && "text-primary scale-105",
                                    !isActive && "text-muted-foreground group-hover:text-primary"
                                  )}
                                >
                                  {item.label}
                                </span>
                              </>
                            );
                          }}
                        </NavLink>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        
        <SidebarFooter className="border-t border-border/30 bg-card/40 backdrop-blur-md">
          <div className="flex flex-col items-center gap-4 p-5">
            <Avatar className="h-11 w-11 ring-2 ring-primary/20 ring-offset-2 ring-offset-background transition-all hover:ring-primary/40 hover:scale-105">
              <AvatarFallback className="bg-primary/15 text-primary text-sm font-bold">
                {user?.email ? getInitials(user.email) : 'U'}
              </AvatarFallback>
            </Avatar>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="h-10 w-10 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-all duration-300 hover:scale-105 active:scale-95"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>
    </>
  );
}
