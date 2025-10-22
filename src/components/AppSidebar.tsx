import { Home, CheckCircle2, PlusCircle } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      <SidebarContent className="pt-8">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <TooltipProvider delayDuration={0}>
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton asChild>
                          <NavLink
                            to={item.url}
                            className={({ isActive }) =>
                              cn(
                                'flex h-14 w-14 items-center justify-center rounded-xl transition-all duration-200',
                                'hover:bg-primary/10 hover:text-primary',
                                isActive
                                  ? 'bg-primary text-primary-foreground shadow-lg glow-primary'
                                  : 'text-muted-foreground'
                              )
                            }
                          >
                            <item.icon className="h-6 w-6" />
                          </NavLink>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="font-medium">
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
  );
}
