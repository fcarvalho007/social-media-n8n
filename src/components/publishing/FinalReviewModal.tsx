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
  pageAlts: string[];
  previewImages: string[];
}

export function FinalReviewModal({
  open,
  onBack,
  onRegenerate,
  onConfirm,
  pdfMetadata,
  pageAlts,
  previewImages,
}: FinalReviewModalProps) {
  const [selectedPreview, setSelectedPreview] = useState<number | null>(null);

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

            {/* Preview thumbnails */}
            <div>
              <label className="text-sm font-medium mb-2 block">Pré-visualização:</label>
              <div className="grid grid-cols-3 gap-3">
                {previewImages.slice(0, 3).map((imgUrl, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedPreview(idx)}
                    className="relative aspect-square rounded-lg overflow-hidden border-2 border-border hover:border-primary transition-all group"
                  >
                    <img
                      src={imgUrl}
                      alt={`Página ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Eye className="h-5 w-5 text-white" />
                    </div>
                    <Badge className="absolute bottom-2 right-2 text-xs">
                      {idx + 1}/{pdfMetadata.pages}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>

            {/* Alt texts preview */}
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

      {/* Enlarged preview dialog */}
      {selectedPreview !== null && (
        <Dialog open={true} onOpenChange={() => setSelectedPreview(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Página {selectedPreview + 1} de {pdfMetadata.pages}</DialogTitle>
            </DialogHeader>
            <div className="relative w-full aspect-square">
              <img
                src={previewImages[selectedPreview]}
                alt={`Página ${selectedPreview + 1}`}
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
