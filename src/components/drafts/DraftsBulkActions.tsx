import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface DraftsBulkActionsProps {
  totalCount: number;
  selectedCount: number;
  allSelected: boolean;
  onSelectAll: (selected: boolean) => void;
  onDeleteSelected: () => void;
  isDeleting: boolean;
}

export function DraftsBulkActions({
  totalCount,
  selectedCount,
  allSelected,
  onSelectAll,
  onDeleteSelected,
  isDeleting,
}: DraftsBulkActionsProps) {
  return (
    <div className="flex items-center justify-between py-3 px-4 bg-muted/50 rounded-lg">
      <div className="flex items-center gap-3">
        <Checkbox
          checked={allSelected}
          onCheckedChange={(checked) => onSelectAll(!!checked)}
          aria-label="Selecionar todos"
        />
        <span className="text-sm text-muted-foreground">
          {selectedCount > 0 ? (
            <>
              <span className="font-medium text-foreground">{selectedCount}</span> de {totalCount} selecionados
            </>
          ) : (
            <>Selecionar todos ({totalCount})</>
          )}
        </span>
      </div>

      {selectedCount > 0 && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              size="sm"
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar ({selectedCount})
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar rascunhos</AlertDialogTitle>
              <AlertDialogDescription>
                Tens a certeza que queres eliminar {selectedCount} rascunho{selectedCount > 1 ? 's' : ''}? 
                Esta ação não pode ser revertida.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={onDeleteSelected}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? 'A eliminar...' : 'Eliminar'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
