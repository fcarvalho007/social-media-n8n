import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PendingCounts {
  stories: number;
  carousels: number;
  posts: number;
  total: number;
}

export function usePendingCounts() {
  const [counts, setCounts] = useState<PendingCounts>({
    stories: 0,
    carousels: 0,
    posts: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchCounts = async () => {
      try {
        setLoading(true);

        // Buscar stories pendentes
        const { count: storiesCount } = await supabase
          .from('stories')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        // Buscar carrosséis pendentes
        const { count: carouselsCount } = await supabase
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')
          .eq('content_type', 'carousel');

        // Buscar posts pendentes (não carrosséis)
        const { count: postsCount } = await supabase
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')
          .neq('content_type', 'carousel');

        if (mounted) {
          const stories = storiesCount || 0;
          const carousels = carouselsCount || 0;
          const posts = postsCount || 0;
          
          setCounts({
            stories,
            carousels,
            posts,
            total: stories + carousels + posts,
          });
        }
      } catch (error) {
        console.error('Error fetching pending counts:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchCounts();

    // Subscrever mudanças em tempo real
    const storiesChannel = supabase
      .channel('stories-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stories',
          filter: 'status=eq.pending',
        },
        () => fetchCounts()
      )
      .subscribe();

    const postsChannel = supabase
      .channel('posts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts',
          filter: 'status=eq.pending',
        },
        () => fetchCounts()
      )
      .subscribe();

    return () => {
      mounted = false;
      storiesChannel.unsubscribe();
      postsChannel.unsubscribe();
    };
  }, []);

  return { counts, loading };
}
