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
import { AlertTriangle, Clock, Copy, Instagram, Linkedin, Youtube, Facebook, Monitor, Globe } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';

interface DuplicateInfo {
  id: string;
  created_at: string;
  selected_networks: string[] | null;
  status: string | null;
  caption?: string;
}

interface DuplicateWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  duplicate: DuplicateInfo;
  onConfirm: () => void;
  caption?: string;
}

const networkConfig: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  instagram: { label: 'Instagram', icon: Instagram },
  linkedin: { label: 'LinkedIn', icon: Linkedin },
  youtube: { label: 'YouTube', icon: Youtube },
  facebook: { label: 'Facebook', icon: Facebook },
  tiktok: { label: 'TikTok', icon: Monitor },
  googlebusiness: { label: 'Google Business', icon: Globe },
};

export function DuplicateWarningDialog({ open, onOpenChange, duplicate, onConfirm, caption }: DuplicateWarningDialogProps) {
  const timeAgo = formatDistanceToNow(new Date(duplicate.created_at), { addSuffix: true, locale: pt });
  const networks = duplicate.selected_networks || [];
  const isStillPublishing = duplicate.status === 'publishing';
  
  const displayCaption = caption || duplicate.caption || '';
  const truncatedCaption = displayCaption.length > 80 
    ? displayCaption.substring(0, 80) + '…' 
    : displayCaption;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/40">
              <AlertTriangle className="h-4 w-4" />
            </div>
            {isStillPublishing 
              ? 'Conteúdo em publicação' 
              : 'Conteúdo possivelmente duplicado'}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 pt-1">
              {/* Info card */}
              <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3 space-y-2">
                {truncatedCaption && (
                  <div className="flex items-start gap-2">
                    <Copy className="h-3.5 w-3.5 mt-0.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <p className="text-xs text-amber-800 dark:text-amber-300 italic line-clamp-2">
                      "{truncatedCaption}"
                    </p>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    {isStillPublishing 
                      ? `Em publicação desde ${timeAgo}` 
                      : `Publicado ${timeAgo}`}
                  </p>
                </div>
                {networks.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {networks.map(n => {
                      const config = networkConfig[n];
                      if (!config) return null;
                      const Icon = config.icon;
                      return (
                        <span key={n} className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded">
                          <Icon className="h-3 w-3" />
                          {config.label}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              <p className="text-sm text-muted-foreground">
                {isStillPublishing 
                  ? 'Este conteúdo está a ser publicado neste momento. Publicar novamente pode criar duplicados.'
                  : 'Publicar novamente irá criar uma publicação duplicada em todas as redes selecionadas.'}
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel className="flex-1">Não publicar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
          >
            Publicar mesmo assim
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
