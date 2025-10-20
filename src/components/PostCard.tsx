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
  };

  const statusLabels = {
    pending: 'Pendente',
    approved: 'Aprovado',
    rejected: 'Rejeitado',
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
    <Card className="group cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] duration-200" onClick={onClick}>
      <CardContent className="p-5">
        {/* Content Type Badge */}
        <div className="mb-3 flex items-center gap-2">
          <Badge 
            variant="outline" 
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 font-medium border",
              contentTypeConfig[contentType as keyof typeof contentTypeConfig].color
            )}
          >
            <ContentIcon className="h-3.5 w-3.5" />
            {contentTypeConfig[contentType as keyof typeof contentTypeConfig].label}
          </Badge>
        </div>

        <div className="mb-3 flex items-start justify-between gap-2">
          <h3 className="font-semibold line-clamp-2 flex-1 text-base">{post.tema}</h3>
          <div className="flex items-center gap-2 shrink-0">
            <Badge className={cn("text-xs", statusColors[post.status as keyof typeof statusColors])}>
              {statusLabels[post.status as keyof typeof statusLabels]}
            </Badge>
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(post.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Image preview grid */}
        <div className="mb-4 grid grid-cols-2 gap-2 overflow-hidden rounded-lg">
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

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground text-xs">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: pt })}
          </span>
          <Button variant="ghost" size="sm" className="gap-1.5 -mr-2 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
            Rever
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>

        {post.selected_template && (
          <div className="mt-3 pt-3 border-t border-border">
            <span className="text-xs text-muted-foreground">
              Modelo selecionado: <span className="font-semibold text-foreground">Template {post.selected_template}</span>
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
