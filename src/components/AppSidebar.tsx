import { CheckCircle2, PlusCircle, Calendar, X, FolderKanban, LayoutDashboard, LogOut, Image, BarChart3, Lightbulb, Sparkles, Mail, Layers, ShieldCheck } from 'lucide-react';
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

const menuItems = [
  {
    title: 'Estúdio de conteúdos',
    label: 'Estúdio',
    icon: Sparkles,
    url: '/',
    disabled: false,
    isMain: false,
  },
  {
    title: 'Carrosséis',
    label: 'Carrosséis',
    icon: Layers,
    url: '/estudio/carrosseis',
    disabled: false,
    isMain: false,
  },
  {
    title: 'Painel social',
    label: 'Painel social',
    icon: LayoutDashboard,
    url: '/redes-sociais',
    disabled: false,
    isMain: false,
  },
  {
    title: 'Newsletter',
    label: 'Newsletter',
    icon: Mail,
    url: '/newsletter',
    disabled: false,
    isMain: false,
  },
  {
    title: 'Criação',
    label: 'Criar',
    icon: PlusCircle,
    url: '/pending?tab=create',
    getSmartUrl: () => {
      const preferredMode = localStorage.getItem('preferredCreationMode');
      return preferredMode === 'manual' ? '/manual-create' : '/pending?tab=create';
    },
    disabled: false,
    isMain: true,
  },
  {
    title: 'Aprovação',
    label: 'Aprovar',
    icon: CheckCircle2,
    url: '/pending',
    showBadge: true,
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
  {
    title: 'Analytics',
    label: 'Analytics',
    icon: BarChart3,
    url: '/analytics',
    disabled: false,
    isMain: false,
  },
  {
    title: 'Insights',
    label: 'Insights',
    icon: Lightbulb,
    url: '/insights',
    disabled: false,
    isMain: false,
  },
  {
    title: 'Biblioteca',
    label: 'Biblioteca',
    icon: Image,
    url: '/media-library',
    disabled: false,
    isMain: false,
  },
];

export function AppSidebar() {
  const { isMobile, setOpenMobile } = useSidebar();
  const { counts } = usePendingCounts();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const totalPending = counts.stories + counts.carousels + counts.posts;

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <>
      <Sidebar 
        collapsible="offcanvas"
        className={cn(
          "border-none transition-all duration-300 ease-out z-50",
          "bg-sidebar text-sidebar-foreground",
          "shadow-md"
        )}
      >
        {/* Mobile Close Button */}
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-3 top-3 z-10 h-11 w-11 rounded-md text-sidebar-foreground hover:bg-sidebar-muted hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            onClick={() => setOpenMobile(false)}
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5 text-sidebar-foreground" />
          </Button>
        )}

        <SidebarContent className="flex flex-col h-full py-4 overflow-y-auto overflow-x-hidden">
          {/* Menu Items */}
          <SidebarGroup className="flex-1 items-start md:items-center">
            <SidebarGroupContent className="w-full px-1.5">
              <SidebarMenu className="space-y-0.5">
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild={!item.disabled}
                      disabled={item.disabled}
                      tooltip={item.title}
                      className="h-auto min-h-11 overflow-visible p-0 hover:bg-transparent focus-visible:ring-0"
                    >
                      {item.disabled ? (
                        <div className="flex flex-col items-center gap-2 mx-auto opacity-40 cursor-not-allowed">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted/50 relative">
                            <item.icon className="h-5 w-5 text-sidebar-foreground/50" strokeWidth={1.5} />
                          </div>
                          <span className="text-xs text-sidebar-foreground/50 font-medium text-center leading-tight">{item.label}</span>
                        </div>
                      ) : (
                        <NavLink
                          to={(item as any).getSmartUrl ? (item as any).getSmartUrl() : item.url}
                          end={item.url === '/'}
                          onClick={() => isMobile && setOpenMobile(false)}
                          aria-label={item.title}
                          className="group/sidebar-link mx-auto flex min-h-[60px] w-full flex-col items-center gap-1 rounded-md py-1.5 text-sidebar-muted-foreground transition-colors duration-150 hover:bg-sidebar-muted hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sidebar-ring"
                        >
                          {({ isActive }) => {
                            const isApprovalItem = item.url === '/pending';
                            const showBadge = isApprovalItem && totalPending > 0;
                            
                            return (
                              <>
                                <div 
                                  className={cn(
                                    "relative flex h-11 w-11 items-center justify-center rounded-md transition-colors duration-150",
                                    isActive ? "bg-sidebar-primary text-sidebar-primary-foreground ring-1 ring-sidebar-ring/60" : "bg-sidebar-muted text-sidebar-muted-foreground group-hover/sidebar-link:text-sidebar-foreground"
                                  )}
                                >
                                  <item.icon 
                                    className="h-5 w-5 transition-colors duration-150"
                                    strokeWidth={isActive ? 2.5 : 2}
                                    aria-hidden="true"
                                  />
                                  
                                  {/* Pending Badge */}
                                  {showBadge && (
                                    <TooltipProvider delayDuration={0}>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Badge 
                                            variant="destructive" 
                                            className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full p-0 flex items-center justify-center shadow-md text-[9px] font-bold animate-pulse cursor-help"
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
                                    "block w-full px-1 text-center text-xs font-medium leading-tight text-current transition-colors duration-150 [overflow-wrap:anywhere]",
                                    isActive && "font-semibold text-sidebar-foreground"
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
        
        <SidebarFooter className="border-t border-sidebar-border bg-sidebar">
          <div className="flex flex-col items-center gap-1 p-2">
            <Button
              variant="ghost"
              onClick={() => navigate('/definicoes/seguranca')}
              className="h-auto min-h-11 w-full flex-col gap-1 rounded-md px-1 py-1.5 text-xs font-medium leading-tight text-sidebar-muted-foreground hover:bg-sidebar-muted hover:text-sidebar-foreground focus-visible:ring-sidebar-ring"
              title={user?.email ? `Segurança da conta — ${user.email}` : 'Segurança da conta'}
              aria-label="Segurança da conta"
            >
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              <span>Segurança</span>
            </Button>
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="h-auto min-h-11 w-full flex-col gap-1 rounded-md px-1 py-1.5 text-xs font-medium leading-tight text-sidebar-muted-foreground hover:bg-sidebar-muted hover:text-sidebar-foreground focus-visible:ring-sidebar-ring"
              title="Sair"
              aria-label="Sair"
            >
              <LogOut className="h-5 w-5" aria-hidden="true" />
              <span>Sair</span>
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>
    </>
  );
}
