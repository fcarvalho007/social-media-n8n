import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

type VideoToolResult =
  | { type: 'chapters'; items: Array<{ time: string; title: string }> }
  | { type: 'quotes'; items: Array<{ time: string; text: string }> };

interface VideoToolsReviewDialogProps {
  result: VideoToolResult | null;
  onOpenChange: (open: boolean) => void;
  onCopy: () => void;
}

export function VideoToolsReviewDialog({ result, onOpenChange, onCopy }: VideoToolsReviewDialogProps) {
  const open = Boolean(result);
  const isChapters = result?.type === 'chapters';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isChapters ? 'Capítulos gerados' : 'Frases citáveis extraídas'}</DialogTitle>
          <DialogDescription>
            Revê o resultado antes de copiar. Podes ajustar o texto depois de colar no destino final.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[50vh] pr-3">
          <div className="space-y-2">
            {result?.items.map((item, index) => (
              <div key={`${item.time}-${index}`} className="rounded-md border bg-muted/30 p-3 text-sm">
                <span className="font-mono text-xs text-muted-foreground">{item.time}</span>
                <p className="mt-1 text-foreground">{isChapters ? (item as { title: string }).title : (item as { text: string }).text}</p>
              </div>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button type="button" onClick={onCopy}>{isChapters ? 'Copiar capítulos' : 'Copiar frases'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}