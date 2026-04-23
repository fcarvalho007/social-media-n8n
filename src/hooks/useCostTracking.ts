import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CostTracking {
  // Totais históricos
  storiesCount: number;
  carouselsCount: number;
  postsCount: number;
  storiesCost: number;
  carouselsCost: number;
  postsCost: number;
  totalCost: number;
  // Mês actual
  storiesCountMonth: number;
  carouselsCountMonth: number;
  postsCountMonth: number;
  storiesCostMonth: number;
  carouselsCostMonth: number;
  postsCostMonth: number;
  totalCostMonth: number;
}

const STORY_COST = 0.02;
const CAROUSEL_COST = 0.08;
const POST_COST = 0.00;

const initialState: CostTracking = {
  storiesCount: 0,
  carouselsCount: 0,
  postsCount: 0,
  storiesCost: 0,
  carouselsCost: 0,
  postsCost: 0,
  totalCost: 0,
  storiesCountMonth: 0,
  carouselsCountMonth: 0,
  postsCountMonth: 0,
  storiesCostMonth: 0,
  carouselsCostMonth: 0,
  postsCostMonth: 0,
  totalCostMonth: 0,
};

export function useCostTracking() {
  const [costs, setCosts] = useState<CostTracking>(initialState);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchCosts = async () => {
      try {
        setLoading(true);

        // Início do mês actual (UTC)
        const now = new Date();
        const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

        // Totais históricos — em paralelo
        const [storiesTotalRes, carouselsTotalRes, postsTotalRes,
               storiesMonthRes, carouselsMonthRes, postsMonthRes] = await Promise.all([
          supabase.from('stories').select('*', { count: 'exact', head: true }),
          supabase.from('posts').select('*', { count: 'exact', head: true })
            .or('content_type.eq.carousel,content_type.is.null'),
          supabase.from('posts').select('*', { count: 'exact', head: true })
            .not('content_type', 'in', '(carousel)')
            .not('content_type', 'is', null),
          supabase.from('stories').select('*', { count: 'exact', head: true })
            .gte('created_at', startOfMonth),
          supabase.from('posts').select('*', { count: 'exact', head: true })
            .or('content_type.eq.carousel,content_type.is.null')
            .gte('created_at', startOfMonth),
          supabase.from('posts').select('*', { count: 'exact', head: true })
            .not('content_type', 'in', '(carousel)')
            .not('content_type', 'is', null)
            .gte('created_at', startOfMonth),
        ]);

        if (!mounted) return;

        const stories = storiesTotalRes.count || 0;
        const carousels = carouselsTotalRes.count || 0;
        const posts = postsTotalRes.count || 0;

        const storiesM = storiesMonthRes.count || 0;
        const carouselsM = carouselsMonthRes.count || 0;
        const postsM = postsMonthRes.count || 0;

        setCosts({
          storiesCount: stories,
          carouselsCount: carousels,
          postsCount: posts,
          storiesCost: stories * STORY_COST,
          carouselsCost: carousels * CAROUSEL_COST,
          postsCost: posts * POST_COST,
          totalCost: stories * STORY_COST + carousels * CAROUSEL_COST + posts * POST_COST,
          storiesCountMonth: storiesM,
          carouselsCountMonth: carouselsM,
          postsCountMonth: postsM,
          storiesCostMonth: storiesM * STORY_COST,
          carouselsCostMonth: carouselsM * CAROUSEL_COST,
          postsCostMonth: postsM * POST_COST,
          totalCostMonth: storiesM * STORY_COST + carouselsM * CAROUSEL_COST + postsM * POST_COST,
        });
      } catch (error) {
        console.error('Error fetching cost tracking:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchCosts();

    const storiesChannel = supabase
      .channel('stories-cost-tracking')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'stories' }, () => fetchCosts())
      .subscribe();

    const postsChannel = supabase
      .channel('posts-cost-tracking')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, () => fetchCosts())
      .subscribe();

    return () => {
      mounted = false;
      storiesChannel.unsubscribe();
      postsChannel.unsubscribe();
    };
  }, []);

  return { costs, loading };
}
