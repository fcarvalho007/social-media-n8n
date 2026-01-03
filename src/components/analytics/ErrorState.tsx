import { memo } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState = memo(function ErrorState({
  title = "Erro ao carregar dados",
  message = "Ocorreu um erro ao carregar os dados. Tente novamente.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <Card 
      className={cn("border-destructive/50", className)}
      role="alert"
      aria-live="polite"
    >
      <CardContent className="flex flex-col items-center py-12 text-center">
        <div 
          className="p-3 rounded-full bg-destructive/10 mb-4"
          aria-hidden="true"
        >
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="font-semibold text-lg mb-2">{title}</h3>
        <p className="text-muted-foreground text-sm mb-6 max-w-md">
          {message}
        </p>
        {onRetry && (
          <Button 
            onClick={onRetry} 
            variant="outline" 
            className="gap-2"
            aria-label="Tentar carregar dados novamente"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Tentar novamente
          </Button>
        )}
      </CardContent>
    </Card>
  );
});
