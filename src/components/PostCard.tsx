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
        "group cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden rounded-2xl border-2 border-border",
        post.status === 'published' && "border-l-4 border-l-success shadow-lg",
        "bg-card hover:bg-accent/5 animate-fade-in"
      )} 
      onClick={onClick}
    >
      <CardContent className="p-3 sm:p-4 md:p-5">
        {/* Delete Button - Top Right */}
        {onDelete && (
          <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 sm:h-9 sm:w-9 text-destructive hover:text-destructive-foreground hover:bg-destructive bg-card/95 backdrop-blur-sm touch-target shadow-md border border-border"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(post.id);
              }}
              aria-label={`Eliminar publicação ${post.tema}`}
              title="Eliminar publicação"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
        
        {/* Content Type Badge */}
        <div className="mb-2 sm:mb-3 flex items-center gap-2">
          <Badge 
            variant="outline" 
            className={cn(
              "flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 font-semibold border-2 text-[10px] sm:text-xs rounded-lg",
              contentTypeConfig[contentType as keyof typeof contentTypeConfig].color
            )}
          >
            <ContentIcon className="h-3 w-3 sm:h-4 sm:w-4" />
            {contentTypeConfig[contentType as keyof typeof contentTypeConfig].label}
          </Badge>
        </div>

        <div className="mb-2 sm:mb-3 flex items-start justify-between gap-2">
          <h3 className="font-bold line-clamp-2 flex-1 text-sm sm:text-base leading-tight pr-12">{post.tema}</h3>
          <Badge className={cn("text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 font-medium rounded-lg shrink-0", statusColors[post.status as keyof typeof statusColors])}>
            {statusLabels[post.status as keyof typeof statusLabels]}
          </Badge>
        </div>

        {/* Image preview grid */}
        <div className={cn(
          "mb-3 sm:mb-4 grid grid-cols-2 gap-1.5 sm:gap-2 overflow-hidden rounded-lg sm:rounded-xl relative",
          post.selected_template && (post.status === 'approved' || post.status === 'published') && "ring-2 ring-offset-2",
          post.selected_template === 'A' && (post.status === 'approved' || post.status === 'published') && "ring-[#00d4ff]",
          post.selected_template === 'B' && (post.status === 'approved' || post.status === 'published') && "ring-[#ff6347]"
        )}>
          {previewImages.slice(0, 4).map((image, index) => (
            <div key={index} className="aspect-[4/5] overflow-hidden bg-muted rounded-lg relative shadow-sm">
              {imageLoading[index] && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
              <img
                src={getOptimizedImageUrl(image, 400, 70)}
                alt={`Preview ${index + 1} - ${post.tema}`}
                className={cn(
                  "h-full w-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:brightness-110",
                  imageLoading[index] && "opacity-0"
                )}
                onLoad={() => setImageLoading(prev => ({ ...prev, [index]: false }))}
                onError={() => setImageLoading(prev => ({ ...prev, [index]: false }))}
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between text-sm border-t-2 border-border pt-3">
          <span className="text-muted-foreground text-[10px] sm:text-xs font-semibold">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: pt })}
          </span>
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-1 sm:gap-1.5 -mr-2 h-8 sm:h-9 px-3 sm:px-4 text-xs sm:text-sm font-bold group-hover:bg-primary group-hover:text-primary-foreground transition-all rounded-xl shadow-sm touch-target"
            aria-label={`Rever publicação ${post.tema}`}
          >
            Rever
            <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
