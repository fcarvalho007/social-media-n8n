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

interface ModeChangeConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveAndChange: () => void;
  onChangeWithoutSaving: () => void;
}

export const ModeChangeConfirmDialog = ({
  open,
  onOpenChange,
  onSaveAndChange,
  onChangeWithoutSaving,
}: ModeChangeConfirmDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Guardar rascunho antes de mudar de modo?</AlertDialogTitle>
          <AlertDialogDescription>
            Tem alterações não guardadas. Deseja guardar este rascunho antes de mudar de modo de criação?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel className="sm:order-3">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onChangeWithoutSaving}
            className="sm:order-2 bg-background hover:bg-accent text-foreground border border-border"
          >
            Mudar sem guardar
          </AlertDialogAction>
          <AlertDialogAction
            onClick={onSaveAndChange}
            className="sm:order-1"
          >
            Guardar e mudar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
