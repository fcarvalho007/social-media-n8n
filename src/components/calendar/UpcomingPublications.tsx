import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Clock, 
  Calendar, 
  X,
  Instagram,
  Linkedin,
  Video,
  LayoutGrid,
  Loader2,
  Pencil
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface UpcomingPost {
  id: string;
  tema: string;
  status: string;
  scheduled_date: string;
  selected_networks: string[] | null;
  template_a_images: string[];
  post_type: string | null;
}

interface UpcomingPublicationsProps {
  compact?: boolean;
}

export function UpcomingPublications({ compact = false }: UpcomingPublicationsProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch upcoming posts from posts table (next 24 hours)
  const { data: upcomingPosts = [], isLoading } = useQuery({
    queryKey: ['upcoming-posts-24h'],
    queryFn: async () => {
      const now = new Date();
      const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from('posts')
        .select('id, tema, status, scheduled_date, selected_networks, template_a_images, post_type')
        .in('status', ['scheduled', 'approved', 'pending'])
        .not('scheduled_date', 'is', null)
        .gte('scheduled_date', now.toISOString())
        .lte('scheduled_date', in24Hours.toISOString())
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      return data as UpcomingPost[];
    },
    refetchInterval: 60000, // Refetch every minute
  });

  // Cancel a post (update status to cancelled)
  const cancelPost = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from('posts')
        .update({ status: 'rejected' })
        .eq('id', postId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upcoming-posts-24h'] });
      queryClient.invalidateQueries({ queryKey: ['scheduled-jobs'] });
      toast.success('Agendamento cancelado');
    },
    onError: (error) => {
      toast.error('Erro ao cancelar agendamento');
      console.error(error);
    },
  });

  const handleEditPost = (postId: string) => {
    navigate(`/manual-create?recover=${postId}`);
  };

  if (isLoading) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (upcomingPosts.length === 0 && compact) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Upcoming Publications Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              Próximas 24 horas
            </span>
            <div className="flex items-center gap-2">
              {upcomingPosts.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {upcomingPosts.length}
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingPosts.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma publicação agendada</p>
            </div>
          ) : (
            <ScrollArea className={compact ? "max-h-40" : "max-h-64"}>
              <div className="space-y-2">
                {upcomingPosts.map((post) => {
                  const scheduledDate = new Date(post.scheduled_date);
                  const networks = post.selected_networks || [];
                  const isVideo = post.post_type?.includes('video') || post.post_type?.includes('reel');
                  
                  return (
                    <div 
                      key={post.id} 
                      className="flex items-center justify-between p-2 bg-muted/30 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                          {isVideo ? (
                            <Video className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          ) : (
                            <LayoutGrid className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {post.tema || 'Publicação'}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{format(scheduledDate, "HH:mm", { locale: pt })}</span>
                            <span>•</span>
                            <span>{formatDistanceToNow(scheduledDate, { locale: pt, addSuffix: true })}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {networks.includes('instagram') && (
                          <Instagram className="h-3.5 w-3.5 text-pink-500" />
                        )}
                        {networks.includes('linkedin') && (
                          <Linkedin className="h-3.5 w-3.5 text-sky-500" />
                        )}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-primary"
                                onClick={() => handleEditPost(post.id)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Editar</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => cancelPost.mutate(post.id)}
                                disabled={cancelPost.isPending}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Cancelar agendamento</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
