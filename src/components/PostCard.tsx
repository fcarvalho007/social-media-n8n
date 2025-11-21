import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, Trash2, LayoutGrid, Image, Video, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getOptimizedImageUrl } from '@/lib/imageOptimization';

interface Post {
  id: string;
  tema: string;
  status: string;
  selected_template: string | null;
  created_at: string;
  reviewed_at?: string | null;
  published_at?: string | null;
  template_a_images: string[];
  template_b_images: string[];
  content_type?: string;
}

interface PostCardProps {
  post: Post;
  onClick: () => void;
  onDelete?: (postId: string) => void;
}

export const PostCard = ({ post, onClick, onDelete }: PostCardProps) => {
  const [imageLoading, setImageLoading] = useState<Record<number, boolean>>({});
  
  const statusColors = {
    pending: 'bg-warning text-warning-foreground',
    approved: 'bg-success text-success-foreground',
    rejected: 'bg-destructive text-destructive-foreground',
    published: 'bg-green-600 text-white',
  };

  const statusLabels = {
    pending: 'Pendente',
    approved: 'Aprovado',
    rejected: 'Rejeitado',
    published: 'Publicado',
  };

  const contentTypeConfig = {
    carousel: { 
      label: 'Carrossel', 
      icon: LayoutGrid, 
      color: 'bg-accent/10 text-accent border-accent/30' 
    },
    stories: { 
      label: 'Stories', 
      icon: Video, 
      color: 'bg-warning/10 text-warning border-warning/30' 
    },
    post: { 
      label: 'Post', 
      icon: Image, 
      color: 'bg-success/10 text-success border-success/30' 
    },
  };

  const contentType = post.content_type || 'carousel';
  const ContentIcon = contentTypeConfig[contentType as keyof typeof contentTypeConfig].icon;

  // Template colors for badges
  const templateBadgeColors = {
    A: 'bg-gradient-to-r from-[#001f3f] to-[#003d7a] text-[#00d4ff] border-2 border-[#00d4ff] shadow-[0_0_20px_rgba(0,212,255,0.6)]',
    B: 'bg-gradient-to-r from-[#ff4500] to-[#ff6347] text-white border-2 border-[#ff6347] shadow-[0_0_20px_rgba(255,99,71,0.6)]',
  };

  // Get preview images - if template is selected, show only those images, otherwise show mixed
  const previewImages = post.selected_template
    ? (post.selected_template === 'A' ? post.template_a_images : post.template_b_images).slice(0, 4)
    : [
        ...post.template_a_images.slice(0, 2),
        ...post.template_b_images.slice(0, 2),
      ];

  return (
    <Card 
      className={cn(
        "w-full max-w-full mx-auto group cursor-pointer transition-all duration-300 md:hover:shadow-xl md:hover:scale-[1.02] active:scale-[0.98] touch-feedback relative overflow-hidden rounded-xl md:rounded-2xl border-2 border-border",
        post.status === 'published' && "border-l-4 border-l-success shadow-lg",
        "bg-card hover:bg-accent/5 animate-fade-in"
      )}
      onClick={onClick}
    >
      <CardContent className="p-2 sm:p-3 md:p-4">
        {/* Delete Button - Top Right */}
        {onDelete && (
          <div className="absolute top-4 right-4 z-10">
            <Button
              variant="ghost"
              size="icon"
              className="h-14 w-14 sm:h-14 sm:w-14 text-destructive hover:text-destructive-foreground hover:bg-destructive bg-card/95 backdrop-blur-sm shadow-lg border-2 border-border rounded-xl touch-feedback active:scale-95"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(post.id);
              }}
              aria-label={`Eliminar publicação ${post.tema}`}
              title="Eliminar publicação"
            >
              <Trash2 className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
          </div>
        )}
        
        {/* Content Type Badge */}
        <div className="mb-1.5 sm:mb-2 flex items-center gap-2">
          <Badge 
            variant="outline" 
            className={cn(
              "flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 font-semibold border text-[10px] sm:text-xs rounded-lg shadow-sm",
              contentTypeConfig[contentType as keyof typeof contentTypeConfig].color
            )}
          >
            <ContentIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            {contentTypeConfig[contentType as keyof typeof contentTypeConfig].label}
          </Badge>
        </div>

        <div className="mb-2 sm:mb-3 flex items-start justify-between gap-3">
          <h3 className="font-bold line-clamp-2 flex-1 text-sm sm:text-base leading-tight pr-12">{post.tema}</h3>
          <Badge className={cn("text-xs px-2.5 sm:px-3 py-1 sm:py-1.5 font-semibold rounded-lg shrink-0 shadow-sm", statusColors[post.status as keyof typeof statusColors])}>
            {statusLabels[post.status as keyof typeof statusLabels]}
          </Badge>
        </div>

        {/* Image preview grid */}
        <div className={cn(
          "mb-2 sm:mb-3 grid grid-cols-2 gap-1 sm:gap-1.5 overflow-hidden rounded-xl relative",
          post.selected_template && (post.status === 'approved' || post.status === 'published') && "ring-2 ring-offset-1",
          post.selected_template === 'A' && (post.status === 'approved' || post.status === 'published') && "ring-[#00d4ff]",
          post.selected_template === 'B' && (post.status === 'approved' || post.status === 'published') && "ring-[#ff6347]"
        )}>
          {previewImages.slice(0, 4).map((image, index) => (
            <div key={index} className="aspect-square sm:aspect-[5/4] overflow-hidden bg-muted rounded-lg relative shadow-md">
              {imageLoading[index] && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}
              <img
                src={getOptimizedImageUrl(image, 400, 70)}
                alt={`Preview ${index + 1} - ${post.tema}`}
                className={cn(
                  "h-full w-full object-cover transition-all duration-500 md:group-hover:scale-105 md:group-hover:brightness-110",
                  imageLoading[index] && "opacity-0"
                )}
                onLoad={() => setImageLoading(prev => ({ ...prev, [index]: false }))}
                onError={() => setImageLoading(prev => ({ ...prev, [index]: false }))}
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 sm:gap-3 border-t-2 border-border pt-2 sm:pt-3">
          <span className="text-muted-foreground text-xs sm:text-sm font-semibold truncate">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: pt })}
          </span>
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-1.5 sm:gap-2 h-11 sm:h-12 px-4 sm:px-5 text-sm sm:text-base font-bold group-hover:bg-primary group-hover:text-primary-foreground transition-all rounded-xl shadow-sm touch-feedback active:scale-95 shrink-0"
            aria-label={`Rever publicação ${post.tema}`}
          >
            Rever
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
