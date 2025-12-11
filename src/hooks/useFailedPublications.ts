import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FailedPublication {
  id: string;
  tema: string;
  caption: string;
  error_log: string | null;
  failed_at: string | null;
  status: string;
  post_type: string;
  selected_networks: string[];
  recovery_token: string;
  retry_count: number;
}

export const useFailedPublications = () => {
  const queryClient = useQueryClient();

  const { data: failedPosts = [], isLoading } = useQuery({
    queryKey: ['failed-publications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('id, tema, caption, error_log, failed_at, status, post_type, selected_networks, recovery_token, retry_count')
        .eq('status', 'failed')
        .order('failed_at', { ascending: false });

      if (error) throw error;
      return data as FailedPublication[];
    },
  });

  const retryPublication = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('posts')
        .update({ 
          status: 'approved',
          error_log: null,
          failed_at: null
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['failed-publications'] });
      toast.success('Publicação marcada para nova tentativa');
    },
    onError: () => {
      toast.error('Erro ao tentar novamente');
    },
  });

  const markAsResolved = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('posts')
        .update({ 
          status: 'published',
          published_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['failed-publications'] });
      toast.success('Publicação marcada como resolvida');
    },
    onError: () => {
      toast.error('Erro ao marcar como resolvida');
    },
  });

  const deletePublication = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['failed-publications'] });
      toast.success('Publicação eliminada');
    },
    onError: () => {
      toast.error('Erro ao eliminar');
    },
  });

  return {
    failedPosts,
    isLoading,
    failedCount: failedPosts.length,
    retryPublication,
    markAsResolved,
    deletePublication,
  };
};
