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
      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' 
    },
    stories: { 
      label: 'Stories', 
      icon: Video, 
      color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' 
    },
    post: { 
      label: 'Post', 
      icon: Image, 
      color: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' 
    },
  };

  const contentType = post.content_type || 'carousel';
  const ContentIcon = contentTypeConfig[contentType as keyof typeof contentTypeConfig].icon;

  // Get first 4 images from both templates for preview
  const previewImages = [
    ...post.template_a_images.slice(0, 2),
    ...post.template_b_images.slice(0, 2),
  ];

  return (
    <Card 
      className={cn(
        "group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] relative overflow-hidden rounded-2xl border-2",
        post.status === 'published' && "border-l-4 border-l-success glow-success",
        "bg-card hover:bg-card-hover animate-fade-in"
      )} 
      onClick={onClick}
    >
      <CardContent className="p-5">
        {/* Published Badge in top-right corner */}
        {post.status === 'published' && (
          <div className="absolute top-3 right-3 z-10">
            <Badge className="bg-success text-success-foreground text-xs px-2.5 py-1 flex items-center gap-1 shadow-lg">
              ✓ Publicado
            </Badge>
          </div>
        )}
        
        {/* Content Type Badge */}
        <div className="mb-3 flex items-center gap-2">
          <Badge 
            variant="outline" 
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 font-semibold border-2 text-xs rounded-lg",
              contentTypeConfig[contentType as keyof typeof contentTypeConfig].color
            )}
          >
            <ContentIcon className="h-4 w-4" />
            {contentTypeConfig[contentType as keyof typeof contentTypeConfig].label}
          </Badge>
        </div>

        <div className="mb-3 flex items-start justify-between gap-2">
          <h3 className="font-bold line-clamp-2 flex-1 text-base leading-tight">{post.tema}</h3>
          <div className="flex items-center gap-2 shrink-0">
            <Badge className={cn("text-xs px-2.5 py-1 font-medium rounded-lg", statusColors[post.status as keyof typeof statusColors])}>
              {statusLabels[post.status as keyof typeof statusLabels]}
            </Badge>
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 sm:h-8 sm:w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(post.id);
                }}
                aria-label={`Eliminar publicação ${post.tema}`}
                title="Eliminar publicação"
              >
                <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Image preview grid */}
        <div className="mb-4 grid grid-cols-2 gap-2 overflow-hidden rounded-xl">
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

        <div className="flex items-center justify-between text-sm border-t border-border/50 pt-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-muted-foreground text-xs font-medium">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: pt })}
            </span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-1.5 -mr-2 h-9 px-3 text-sm font-medium group-hover:bg-primary group-hover:text-primary-foreground transition-all rounded-lg shadow-sm"
            aria-label={`Rever publicação ${post.tema}`}
          >
            Rever
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>

        {post.selected_template && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <span className="text-xs text-muted-foreground font-medium">
              Modelo: <span className="font-bold text-foreground">Template {post.selected_template}</span>
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
