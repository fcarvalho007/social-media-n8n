import { Home, CheckCircle2, PlusCircle, Menu, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useState } from 'react';
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
];

export function AppSidebar() {
  const { open, setOpen } = useSidebar();

  return (
    <>
      {/* Mobile Overlay */}
      {open && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={() => setOpen(false)}
        />
      )}
      
      <Sidebar className={cn(
        "border-r border-sidebar-border bg-sidebar/95 backdrop-blur-md z-50 transition-all duration-300",
        "lg:relative fixed inset-y-0 left-0",
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Mobile Close Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 lg:hidden z-10 h-10 w-10 rounded-xl"
          onClick={() => setOpen(false)}
        >
          <X className="h-5 w-5" />
        </Button>

        <SidebarContent className="pt-20 lg:pt-8">
          {/* Logo/Brand */}
          <div className="px-6 pb-8 hidden lg:block">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center shadow-lg glow-primary">
              <span className="text-primary-foreground font-bold text-xl">N</span>
            </div>
          </div>

          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-2">
                <TooltipProvider delayDuration={0}>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton asChild>
                            <NavLink
                              to={item.url}
                              onClick={() => setOpen(false)}
                              className={({ isActive }) =>
                                cn(
                                  'flex h-14 w-14 items-center justify-center rounded-xl transition-all duration-300 mx-auto',
                                  'hover:bg-primary/10 hover:text-primary hover:scale-110',
                                  'active:scale-95',
                                  isActive
                                    ? 'bg-primary text-primary-foreground shadow-xl glow-primary scale-105'
                                    : 'text-muted-foreground hover:shadow-lg'
                                )
                              }
                            >
                              <item.icon className="h-6 w-6" strokeWidth={2.5} />
                            </NavLink>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="font-semibold text-sm">
                          {item.title}
                        </TooltipContent>
                      </Tooltip>
                    </SidebarMenuItem>
                  ))}
                </TooltipProvider>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </>
  );
}
