import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  const statusColors = {
    pending: 'bg-warning text-warning-foreground',
    approved: 'bg-success text-success-foreground',
    rejected: 'bg-destructive text-destructive-foreground',
  };

  const statusLabels = {
    pending: 'Pendente',
    approved: 'Aprovado',
    rejected: 'Rejeitado',
  };

  return (
    <Card 
      className={cn(
        "group cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] duration-200"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 sm:p-5">
        {/* Status Badge */}
        <div className="mb-2 sm:mb-3 flex items-center gap-2">
          <Badge 
            className={cn(
              "text-[10px] sm:text-xs px-1.5 sm:px-2",
              statusColors[story.status as keyof typeof statusColors] || statusColors.pending
            )}
          >
            {statusLabels[story.status as keyof typeof statusLabels] || statusLabels.pending}
          </Badge>
        </div>

        {/* Story Image - Responsive sizing */}
        <div className="relative aspect-[9/16] bg-muted rounded-lg overflow-hidden mb-3 sm:mb-4 mx-auto max-w-[90%] sm:max-w-[70%] md:max-w-[60%]">
          <img
            src={story.story_image_url}
            alt={story.tema || 'Story'}
            className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-110"
          />
        </div>

        {/* Caption */}
        {story.caption && (
          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3 mb-3">
            {story.caption}
          </p>
        )}

        {/* Footer with time and Review button */}
        <div className="flex items-center justify-between text-xs sm:text-sm pt-2 border-t border-border">
          <div className="flex flex-col gap-0.5">
            <span className="text-muted-foreground text-[10px] sm:text-xs">
              {formatDistanceToNow(new Date(story.created_at), { addSuffix: true, locale: pt })}
            </span>
            <span className="text-muted-foreground text-[10px]">
              {new Date(story.created_at).toLocaleDateString('pt-PT', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {onDelete && (
              <div onClick={(e) => e.stopPropagation()}>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 sm:h-8 sm:w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-1 sm:gap-1.5 -mr-2 h-8 px-2 sm:px-3 text-xs sm:text-sm group-hover:bg-primary/10 group-hover:text-primary transition-colors"
            >
              Rever
              <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
