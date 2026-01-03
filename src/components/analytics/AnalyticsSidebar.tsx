import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LayoutDashboard,
  User,
  PieChart,
  TrendingUp,
  Trophy,
  Clock,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

interface AnalyticsSidebarProps {
  className?: string;
}

const sections = [
  { id: "dashboard-header", label: "Dashboard", icon: LayoutDashboard },
  { id: "kpi-cards", label: "KPIs", icon: TrendingUp },
  { id: "profile-overview", label: "Perfil", icon: User },
  { id: "content-analysis", label: "Conteúdo", icon: PieChart },
  { id: "engagement-chart", label: "Performance", icon: TrendingUp },
  { id: "top-posts", label: "Top Posts", icon: Trophy },
  { id: "best-times", label: "Horários", icon: Clock },
  { id: "caption-analysis", label: "Captions", icon: FileText },
];

export function AnalyticsSidebar({ className }: AnalyticsSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("dashboard-header");

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveSection(sectionId);
    }
  };

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col h-[calc(100vh-4rem)] sticky top-16 transition-all duration-300",
        // Dark sidebar styling
        "bg-sidebar text-sidebar-foreground border-r border-sidebar-border",
        isCollapsed ? "w-14" : "w-52",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-sidebar-border">
        {!isCollapsed && (
          <span className="text-sm font-semibold text-white">Navegação</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 ml-auto text-white/70 hover:text-white hover:bg-sidebar-muted"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation items */}
      <ScrollArea className="flex-1 py-3">
        <nav className="flex flex-col gap-1 px-2">
          {sections.map((section) => {
            const isActive = activeSection === section.id;
            
            return (
              <Button
                key={section.id}
                variant="ghost"
                size="sm"
                className={cn(
                  "justify-start gap-3 transition-all duration-200 rounded-lg",
                  "text-white/80 font-medium hover:text-white",
                  isCollapsed ? "px-2 justify-center" : "px-3",
                  isActive 
                    ? "bg-sidebar-accent/20 text-white font-bold border-l-2 border-sidebar-accent" 
                    : "hover:bg-sidebar-muted"
                )}
                onClick={() => scrollToSection(section.id)}
              >
                <section.icon 
                  className={cn(
                    "h-4 w-4 flex-shrink-0 transition-colors",
                    isActive ? "text-sidebar-accent" : "text-white/80"
                  )} 
                />
                {!isCollapsed && (
                  <span className={cn(
                    "truncate text-sm",
                    isActive ? "text-white font-bold" : "text-white/80 font-medium"
                  )}>
                    {section.label}
                  </span>
                )}
              </Button>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer - mini branding */}
      {!isCollapsed && (
        <div className="p-3 border-t border-sidebar-border">
          <p className="text-xs text-white/60 text-center">
            Analytics v2.0
          </p>
        </div>
      )}
    </aside>
  );
}
