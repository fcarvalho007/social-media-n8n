import { CheckCircle2, PlusCircle, Calendar, X } from 'lucide-react';
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

const menuItems = [
  {
    title: 'Aprovação',
    label: 'Aprovar',
    icon: CheckCircle2,
    url: '/',
    showBadge: true,
    disabled: false,
    isMain: true,
  },
  {
    title: 'Criação',
    label: 'Criar',
    icon: PlusCircle,
    url: '/?tab=create',
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
];

export function AppSidebar() {
  const { open, setOpen } = useSidebar();

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
          "w-28 md:w-32 border-none transition-all duration-300",
          "fixed lg:sticky inset-y-0 left-0 z-50 lg:z-auto",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        style={{
          background: 'linear-gradient(180deg, #E0E3EC 0%, #F8FAFC 100%)',
          boxShadow: '2px 0 12px rgba(0, 0, 0, 0.08)'
        }}
      >
        {/* Mobile Close Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 lg:hidden z-10 min-h-[44px] min-w-[44px] rounded-lg hover:bg-white/40 transition-all duration-150"
          onClick={() => setOpen(false)}
          aria-label="Fechar menu"
        >
          <X className="h-5 w-5 text-[#4169A0]" />
        </Button>

        <SidebarContent className="flex flex-col h-full py-16 md:py-12">
          {/* Menu Items - Centralizados com labels */}
          <SidebarGroup className="flex-1 flex items-center">
            <SidebarGroupContent className="w-full">
              <SidebarMenu className="space-y-10 md:space-y-8">
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild={!item.disabled}
                      disabled={item.disabled}
                      className="h-auto p-0 hover:bg-transparent"
                    >
                      {item.disabled ? (
                        <div className="flex flex-col items-center gap-2.5 mx-auto opacity-30 cursor-not-allowed">
                          <div className="flex h-16 w-16 md:h-14 md:w-14 items-center justify-center rounded-full relative">
                            <item.icon className="h-7 w-7 md:h-6 md:w-6 text-[#6B7280]" strokeWidth={1.5} />
                          </div>
                          <span className="text-sm md:text-xs text-[#6B7280] font-medium">{item.label}</span>
                        </div>
                      ) : (
                        <NavLink
                          to={item.url}
                          onClick={() => setOpen(false)}
                          className="flex flex-col items-center gap-2.5 mx-auto group min-h-[44px]"
                        >
                          {({ isActive }) => (
                            <>
                              <div
                                className={cn(
                                  'flex h-16 w-16 md:h-[60px] md:w-[60px] items-center justify-center rounded-full relative',
                                  'transition-all duration-200 ease-in-out',
                                  isActive && item.isMain
                                    ? 'bg-[#4169A0] text-white shadow-lg'
                                    : isActive && !item.isMain
                                    ? 'bg-[#E3E8FA] text-[#1E3A8A]'
                                    : 'text-[#6B7280] group-hover:bg-[#4169A0]/15 active:bg-[#4169A0]/25'
                                )}
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
                                  className="h-7 w-7 md:h-6 md:w-6" 
                                  strokeWidth={1.5} 
                                />
                                {item.showBadge && notificationCount > 0 && (
                                  <Badge 
                                    className="absolute -top-1 -right-1 h-6 w-6 md:h-5 md:w-5 rounded-full p-0 flex items-center justify-center text-xs md:text-[10px] font-bold bg-[#EF4444] text-white border-2 border-[#E0E3EC] shadow-sm"
                                  >
                                    {notificationCount}
                                  </Badge>
                                )}
                              </div>
                              <span 
                                className={cn(
                                  "text-sm md:text-xs font-medium transition-colors duration-200",
                                  isActive ? "text-[#4169A0]" : "text-[#6B7280] group-hover:text-[#4169A0]"
                                )}
                                style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500 }}
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

        </SidebarContent>
      </Sidebar>
    </>
  );
}
