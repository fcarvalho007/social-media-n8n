import { useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2, CheckCircle } from 'lucide-react';
import { OversizedImage } from '@/lib/canvas/imageCompression';
import { cn } from '@/lib/utils';

interface ImageCompressionConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  oversizedImages: OversizedImage[];
  isCompressing?: boolean;
  compressionProgress?: { current: number; total: number; fileName: string };
}

export function ImageCompressionConfirmModal({
  open,
  onClose,
  onConfirm,
  oversizedImages,
  isCompressing = false,
  compressionProgress
}: ImageCompressionConfirmModalProps) {
  // Cleanup preview URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      oversizedImages.forEach(img => {
        if (img.previewUrl) {
          URL.revokeObjectURL(img.previewUrl);
        }
      });
    };
  }, [oversizedImages]);

  return (
    <Dialog open={open} onOpenChange={(open) => !open && !isCompressing && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            Imagens Excedem Limite de 4MB
          </DialogTitle>
          <DialogDescription>
            O Instagram tem um limite de 4MB por imagem. As seguintes imagens precisam de ser comprimidas:
          </DialogDescription>
        </DialogHeader>

        <div className="my-4 space-y-2">
          <div className="rounded-lg border bg-muted/30 divide-y max-h-[300px] overflow-y-auto">
            {oversizedImages.map((img, idx) => {
              const isCurrentlyCompressing = isCompressing && compressionProgress?.fileName === img.name;
              const isCompleted = isCompressing && compressionProgress && 
                oversizedImages.findIndex(i => i.name === compressionProgress.fileName) > idx;
              
              return (
                <div 
                  key={idx} 
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 transition-colors",
                    isCurrentlyCompressing && "bg-primary/5",
                    isCompleted && "bg-green-500/5"
                  )}
                >
                  {/* Thumbnail Preview */}
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border bg-muted">
                    {img.previewUrl ? (
                      <img 
                        src={img.previewUrl} 
                        alt={`Imagem ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                        ?
                      </div>
                    )}
                    
                    {/* Overlay for status */}
                    {(isCurrentlyCompressing || isCompleted) && (
                      <div className={cn(
                        "absolute inset-0 flex items-center justify-center",
                        isCompleted ? "bg-green-500/30" : "bg-primary/30"
                      )}>
                        {isCompleted ? (
                          <CheckCircle className="h-6 w-6 text-white drop-shadow-md" />
                        ) : (
                          <Loader2 className="h-6 w-6 text-white animate-spin drop-shadow-md" />
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm">
                        Imagem {idx + 1}
                      </span>
                      <span className={cn(
                        "font-mono text-xs px-2 py-0.5 rounded flex-shrink-0",
                        "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      )}>
                        {img.sizeMB} MB
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {isCompleted ? (
                        <span className="text-green-600 dark:text-green-400">Comprimida com sucesso</span>
                      ) : isCurrentlyCompressing ? (
                        <span className="text-primary">A comprimir...</span>
                      ) : (
                        `Excede o limite em ${(img.sizeMB - 4).toFixed(1)} MB`
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          
          {!isCompressing && (
            <p className="text-xs text-muted-foreground">
              A compressão reduz ligeiramente a qualidade mantendo uma resolução adequada para redes sociais.
            </p>
          )}
          
          {isCompressing && compressionProgress && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>
                A comprimir {compressionProgress.current} de {compressionProgress.total}...
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isCompressing}
          >
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isCompressing}
            className="gap-2"
          >
            {isCompressing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                A comprimir...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Comprimir e Continuar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
