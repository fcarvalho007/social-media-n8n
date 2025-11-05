import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

interface ScheduledCounts {
  today: number;
  thisWeek: number;
  thisMonth: number;
}

export function useScheduledCounts() {
  const [counts, setCounts] = useState<ScheduledCounts>({
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchCounts = async () => {
      try {
        setLoading(true);

        const now = new Date();
        const todayStart = startOfDay(now).toISOString();
        const todayEnd = endOfDay(now).toISOString();
        const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 }).toISOString();
        const monthStart = startOfMonth(now).toISOString();
        const monthEnd = endOfMonth(now).toISOString();

        // Posts agendados para hoje (aprovados)
        const { count: todayCount } = await supabase
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'approved')
          .not('scheduled_date', 'is', null)
          .gte('scheduled_date', todayStart)
          .lte('scheduled_date', todayEnd);

        // Posts agendados para esta semana
        const { count: weekCount } = await supabase
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'approved')
          .not('scheduled_date', 'is', null)
          .gte('scheduled_date', weekStart)
          .lte('scheduled_date', weekEnd);

        // Posts agendados para este mês
        const { count: monthCount } = await supabase
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'approved')
          .not('scheduled_date', 'is', null)
          .gte('scheduled_date', monthStart)
          .lte('scheduled_date', monthEnd);

        if (mounted) {
          setCounts({
            today: todayCount || 0,
            thisWeek: weekCount || 0,
            thisMonth: monthCount || 0,
          });
        }
      } catch (error) {
        console.error('Error fetching scheduled counts:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchCounts();

    // Subscrever mudanças em tempo real
    const postsChannel = supabase
      .channel('scheduled-posts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts',
        },
        () => fetchCounts()
      )
      .subscribe();

    return () => {
      mounted = false;
      postsChannel.unsubscribe();
    };
  }, []);

  return { counts, loading };
}
