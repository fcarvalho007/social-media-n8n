import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getOptimizedImageUrl } from '@/lib/imageOptimization';
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
  const [imageLoading, setImageLoading] = useState(true);
  
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
        "group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] overflow-hidden rounded-2xl border-2 bg-card hover:bg-card-hover animate-fade-in"
      )}
      onClick={onClick}
    >
      <CardContent className="p-5">
        {/* Status Badge */}
        <div className="mb-3 flex items-center gap-2">
          <Badge 
            className={cn(
              "text-xs px-2.5 py-1 font-medium rounded-lg",
              statusColors[story.status as keyof typeof statusColors] || statusColors.pending
            )}
          >
            {statusLabels[story.status as keyof typeof statusLabels] || statusLabels.pending}
          </Badge>
        </div>

        {/* Story Image - Responsive sizing */}
        <div className="relative aspect-[9/16] bg-muted rounded-xl overflow-hidden mb-4 mx-auto max-w-[85%] shadow-lg">
          {imageLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          <img
            src={getOptimizedImageUrl(story.story_image_url, 600, 75)}
            alt={story.tema || 'Story'}
            className={cn(
              "w-full h-full object-contain transition-all duration-500 group-hover:scale-110 group-hover:brightness-110",
              imageLoading && "opacity-0"
            )}
            onLoad={() => setImageLoading(false)}
            onError={() => setImageLoading(false)}
          />
        </div>

        {/* Caption */}
        {story.caption && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3 font-medium">
            {story.caption}
          </p>
        )}

        {/* Footer with time and Review button */}
        <div className="flex items-center justify-between text-sm pt-3 border-t border-border/50">
          <div className="flex flex-col gap-0.5">
            <span className="text-muted-foreground text-xs font-medium">
              {formatDistanceToNow(new Date(story.created_at), { addSuffix: true, locale: pt })}
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
                      aria-label={`Eliminar story ${story.tema || story.caption}`}
                      title="Eliminar story"
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
              className="gap-1.5 -mr-2 h-9 px-3 text-sm font-medium group-hover:bg-primary group-hover:text-primary-foreground transition-all rounded-lg shadow-sm"
              aria-label={`Rever story ${story.tema || story.caption}`}
            >
              Rever
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
