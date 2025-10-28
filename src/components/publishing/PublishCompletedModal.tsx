import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, ExternalLink, Calendar, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PublishResult {
  success: boolean;
  url?: string;
  error?: string;
}

interface PublishCompletedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  results: {
    instagram?: PublishResult;
    linkedin?: PublishResult;
  };
  onNavigateToPending: () => void;
  onNavigateToDashboard: () => void;
}

export function PublishCompletedModal({
  open,
  onOpenChange,
  results,
  onNavigateToPending,
  onNavigateToDashboard,
}: PublishCompletedModalProps) {
  const hasAnySuccess = results.instagram?.success || results.linkedin?.success;
  const allFailed = !hasAnySuccess;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl">
            {hasAnySuccess ? (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-600 animate-in zoom-in duration-300">
                  <CheckCircle2 className="h-7 w-7 text-white" />
                </div>
                <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  Publicação Concluída!
                </span>
              </>
            ) : (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-rose-600">
                  <XCircle className="h-7 w-7 text-white" />
                </div>
                <span>Erro na Publicação</span>
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Results Summary */}
          <div className="space-y-3">
            {results.instagram && (
              <div className={cn(
                "flex items-center gap-3 rounded-lg border-2 p-4 transition-all",
                results.instagram.success 
                  ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30" 
                  : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
              )}>
                {results.instagram.success ? (
                  <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-500 flex-shrink-0" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-600 dark:text-red-500 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">Instagram</p>
                  {results.instagram.success ? (
                    results.instagram.url ? (
                      <a 
                        href={results.instagram.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                      >
                        Ver publicação <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-1">Publicado com sucesso</p>
                    )
                  ) : (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      {results.instagram.error || 'Erro desconhecido'}
                    </p>
                  )}
                </div>
              </div>
            )}

            {results.linkedin && (
              <div className={cn(
                "flex items-center gap-3 rounded-lg border-2 p-4 transition-all",
                results.linkedin.success 
                  ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30" 
                  : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
              )}>
                {results.linkedin.success ? (
                  <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-500 flex-shrink-0" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-600 dark:text-red-500 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">LinkedIn</p>
                  {results.linkedin.success ? (
                    results.linkedin.url ? (
                      <a 
                        href={results.linkedin.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                      >
                        Ver publicação <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-1">Publicado com sucesso</p>
                    )
                  ) : (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      {results.linkedin.error || 'Erro desconhecido'}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          {hasAnySuccess && (
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                onClick={onNavigateToPending}
                className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
                size="lg"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Ver Publicações Pendentes
              </Button>
              <Button
                onClick={onNavigateToDashboard}
                variant="outline"
                className="flex-1 border-2"
                size="lg"
              >
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Voltar ao Dashboard
              </Button>
            </div>
          )}

          {allFailed && (
            <div className="flex justify-end pt-4">
              <Button
                onClick={() => onOpenChange(false)}
                variant="outline"
                className="border-2"
              >
                Fechar
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
