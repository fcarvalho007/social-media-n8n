import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CaptionRewriteTone } from '@/types/aiEditorial';
import { captionRewriteToneLabels } from './CaptionRewritePanel';

interface CaptionRewritePreviewDialogProps {
  open: boolean;
  originalText: string;
  rewrittenText: string;
  tone: CaptionRewriteTone;
  onRewrittenTextChange: (value: string) => void;
  onApply: () => void;
  onKeepOriginal: () => void;
}

export function CaptionRewritePreviewDialog({
  open,
  originalText,
  rewrittenText,
  tone,
  onRewrittenTextChange,
  onApply,
  onKeepOriginal,
}: CaptionRewritePreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onKeepOriginal(); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Pré-visualizar reescrita</DialogTitle>
          <DialogDescription>
            Tom: {captionRewriteToneLabels[tone]}. Revê a proposta antes de substituir a legenda.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Original</p>
            <Textarea value={originalText} readOnly className="min-h-[260px] resize-none bg-muted/40" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Nova versão</p>
            <Textarea value={rewrittenText} onChange={(event) => onRewrittenTextChange(event.target.value)} className="min-h-[260px] resize-none" />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onKeepOriginal}>Manter original</Button>
          <Button type="button" onClick={onApply} disabled={!rewrittenText.trim()}>Aplicar versão</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}