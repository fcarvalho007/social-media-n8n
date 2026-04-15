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
import { AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';

interface DuplicateInfo {
  id: string;
  created_at: string;
  selected_networks: string[] | null;
  status: string | null;
}

interface DuplicateWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  duplicate: DuplicateInfo;
  onConfirm: () => void;
}

const networkLabels: Record<string, string> = {
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  googlebusiness: 'Google Business',
};

export function DuplicateWarningDialog({ open, onOpenChange, duplicate, onConfirm }: DuplicateWarningDialogProps) {
  const timeAgo = formatDistanceToNow(new Date(duplicate.created_at), { addSuffix: true, locale: pt });
  const networks = (duplicate.selected_networks || []).map(n => networkLabels[n] || n).join(', ') || 'redes sociais';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Conteúdo possivelmente duplicado
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Este conteúdo foi publicado <strong>{timeAgo}</strong> em <strong>{networks}</strong>.
            </p>
            <p>
              Publicar novamente irá criar uma publicação duplicada em todas as redes selecionadas.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-amber-600 hover:bg-amber-700"
          >
            Publicar mesmo assim
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
