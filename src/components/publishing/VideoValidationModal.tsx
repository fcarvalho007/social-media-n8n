import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, Maximize2, Film, Info } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface VideoValidationIssue {
  fileName: string;
  issue: string;
  suggestion: string;
  type: 'duration' | 'aspectRatio' | 'resolution' | 'size';
  severity: 'warning' | 'error';
}

interface VideoValidationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  issues: VideoValidationIssue[];
  onContinue: () => void;
  onCancel: () => void;
}

export function VideoValidationModal({
  open,
  onOpenChange,
  issues,
  onContinue,
  onCancel,
}: VideoValidationModalProps) {
  const hasErrors = issues.some(i => i.severity === 'error');
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const errorCount = issues.filter(i => i.severity === 'error').length;

  const getIssueIcon = (type: VideoValidationIssue['type']) => {
    switch (type) {
      case 'duration':
        return <Clock className="h-4 w-4" />;
      case 'aspectRatio':
        return <Maximize2 className="h-4 w-4" />;
      case 'resolution':
        return <Film className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Validação de Vídeos
          </DialogTitle>
          <DialogDescription>
            {hasErrors ? (
              <span className="text-red-600 dark:text-red-400">
                {errorCount} erro(s) detectado(s) que podem impedir a publicação.
              </span>
            ) : (
              <span>
                {warningCount} aviso(s) sobre os vídeos selecionados.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-60">
          <div className="space-y-3 pr-3">
            {issues.map((issue, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border ${
                  issue.severity === 'error'
                    ? 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800'
                    : 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800'
                }`}
              >
                <div className="flex items-start gap-2">
                  <div
                    className={`mt-0.5 ${
                      issue.severity === 'error'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {getIssueIcon(issue.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{issue.fileName}</p>
                    <p
                      className={`text-xs ${
                        issue.severity === 'error'
                          ? 'text-red-700 dark:text-red-300'
                          : 'text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      {issue.issue}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      💡 {issue.suggestion}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      issue.severity === 'error'
                        ? 'border-red-300 text-red-700 dark:border-red-700 dark:text-red-300'
                        : 'border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300'
                    }`}
                  >
                    {issue.severity === 'error' ? 'Erro' : 'Aviso'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="bg-muted/50 rounded-lg p-3 flex items-start gap-2">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
          <p className="text-xs text-muted-foreground">
            O Instagram pode demorar até 5 minutos a processar vídeos em carrosseis.
            Se o upload falhar, verifique os requisitos e tente novamente.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            onClick={onContinue}
            variant={hasErrors ? 'destructive' : 'default'}
          >
            {hasErrors ? 'Continuar mesmo assim' : 'Continuar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
