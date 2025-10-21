import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, Clock, CheckCircle2, XCircle } from 'lucide-react';
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

interface StoryCardProps {
  story: any;
  onClick: () => void;
  onDelete: (id: string) => void;
}

export const StoryCard = ({ story, onClick, onDelete }: StoryCardProps) => {
  const statusConfig = {
    pending: { icon: Clock, label: 'Pendente', variant: 'default' as const },
    approved: { icon: CheckCircle2, label: 'Aprovado', variant: 'default' as const },
    rejected: { icon: XCircle, label: 'Rejeitado', variant: 'destructive' as const },
  };

  const status = statusConfig[story.status as keyof typeof statusConfig] || statusConfig.pending;
  const StatusIcon = status.icon;

  return (
    <Card 
      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
      onClick={onClick}
    >
      <div className="relative aspect-[9/16] bg-muted">
        <img
          src={story.story_image_url}
          alt={story.tema || 'Story'}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-2 right-2 z-10" onClick={(e) => e.stopPropagation()}>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser revertida. O story será permanentemente eliminado.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(story.id)}>
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-sm sm:text-base line-clamp-2">
            {story.tema || 'Story sem título'}
          </h3>
          <Badge variant={status.variant} className="flex items-center gap-1 text-xs shrink-0">
            <StatusIcon className="h-3 w-3" />
            {status.label}
          </Badge>
        </div>
        
        {story.titulo_slide && (
          <p className="text-xs sm:text-sm text-muted-foreground mb-2 line-clamp-2">
            {story.titulo_slide}
          </p>
        )}

        {story.caption && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {story.caption}
          </p>
        )}
        
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
          <span>{new Date(story.created_at).toLocaleDateString('pt-PT')}</span>
          <Badge variant="outline" className="text-xs">Story</Badge>
        </div>
      </CardContent>
    </Card>
  );
};
