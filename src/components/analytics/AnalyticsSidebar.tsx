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
        "hidden lg:flex flex-col h-[calc(100vh-4rem)] sticky top-16 border-r bg-card/50 backdrop-blur-sm transition-all duration-300",
        isCollapsed ? "w-14" : "w-52",
        className
      )}
    >
      <div className="flex items-center justify-between p-3 border-b">
        {!isCollapsed && (
          <span className="text-sm font-medium text-muted-foreground">Navegação</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 ml-auto"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      <ScrollArea className="flex-1 py-2">
        <nav className="flex flex-col gap-1 px-2">
          {sections.map((section) => {
            const isActive = activeSection === section.id;
            
            return (
              <Button
                key={section.id}
                variant={isActive ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                  "justify-start gap-3 transition-all",
                  isCollapsed ? "px-2" : "px-3",
                  isActive && "bg-primary/10 text-primary"
                )}
                onClick={() => scrollToSection(section.id)}
              >
                <section.icon className={cn("h-4 w-4 flex-shrink-0", isActive && "text-primary")} />
                {!isCollapsed && (
                  <span className="truncate">{section.label}</span>
                )}
              </Button>
            );
          })}
        </nav>
      </ScrollArea>
    </aside>
  );
}
