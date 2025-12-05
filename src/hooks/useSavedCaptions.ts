import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SavedCaption {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category: string | null;
  created_at: string;
  updated_at: string;
}

export function useSavedCaptions() {
  const queryClient = useQueryClient();

  const { data: captions = [], isLoading, error } = useQuery({
    queryKey: ['saved-captions'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('saved_captions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SavedCaption[];
    },
  });

  const saveCaption = useMutation({
    mutationFn: async ({ title, content, category }: { title: string; content: string; category?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { data, error } = await supabase
        .from('saved_captions')
        .insert({
          user_id: user.id,
          title,
          content,
          category: category || 'geral',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-captions'] });
      toast.success('Legenda guardada com sucesso');
    },
    onError: (error) => {
      console.error('Error saving caption:', error);
      toast.error('Erro ao guardar legenda');
    },
  });

  const deleteCaption = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('saved_captions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-captions'] });
      toast.success('Legenda eliminada');
    },
    onError: (error) => {
      console.error('Error deleting caption:', error);
      toast.error('Erro ao eliminar legenda');
    },
  });

  return {
    captions,
    isLoading,
    error,
    saveCaption: saveCaption.mutate,
    isSaving: saveCaption.isPending,
    deleteCaption: deleteCaption.mutate,
    isDeleting: deleteCaption.isPending,
  };
}
