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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Confirmar Publicação
            </DialogTitle>
            <DialogDescription>
              O carrossel será publicado como documento PDF no LinkedIn.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {/* Metadata */}
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Título:</span>
                <span className="text-muted-foreground truncate ml-2">{pdfMetadata.title}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Páginas:</span>
                <Badge variant="outline" className="text-xs">{pdfMetadata.pages}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Tamanho:</span>
                <Badge variant="outline" className="text-xs">{pdfMetadata.sizeMB.toFixed(2)} MB</Badge>
              </div>
            </div>

            {/* Info */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
              <p className="text-foreground/90">
                PDF gerado automaticamente no servidor.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t">
            <Button
              variant="ghost"
              onClick={onBack}
              size="sm"
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onRegenerate}
                size="sm"
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Regenerar
              </Button>
              <Button onClick={onConfirm} size="sm">
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
