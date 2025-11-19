import { CheckCircle2, PlusCircle, Calendar, X, FolderKanban, LayoutDashboard } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { usePendingCounts } from '@/hooks/usePendingCounts';

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
  const totalPending = counts.stories + counts.carousels + counts.posts;

  return (
    <>
      {/* Mobile: Dark overlay with backdrop blur - only show when explicitly opened */}
      {isMobile && open && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 animate-fade-in"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
      
      <Sidebar 
        collapsible="offcanvas"
        className={cn(
          "border-none transition-all duration-300 ease-out z-50",
          !isMobile && "w-[110px]"
        )}
        style={{
          background: 'linear-gradient(180deg, #E0E3EC 0%, #F8FAFC 100%)',
          boxShadow: '2px 0 12px rgba(0, 0, 0, 0.08)'
        }}
      >
        {/* Mobile Close Button */}
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-10 h-12 w-12 rounded-lg hover:bg-white/40 active:scale-95 transition-all duration-150 touch-target"
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
          >
            <X className="h-6 w-6 text-[#4169A0]" />
          </Button>
        )}

        <SidebarContent className="flex flex-col h-full py-10">
          {/* Menu Items */}
          <SidebarGroup className="flex-1 flex items-center">
            <SidebarGroupContent className="w-full">
              <SidebarMenu className="space-y-3">
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
                        <div className="flex flex-col items-center gap-2 mx-auto opacity-30 cursor-not-allowed">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full relative">
                            <item.icon className="h-5 w-5 text-[#6B7280]" strokeWidth={1.5} />
                          </div>
                          <span className="text-xs text-[#6B7280] font-medium text-center">{item.label}</span>
                        </div>
                      ) : (
                        <NavLink
                          to={item.url}
                          onClick={() => isMobile && setOpen(false)}
                          className="flex flex-col items-center gap-2 mx-auto group w-full py-3 hover:scale-105 active:scale-95 transition-all duration-200 ease-out min-h-[64px] touch-target"
                        >
                          {({ isActive }) => {
                            const isApprovalItem = item.url === '/pending';
                            const showBadge = isApprovalItem && totalPending > 0;
                            
                            return (
                              <>
                                <div 
                                  className={cn(
                                    "flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full relative transition-all duration-200",
                                    isActive && item.isMain && "bg-[#4169A0] shadow-[0_0_24px_rgba(65,105,160,0.4)]",
                                    isActive && !item.isMain && "bg-[#E3E8FA]",
                                    !isActive && "bg-white/50 group-hover:bg-white/70 group-hover:scale-110 group-hover:shadow-lg"
                                  )}
                                >
                                  <item.icon 
                                    className={cn(
                                      "h-7 w-7 sm:h-8 sm:w-8 transition-all duration-200",
                                      isActive && item.isMain && "text-white drop-shadow-sm",
                                      isActive && !item.isMain && "text-[#4169A0]",
                                      !isActive && "text-[#6B7280] group-hover:text-[#4169A0]"
                                    )} 
                                    strokeWidth={isActive ? 2.5 : 1.5}
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
                                    "text-xs font-medium text-center leading-tight transition-colors duration-200",
                                    isActive && item.isMain && "text-[#4169A0] font-semibold",
                                    isActive && !item.isMain && "text-[#4169A0] font-semibold",
                                    !isActive && "text-[#6B7280] group-hover:text-[#4169A0]"
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
      </Sidebar>
    </>
  );
}
