import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Trash2, Save, Check } from 'lucide-react';

interface ActionBarProps {
  canApprove: boolean;
  onApprove: () => Promise<void>;
  onReject: (notes?: string) => Promise<void>;
  onSave: () => Promise<void>;
}

export const ActionBar = ({ canApprove, onApprove, onReject, onSave }: ActionBarProps) => {
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    try {
      await onApprove();
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      await onReject(rejectNotes);
      setShowRejectDialog(false);
      setRejectNotes('');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="sticky bottom-0 border-t border-border bg-card/95 p-3 sm:p-4 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex flex-col gap-2 sm:gap-3 sm:flex-row sm:items-center sm:justify-between px-2 sm:px-4">
          <Button
            variant="destructive"
            size="lg"
            onClick={() => setShowRejectDialog(true)}
            disabled={loading}
            className="sm:w-auto w-full h-10 sm:h-11"
          >
            {loading ? <Loader2 className="mr-1.5 sm:mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1.5 sm:mr-2 h-4 w-4" />}
            <span className="text-sm sm:text-base">Rejeitar</span>
          </Button>

          <div className="flex gap-2 sm:gap-3 flex-1 sm:flex-initial sm:justify-center">
            <Button
              variant="outline"
              size="lg"
              onClick={handleSave}
              disabled={loading}
              className="flex-1 sm:flex-initial h-10 sm:h-11"
            >
              {loading ? <Loader2 className="mr-1.5 sm:mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 sm:mr-2 h-4 w-4" />}
              <span className="text-sm sm:text-base">Guardar</span>
            </Button>
          </div>

          <Button
            size="lg"
            onClick={handleApprove}
            disabled={!canApprove || loading}
            className="sm:w-auto w-full bg-success hover:bg-success/90 h-10 sm:h-11"
          >
            {loading ? <Loader2 className="mr-1.5 sm:mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 sm:mr-2 h-4 w-4" />}
            <span className="text-sm sm:text-base">Aprovar</span>
          </Button>
        </div>
      </div>

      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeitar esta publicação?</AlertDialogTitle>
            <AlertDialogDescription>
              Isto marcará a publicação como rejeitada. Pode adicionar notas opcionais explicando o motivo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="reject-notes" className="mb-2 block">
              Notas de rejeição (opcional)
            </Label>
            <Textarea
              id="reject-notes"
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              placeholder="Porquê esta publicação está a ser rejeitada?"
              className="min-h-[100px]"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              className="bg-destructive hover:bg-destructive/90"
            >
              Rejeitar Publicação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
