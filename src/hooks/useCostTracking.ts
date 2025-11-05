import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CostTracking {
  storiesCount: number;
  carouselsCount: number;
  postsCount: number;
  storiesCost: number;
  carouselsCost: number;
  postsCost: number;
  totalCost: number;
}

const STORY_COST = 0.02; // €0.02 por story
const CAROUSEL_COST = 0.08; // €0.08 por carrossel
const POST_COST = 0.00; // €0.00 por post (em desenvolvimento)

export function useCostTracking() {
  const [costs, setCosts] = useState<CostTracking>({
    storiesCount: 0,
    carouselsCount: 0,
    postsCount: 0,
    storiesCost: 0,
    carouselsCost: 0,
    postsCost: 0,
    totalCost: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchCosts = async () => {
      try {
        setLoading(true);

        // Contar TODOS os stories que entraram na plataforma (independentemente do status)
        const { count: storiesCount } = await supabase
          .from('stories')
          .select('*', { count: 'exact', head: true });

        // Contar TODOS os carrosséis que entraram na plataforma
        const { count: carouselsCount } = await supabase
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .eq('content_type', 'carousel');

        // Contar TODOS os posts (não carrosséis) que entraram na plataforma
        const { count: postsCount } = await supabase
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .neq('content_type', 'carousel');

        if (mounted) {
          const stories = storiesCount || 0;
          const carousels = carouselsCount || 0;
          const posts = postsCount || 0;

          const storiesCost = stories * STORY_COST;
          const carouselsCost = carousels * CAROUSEL_COST;
          const postsCost = posts * POST_COST;
          const totalCost = storiesCost + carouselsCost + postsCost;

          setCosts({
            storiesCount: stories,
            carouselsCount: carousels,
            postsCount: posts,
            storiesCost,
            carouselsCost,
            postsCost,
            totalCost,
          });
        }
      } catch (error) {
        console.error('Error fetching cost tracking:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchCosts();

    // Subscrever mudanças em tempo real - quando novos conteúdos são inseridos
    const storiesChannel = supabase
      .channel('stories-cost-tracking')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'stories',
        },
        () => fetchCosts()
      )
      .subscribe();

    const postsChannel = supabase
      .channel('posts-cost-tracking')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
        },
        () => fetchCosts()
      )
      .subscribe();

    return () => {
      mounted = false;
      storiesChannel.unsubscribe();
      postsChannel.unsubscribe();
    };
  }, []);

  return { costs, loading };
}
