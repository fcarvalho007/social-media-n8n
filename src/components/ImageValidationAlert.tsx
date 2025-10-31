/**
 * Alert inline para mostrar problemas de validação de imagens
 * Substituição dos toasts automáticos por UI mais discreta
 */

import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangle, X, Info } from 'lucide-react';
import { ImageValidationResult } from '@/lib/imageValidation';

interface ImageValidationAlertProps {
  corsIssues: number;
  otherErrors: number;
  total: number;
  validations: ImageValidationResult[];
  onDismiss?: () => void;
}

export function ImageValidationAlert({
  corsIssues,
  otherErrors,
  total,
  validations,
  onDismiss,
}: ImageValidationAlertProps) {
  const [showDetails, setShowDetails] = useState(false);
  const problemCount = corsIssues + otherErrors;

  if (problemCount === 0) return null;

  return (
    <>
      <Alert variant="destructive" className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className="flex items-center justify-between">
          <span>
            ⚠️ {problemCount} de {total} imagens podem ter problemas
          </span>
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </AlertTitle>
        <AlertDescription className="mt-2">
          {corsIssues > 0 && (
            <p className="mb-2">
              🚫 <strong>{corsIssues} imagem(ns)</strong> bloqueada(s) por CORS - podem falhar na exportação/publicação
            </p>
          )}
          {otherErrors > 0 && (
            <p className="mb-2">
              ❌ <strong>{otherErrors} imagem(ns)</strong> podem estar inacessíveis
            </p>
          )}
          <div className="flex gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetails(true)}
            >
              <Info className="h-3 w-3 mr-1" />
              Ver detalhes
            </Button>
          </div>
        </AlertDescription>
      </Alert>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Validação de Imagens</DialogTitle>
            <DialogDescription>
              Estado de cada imagem no template selecionado
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {validations.map((validation, index) => (
              <div
                key={index}
                className="border rounded-lg p-3 flex items-start gap-3"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {validation.accessible ? (
                      <span className="text-sm text-green-600 dark:text-green-400">
                        ✅ Acessível
                      </span>
                    ) : validation.hasCorsIssue ? (
                      <span className="text-sm text-orange-600 dark:text-orange-400">
                        🚫 CORS
                      </span>
                    ) : (
                      <span className="text-sm text-red-600 dark:text-red-400">
                        ❌ Erro
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      Imagem {index + 1}
                    </span>
                  </div>
                  {validation.errorMessage && (
                    <p className="text-xs text-muted-foreground">
                      {validation.errorMessage}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
