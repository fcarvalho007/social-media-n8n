import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useMemo } from 'react';

interface Draft {
  id: string;
  user_id: string;
  platform: string;
  caption: string | null;
  media_urls: any;
  scheduled_date: string | null;
  scheduled_time: string | null;
  publish_immediately: boolean | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface UseDraftsOptions {
  search?: string;
  platform?: string;
  dateFilter?: 'all' | 'week' | 'month' | 'older';
  sortBy?: 'newest' | 'oldest' | 'platform-asc' | 'platform-desc';
}

export function useDrafts(options: UseDraftsOptions = {}) {
  const queryClient = useQueryClient();
  const { search = '', platform = 'all', dateFilter = 'all', sortBy = 'newest' } = options;

  const { data: drafts = [], isLoading, error } = useQuery({
    queryKey: ['drafts'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('posts_drafts')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'draft')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Draft[];
    },
  });

  // Apply filters and sorting client-side
  const filteredDrafts = useMemo(() => {
    let result = [...drafts];

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(draft => 
        draft.caption?.toLowerCase().includes(searchLower) ||
        draft.platform.toLowerCase().includes(searchLower)
      );
    }

    // Platform filter
    if (platform !== 'all') {
      result = result.filter(draft => draft.platform === platform);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      result = result.filter(draft => {
        const createdAt = new Date(draft.created_at);
        const diffDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
        
        switch (dateFilter) {
          case 'week':
            return diffDays <= 7;
          case 'month':
            return diffDays <= 30;
          case 'older':
            return diffDays > 30;
          default:
            return true;
        }
      });
    }

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'platform-asc':
          return a.platform.localeCompare(b.platform);
        case 'platform-desc':
          return b.platform.localeCompare(a.platform);
        default:
          return 0;
      }
    });

    return result;
  }, [drafts, search, platform, dateFilter, sortBy]);

  const deleteDraft = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('posts_drafts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drafts'] });
      toast.success('Rascunho eliminado');
    },
    onError: (error) => {
      console.error('Error deleting draft:', error);
      toast.error('Erro ao eliminar rascunho');
    },
  });

  const deleteManyDrafts = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('posts_drafts')
        .delete()
        .in('id', ids);

      if (error) throw error;
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ['drafts'] });
      toast.success(`${ids.length} rascunhos eliminados`);
    },
    onError: (error) => {
      console.error('Error deleting drafts:', error);
      toast.error('Erro ao eliminar rascunhos');
    },
  });

  // Get unique platforms for filter
  const availablePlatforms = useMemo(() => {
    const platforms = new Set(drafts.map(d => d.platform));
    return Array.from(platforms);
  }, [drafts]);

  return {
    drafts: filteredDrafts,
    allDrafts: drafts,
    isLoading,
    error,
    deleteDraft: deleteDraft.mutate,
    deleteManyDrafts: deleteManyDrafts.mutate,
    isDeleting: deleteDraft.isPending,
    isDeletingMany: deleteManyDrafts.isPending,
    availablePlatforms,
    totalCount: drafts.length,
    filteredCount: filteredDrafts.length,
  };
}
