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
    refetchInterval: 3 * 60 * 1000, // Auto-refresh every 3 minutes
    staleTime: 30 * 1000, // Consider stale after 30 seconds
  });

  const formatQuotaText = (used: number, limit: number) => {
    // Daily limit is always 5, never unlimited
    const effectiveLimit = limit <= 0 ? 5 : limit;
    return `${used}/${effectiveLimit}`;
  };

  const calculatePercentage = (used: number, limit: number) => {
    const effectiveLimit = limit <= 0 ? 5 : limit;
    return (used / effectiveLimit) * 100;
  };

  const getQuotaStatus = (used: number, limit: number): 'ok' | 'warning' | 'danger' => {
    const effectiveLimit = limit <= 0 ? 5 : limit;
    const percentage = (used / effectiveLimit) * 100;
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

  // isReady = true when we have confirmed data loaded
  const isReady = !!userId && !quotaQuery.isLoading && !!quotaQuery.data;

  return {
    instagram: {
      quota: quotaQuery.data?.instagram || defaultQuota,
      quotaText: quotaQuery.data?.instagram 
        ? formatQuotaText(quotaQuery.data.instagram.used_count, quotaQuery.data.instagram.limit_count)
        : '0/5',
      // Optimistic: allow publishing while loading, no userId, or no data yet
      // Only block when we have CONFIRMED data showing remaining === 0
      canPublish: !userId 
        ? true  // No userId yet, don't block
        : quotaQuery.isLoading 
          ? true  // Loading, don't block
          : quotaQuery.data?.instagram 
            ? (quotaQuery.data.instagram.limit_count === -1 || quotaQuery.data.instagram.remaining > 0)
            : true,  // No data, don't block (optimistic fallback)
      isLoading: quotaQuery.isLoading,
      isReady,
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
      // Optimistic: allow publishing while loading, no userId, or no data yet
      canPublish: !userId 
        ? true
        : quotaQuery.isLoading 
          ? true
          : quotaQuery.data?.linkedin 
            ? (quotaQuery.data.linkedin.limit_count === -1 || quotaQuery.data.linkedin.remaining > 0)
            : true,
      isLoading: quotaQuery.isLoading,
      isReady,
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
    isReady,
    isRefreshing: quotaQuery.isFetching && !quotaQuery.isLoading,
    error: quotaQuery.error?.message || null,
    canPublish,
    refresh,
    refetch: () => quotaQuery.refetch(),
  };
}
