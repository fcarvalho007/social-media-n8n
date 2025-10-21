import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, Trash2, LayoutGrid, Image, Video } from 'lucide-react';
import { cn } from '@/lib/utils';

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
        "group cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] duration-200 relative",
        post.status === 'published' && "border-l-4 border-green-500"
      )} 
      onClick={onClick}
    >
      <CardContent className="p-4 sm:p-5">
        {/* Published Badge in top-right corner */}
        {post.status === 'published' && (
          <div className="absolute top-2 right-2 z-10">
            <Badge className="bg-green-600 text-white text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 flex items-center gap-0.5 sm:gap-1">
              ✓ Publicado
            </Badge>
          </div>
        )}
        {/* Content Type Badge */}
        <div className="mb-2 sm:mb-3 flex items-center gap-2">
          <Badge 
            variant="outline" 
            className={cn(
              "flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 font-medium border text-[10px] sm:text-xs",
              contentTypeConfig[contentType as keyof typeof contentTypeConfig].color
            )}
          >
            <ContentIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            {contentTypeConfig[contentType as keyof typeof contentTypeConfig].label}
          </Badge>
        </div>

        <div className="mb-2 sm:mb-3 flex items-start justify-between gap-2">
          <h3 className="font-semibold line-clamp-2 flex-1 text-sm sm:text-base">{post.tema}</h3>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Badge className={cn("text-[10px] sm:text-xs px-1.5 sm:px-2", statusColors[post.status as keyof typeof statusColors])}>
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
              >
                <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Image preview grid */}
        <div className="mb-3 sm:mb-4 grid grid-cols-2 gap-1.5 sm:gap-2 overflow-hidden rounded-lg">
          {previewImages.slice(0, 4).map((image, index) => (
            <div key={index} className="aspect-[4/5] overflow-hidden bg-muted rounded-md">
              <img
                src={image}
                alt={`Preview ${index + 1}`}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between text-xs sm:text-sm">
          <span className="text-muted-foreground text-[10px] sm:text-xs">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: pt })}
          </span>
          <Button variant="ghost" size="sm" className="gap-1 sm:gap-1.5 -mr-2 h-8 px-2 sm:px-3 text-xs sm:text-sm group-hover:bg-primary/10 group-hover:text-primary transition-colors">
            Rever
            <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>

        {post.selected_template && (
          <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-border">
            <span className="text-[10px] sm:text-xs text-muted-foreground">
              Modelo selecionado: <span className="font-semibold text-foreground">Template {post.selected_template}</span>
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
