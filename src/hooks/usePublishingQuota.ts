import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface QuotaUsage {
  used_count: number;
  limit_count: number;
  remaining: number;
}

export function usePublishingQuota() {
  const { user } = useAuth();

  // Query para Instagram
  const instagramQuery = useQuery({
    queryKey: ['publishing-quota-instagram', user?.id],
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

  // Query para LinkedIn
  const linkedinQuery = useQuery({
    queryKey: ['publishing-quota-linkedin', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .rpc('get_linkedin_quota_usage', { p_user_id: user.id });

      if (error) throw error;
      
      return data?.[0] as QuotaUsage || { used_count: 0, limit_count: 5, remaining: 5 };
    },
    enabled: !!user?.id,
    refetchOnWindowFocus: true,
    staleTime: 30000, // 30 seconds
  });

  return {
    instagram: {
      quota: instagramQuery.data,
      quotaText: instagramQuery.data ? `${instagramQuery.data.used_count}/${instagramQuery.data.limit_count}` : '0/5',
      canPublish: instagramQuery.data ? instagramQuery.data.remaining > 0 : false,
      isLoading: instagramQuery.isLoading,
      percentage: instagramQuery.data ? (instagramQuery.data.used_count / instagramQuery.data.limit_count) * 100 : 0,
    },
    linkedin: {
      quota: linkedinQuery.data,
      quotaText: linkedinQuery.data ? `${linkedinQuery.data.used_count}/${linkedinQuery.data.limit_count}` : '0/5',
      canPublish: linkedinQuery.data ? linkedinQuery.data.remaining > 0 : false,
      isLoading: linkedinQuery.isLoading,
      percentage: linkedinQuery.data ? (linkedinQuery.data.used_count / linkedinQuery.data.limit_count) * 100 : 0,
    },
    refetch: () => {
      instagramQuery.refetch();
      linkedinQuery.refetch();
    }
  };
}
