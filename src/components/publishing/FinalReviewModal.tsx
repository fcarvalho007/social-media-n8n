import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, RefreshCw, FileText, Eye } from 'lucide-react';
import { useState } from 'react';

interface FinalReviewModalProps {
  open: boolean;
  onBack: () => void;
  onRegenerate: () => void;
  onConfirm: () => void;
  pdfMetadata: {
    pages: number;
    sizeMB: number;
    title: string;
  };
  pdfUrl: string;
  pageAlts?: string[];
}

export function FinalReviewModal({
  open,
  onBack,
  onRegenerate,
  onConfirm,
  pdfMetadata,
  pdfUrl,
  pageAlts = [],
}: FinalReviewModalProps) {
  const [selectedPreview] = useState<number | null>(null);

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onBack()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Revisão Final — Documento (PDF) para LinkedIn
            </DialogTitle>
            <DialogDescription>
              Confirma os detalhes antes de publicar o carrossel como documento no LinkedIn.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Metadata */}
            <div className="rounded-xl border bg-muted/30 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Título:</span>
                <span className="text-sm text-muted-foreground">{pdfMetadata.title}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Páginas:</span>
                <Badge variant="outline">{pdfMetadata.pages}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Tamanho:</span>
                <Badge variant="outline">{pdfMetadata.sizeMB.toFixed(2)} MB</Badge>
              </div>
            </div>

            {/* Info */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm">
              <p className="text-foreground/90">
                O carrossel no LinkedIn será publicado como <strong>Documento (PDF)</strong>.
                <br />
                <span className="text-xs text-muted-foreground">PDF gerado no servidor para evitar problemas de CORS</span>
              </p>
            </div>

            {/* Preview PDF from server */}
            <div>
              <label className="text-sm font-medium mb-2 block">Pré-visualização (PDF do servidor):</label>
              <div className="rounded-lg border overflow-hidden">
                <object data={pdfUrl} type="application/pdf" className="w-full h-[480px]">
                  <div className="p-3 text-sm">
                    Não foi possível incorporar o PDF. <a href={pdfUrl} target="_blank" rel="noreferrer" className="underline">Abrir numa nova aba</a>.
                  </div>
                </object>
              </div>
            </div>

            {/* Alt texts preview (optional) */}
            {pageAlts.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Textos alternativos (primeiros 3):
                </label>
                <ScrollArea className="h-24 rounded-lg border bg-muted/30 p-3">
                  <div className="space-y-1.5">
                    {pageAlts.slice(0, 3).map((alt, idx) => (
                      <div key={idx} className="text-sm">
                        <span className="font-medium text-muted-foreground">Pág. {idx + 1}:</span>{' '}
                        <span className="text-foreground/80">{alt}</span>
                      </div>
                    ))}
                    {pageAlts.length > 3 && (
                      <div className="text-xs text-muted-foreground italic pt-1">
                        + {pageAlts.length - 3} mais...
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3 pt-4 border-t">
            <Button
              variant="ghost"
              onClick={onBack}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onRegenerate}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Regenerar PDF
              </Button>
              <Button onClick={onConfirm} className="gap-2">
                Confirmar e Publicar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Removed enlarged preview since we no longer render image thumbnails */}
      {selectedPreview !== null && null}
    </>
  );
}
