import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Post {
  id: string;
  tema: string;
  status: string;
  selected_template: string | null;
  created_at: string;
  template_a_images: string[];
  template_b_images: string[];
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

  // Get first 4 images from both templates for preview
  const previewImages = [
    ...post.template_a_images.slice(0, 2),
    ...post.template_b_images.slice(0, 2),
  ];

  return (
    <Card className="group cursor-pointer transition-all hover:shadow-lg" onClick={onClick}>
      <CardContent className="p-4">
        <div className="mb-3 flex items-start justify-between gap-2">
          <h3 className="font-semibold line-clamp-2 flex-1">{post.tema}</h3>
          <div className="flex items-center gap-2 shrink-0">
            <Badge className={cn(statusColors[post.status as keyof typeof statusColors])}>
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
        <div className="mb-3 grid grid-cols-2 gap-2 overflow-hidden rounded-lg">
          {previewImages.slice(0, 4).map((image, index) => (
            <div key={index} className="aspect-square overflow-hidden bg-muted">
              <img
                src={image}
                alt={`Preview ${index + 1}`}
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: pt })}
          </span>
          <Button variant="ghost" size="sm" className="gap-1">
            Rever
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {post.selected_template && (
          <div className="mt-2 pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground">
              Selecionado: <span className="font-medium text-foreground">Modelo {post.selected_template}</span>
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
