import { FirstCommentOption } from '@/types/aiEditorial';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const labels: Record<FirstCommentOption['approach'], string> = {
  pergunta: 'Pergunta',
  cta_link: 'CTA + Link',
  complemento: 'Complemento',
};

interface FirstCommentOptionsDialogProps {
  open: boolean;
  options: FirstCommentOption[];
  onOpenChange: (open: boolean) => void;
  onSelect: (text: string) => void;
}

export function FirstCommentOptionsDialog({ open, options, onOpenChange, onSelect }: FirstCommentOptionsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Escolher primeiro comentário</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          {options.map((option) => (
            <div key={option.approach} className="rounded-lg border bg-muted/20 p-3 space-y-3">
              <div className="text-sm font-medium">{labels[option.approach]}</div>
              <p className="text-sm leading-relaxed text-muted-foreground">“{option.text}”</p>
              <Button type="button" size="sm" onClick={() => onSelect(option.text)}>Usar esta</Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}