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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, AlertTriangle, XCircle, Instagram, Linkedin, Loader2 } from 'lucide-react';
import { IgPostMock } from './IgPostMock';
import { LiPostMock } from './LiPostMock';
import { cn } from '@/lib/utils';

interface PublishConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  publishTargets: { instagram: boolean; linkedin: boolean };
  validations: Record<string, any>;
  contentType: string;
  mediaCount: number;
  isPublishing: boolean;
  caption: string;
  linkedinBody?: string;
  activeImages: string[];
  useDifferentCaptions?: boolean;
  instagramCaption?: string;
}

export function PublishConfirmationModal({
  open,
  onOpenChange,
  onConfirm,
  publishTargets,
  validations,
  contentType,
  mediaCount,
  isPublishing,
  caption,
  linkedinBody,
  activeImages,
  useDifferentCaptions,
  instagramCaption,
}: PublishConfirmationModalProps) {
  const platforms = [];
  if (publishTargets.instagram) platforms.push('Instagram');
  if (publishTargets.linkedin) platforms.push('LinkedIn');

  const getValidationSummary = (platform: 'instagram' | 'linkedin') => {
    const validation = validations[platform];
    if (!validation) return null;

    const hasErrors = validation.errors?.length > 0;
    const hasWarnings = validation.warnings?.length > 0;

    if (hasErrors) {
      return (
        <div className="flex items-start gap-2">
          <XCircle className="h-4 w-4 text-destructive mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">Erros de validação</p>
            <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
              {validation.errors.map((error: any, idx: number) => (
                <li key={idx}>• {error.message}</li>
              ))}
            </ul>
          </div>
        </div>
      );
    }

    if (hasWarnings) {
      return (
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-600">Avisos</p>
            <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
              {validation.warnings.map((warning: any, idx: number) => (
                <li key={idx}>• {warning.message || warning.field || 'Aviso de validação'}</li>
              ))}
            </ul>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-success" />
        <p className="text-sm text-muted-foreground">Validação aprovada</p>
      </div>
    );
  };

  const hasBlockingErrors = Object.entries(validations).some(
    ([platform, v]) => publishTargets[platform as 'instagram' | 'linkedin'] && v?.errors?.length > 0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Confirmar Publicação</DialogTitle>
          <DialogDescription>
            Reveja os detalhes antes de publicar nas plataformas selecionadas
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Info & Validations */}
          <div className="space-y-4">
            {/* Platforms */}
            <div>
              <p className="text-sm font-medium mb-2">Destinos:</p>
              <div className="flex gap-2">
                {publishTargets.instagram && (
                  <Badge variant="secondary" className="flex items-center gap-1.5">
                    <Instagram className="h-3 w-3" />
                    Instagram
                  </Badge>
                )}
                {publishTargets.linkedin && (
                  <Badge variant="secondary" className="flex items-center gap-1.5">
                    <Linkedin className="h-3 w-3" />
                    LinkedIn
                  </Badge>
                )}
              </div>
            </div>

            {/* Content summary */}
            <div>
              <p className="text-sm font-medium mb-1">Tipo de conteúdo:</p>
              <p className="text-sm text-muted-foreground">
                {contentType === 'carousel' ? `Carrossel • ${mediaCount} imagens ativas` : contentType}
              </p>
            </div>

            {/* Validations */}
            <div className="space-y-3">
              <p className="text-sm font-medium">Resumo de validações:</p>
              {publishTargets.instagram && (
                <div className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Instagram className="h-4 w-4" />
                    <span className="text-sm font-medium">Instagram</span>
                  </div>
                  {getValidationSummary('instagram')}
                </div>
              )}
              {publishTargets.linkedin && (
                <div className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Linkedin className="h-4 w-4" />
                    <span className="text-sm font-medium">LinkedIn</span>
                  </div>
                  {getValidationSummary('linkedin')}
                </div>
              )}
            </div>

            {/* Warning about errors */}
            {hasBlockingErrors && (
              <Alert variant="destructive">
                <AlertDescription>
                  Corrija os erros de validação antes de publicar
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Right Column: Preview */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Pré-visualização:</p>
            
            <ScrollArea className="h-[480px] rounded-lg border bg-muted/30">
              <div className="p-4 space-y-4">
                {publishTargets.instagram && (
                  <div className="flex flex-col items-center">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Instagram</p>
                    <div className="scale-90 origin-top">
                      <IgPostMock
                        mediaCount={activeImages.length}
                        caption={useDifferentCaptions ? instagramCaption : caption}
                        images={activeImages}
                      />
                    </div>
                  </div>
                )}
                {publishTargets.linkedin && (
                  <div className="flex flex-col items-center">
                    <p className="text-xs font-medium text-muted-foreground mb-2">LinkedIn</p>
                    <div className="scale-90 origin-top">
                      <LiPostMock
                        mediaCount={activeImages.length}
                        caption={linkedinBody || caption}
                      />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPublishing}
          >
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            disabled={hasBlockingErrors || isPublishing}
            className="bg-success hover:bg-success/90"
          >
            {isPublishing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Publicando...
              </>
            ) : (
              'Confirmar publicação'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
