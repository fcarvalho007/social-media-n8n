import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState, useCallback } from 'react';

interface QuotaUsage {
  used_count: number;
  limit_count: number;
  remaining: number;
  monthly_used?: number;
  monthly_limit?: number;
}

interface AccountInfo {
  id: string;
  platform: string;
  username: string;
  displayName?: string;
  profilePicture?: string;
  isActive: boolean;
}

interface AccountBreakdown {
  accountId: string;
  platform: string;
  username: string;
  postsToday: number;
}

interface GetlateQuotaResponse {
  instagram: QuotaUsage;
  linkedin: QuotaUsage;
  accounts: AccountInfo[];
  accountBreakdown: AccountBreakdown[];
  planName: string;
  resetDate: string;
  isUnlimited: boolean;
  dailyLimit: number;
  lastUpdated: string;
  warning?: string;
}

export function usePublishingQuota() {
  const [userId, setUserId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
    });
  }, []);

  const quotaQuery = useQuery({
    queryKey: ['publishing-quota', userId],
    queryFn: async () => {
      if (!userId) return null;

      // ALWAYS fetch from Getlate.dev - this is the source of truth
      console.log('[Quota] Fetching real-time data from Getlate.dev...');
      
      const { data, error } = await supabase.functions.invoke<GetlateQuotaResponse>('get-getlate-quota');

      if (error) {
        console.error('[Quota] Getlate error:', error);
        throw error;
      }
      
      console.log('[Quota] Received from Getlate:', data);
      
      if (data?.warning) {
        console.warn('[Quota] API warning:', data.warning);
      }
      
      return data;
    },
    enabled: !!userId,
    refetchOnWindowFocus: true,
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
    staleTime: 60 * 1000, // Consider stale after 1 minute
  });

  const formatQuotaText = (used: number, limit: number) => {
    if (limit === -1) return `${used}/∞`;
    return `${used}/${limit}`;
  };

  const calculatePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0;
    return limit > 0 ? (used / limit) * 100 : 0;
  };

  const getQuotaStatus = (used: number, limit: number): 'ok' | 'warning' | 'danger' => {
    if (limit === -1) return 'ok';
    const percentage = (used / limit) * 100;
    if (percentage >= 100) return 'danger';
    if (percentage >= 80) return 'warning';
    return 'ok';
  };

  // Check if can publish to a specific platform
  const canPublish = useCallback((platform: 'instagram' | 'linkedin'): boolean => {
    if (!quotaQuery.data) return false;
    const quota = platform === 'instagram' ? quotaQuery.data.instagram : quotaQuery.data.linkedin;
    if (!quota) return false;
    if (quota.limit_count === -1) return true; // Unlimited
    return quota.remaining > 0;
  }, [quotaQuery.data]);

  // Manual refresh function
  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['publishing-quota', userId] });
  }, [queryClient, userId]);

  const defaultQuota: QuotaUsage = { used_count: 0, limit_count: 5, remaining: 5 };

  return {
    instagram: {
      quota: quotaQuery.data?.instagram || defaultQuota,
      quotaText: quotaQuery.data?.instagram 
        ? formatQuotaText(quotaQuery.data.instagram.used_count, quotaQuery.data.instagram.limit_count)
        : '0/5',
      canPublish: quotaQuery.data?.instagram 
        ? (quotaQuery.data.instagram.limit_count === -1 || quotaQuery.data.instagram.remaining > 0)
        : false,
      isLoading: quotaQuery.isLoading,
      percentage: quotaQuery.data?.instagram 
        ? calculatePercentage(quotaQuery.data.instagram.used_count, quotaQuery.data.instagram.limit_count)
        : 0,
      status: quotaQuery.data?.instagram
        ? getQuotaStatus(quotaQuery.data.instagram.used_count, quotaQuery.data.instagram.limit_count)
        : 'ok',
    },
    linkedin: {
      quota: quotaQuery.data?.linkedin || defaultQuota,
      quotaText: quotaQuery.data?.linkedin 
        ? formatQuotaText(quotaQuery.data.linkedin.used_count, quotaQuery.data.linkedin.limit_count)
        : '0/5',
      canPublish: quotaQuery.data?.linkedin 
        ? (quotaQuery.data.linkedin.limit_count === -1 || quotaQuery.data.linkedin.remaining > 0)
        : false,
      isLoading: quotaQuery.isLoading,
      percentage: quotaQuery.data?.linkedin 
        ? calculatePercentage(quotaQuery.data.linkedin.used_count, quotaQuery.data.linkedin.limit_count)
        : 0,
      status: quotaQuery.data?.linkedin
        ? getQuotaStatus(quotaQuery.data.linkedin.used_count, quotaQuery.data.linkedin.limit_count)
        : 'ok',
    },
    accounts: quotaQuery.data?.accounts || [],
    accountBreakdown: quotaQuery.data?.accountBreakdown || [],
    planName: quotaQuery.data?.planName || 'Unknown',
    isUnlimited: quotaQuery.data?.isUnlimited || false,
    dailyLimit: quotaQuery.data?.dailyLimit || 5,
    lastUpdated: quotaQuery.data?.lastUpdated ? new Date(quotaQuery.data.lastUpdated) : null,
    isLoading: quotaQuery.isLoading,
    isRefreshing: quotaQuery.isFetching && !quotaQuery.isLoading,
    error: quotaQuery.error?.message || null,
    canPublish,
    refresh,
    refetch: () => quotaQuery.refetch(),
  };
}
