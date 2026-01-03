import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ 
  icon, 
  title, 
  description, 
  action,
  className 
}: EmptyStateProps) {
  return (
    <div 
      className={cn(
        "flex flex-col items-center justify-center py-16 px-6 text-center",
        className
      )}
    >
      <div className="p-4 rounded-2xl bg-muted/50 mb-5 animate-fade-in">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2 animate-fade-in" style={{ animationDelay: "100ms" }}>
        {title}
      </h3>
      <p className="text-muted-foreground text-sm max-w-sm mb-5 animate-fade-in" style={{ animationDelay: "200ms" }}>
        {description}
      </p>
      {action && (
        <Button 
          onClick={action.onClick}
          className="animate-fade-in"
          style={{ animationDelay: "300ms" }}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}

// Pre-built empty states for common scenarios
export function NoDataEmptyState({ onImport }: { onImport?: () => void }) {
  return (
    <EmptyState
      icon={
        <svg 
          className="h-12 w-12 text-muted-foreground" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={1.5}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" 
          />
        </svg>
      }
      title="Sem dados de analytics"
      description="Importe os seus dados do Instagram para começar a ver insights e métricas detalhadas."
      action={onImport ? { label: "Importar Dados", onClick: onImport } : undefined}
    />
  );
}

export function NoPostsEmptyState() {
  return (
    <EmptyState
      icon={
        <svg 
          className="h-12 w-12 text-muted-foreground" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
          />
        </svg>
      }
      title="Nenhum post encontrado"
      description="Não encontrámos posts com os filtros seleccionados. Tente ajustar os critérios de pesquisa."
    />
  );
}

export function NoHashtagsEmptyState() {
  return (
    <EmptyState
      icon={
        <svg 
          className="h-10 w-10 text-muted-foreground" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={1.5}
            d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" 
          />
        </svg>
      }
      title="Sem hashtags"
      description="Não foram encontradas hashtags nos posts analisados."
    />
  );
}
