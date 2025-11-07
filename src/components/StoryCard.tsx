import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getOptimizedImageUrl } from '@/lib/imageOptimization';

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
        "group cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] overflow-hidden rounded-2xl border-2 border-border bg-card hover:bg-accent/5 animate-fade-in"
      )}
      onClick={onClick}
    >
      <CardContent className="p-3 sm:p-4 md:p-5">
        {/* Delete Button - Top Right */}
        {onDelete && (
          <div className="absolute top-3 right-3 md:top-4 md:right-4 z-10">
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 md:h-12 md:w-12 text-destructive hover:text-destructive-foreground hover:bg-destructive bg-card/95 backdrop-blur-sm shadow-md border-2 border-border rounded-xl touch-feedback"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(story.id);
              }}
              aria-label={`Eliminar story ${story.tema || story.caption}`}
              title="Eliminar story"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>
        )}

        {/* Status Badge */}
        <div className="mb-2 sm:mb-3">
          <Badge 
            className={cn(
              "text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 font-medium rounded-lg",
              statusColors[story.status as keyof typeof statusColors] || statusColors.pending
            )}
          >
            {statusLabels[story.status as keyof typeof statusLabels] || statusLabels.pending}
          </Badge>
        </div>

        {/* Story Image - Responsive sizing */}
        <div className="relative aspect-[9/16] bg-muted rounded-lg sm:rounded-xl overflow-hidden mb-3 sm:mb-4 mx-auto max-w-[90%] sm:max-w-[85%] shadow-lg">
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

        {/* Footer with time and Review button */}
        <div className="flex items-center justify-between text-sm pt-3 border-t-2 border-border">
          <span className="text-muted-foreground text-xs sm:text-sm font-semibold">
            {formatDistanceToNow(new Date(story.created_at), { addSuffix: true, locale: pt })}
          </span>
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-1.5 -mr-2 h-11 px-4 text-sm font-bold group-hover:bg-primary group-hover:text-primary-foreground transition-all rounded-xl shadow-sm touch-feedback"
            aria-label={`Rever story ${story.tema || story.caption}`}
          >
            Rever
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
