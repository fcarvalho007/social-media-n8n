import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface QuotaUsage {
  used_count: number;
  limit_count: number;
  remaining: number;
}

export function useInstagramQuota() {
  const { user } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['instagram-quota', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .rpc('get_instagram_quota_usage', { p_user_id: user.id });

      if (error) throw error;
      
      return data?.[0] as QuotaUsage || { used_count: 0, limit_count: 5, remaining: 5 };
    },
    enabled: !!user?.id,
    refetchOnWindowFocus: true,
    staleTime: 30000, // 30 seconds
  });

  const canPublish = data ? data.remaining > 0 : false;
  const quotaText = data ? `${data.used_count}/${data.limit_count}` : '0/5';
  const percentage = data ? (data.used_count / data.limit_count) * 100 : 0;

  return {
    quota: data,
    canPublish,
    quotaText,
    percentage,
    isLoading,
    error,
    refetch,
  };
}
