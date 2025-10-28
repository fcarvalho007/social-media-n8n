import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface QuotaUsage {
  used_count: number;
  limit_count: number;
  remaining: number;
}

interface GetlateQuotaResponse {
  instagram: QuotaUsage;
  linkedin: QuotaUsage;
  planName: string;
  resetDate: string;
  isUnlimited: boolean;
}

export function usePublishingQuota() {
  const { user } = useAuth();

  // Query unificada que chama Getlate.dev
  const quotaQuery = useQuery({
    queryKey: ['getlate-quota', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      console.log('Fetching quota from Getlate.dev edge function...');
      
      const { data, error } = await supabase.functions.invoke<GetlateQuotaResponse>('get-getlate-quota');

      if (error) {
        console.error('Error fetching Getlate quota:', error);
        throw error;
      }
      
      console.log('Getlate quota received:', data);
      return data;
    },
    enabled: !!user?.id,
    refetchOnWindowFocus: true,
    refetchInterval: 60000, // Atualiza a cada 1 minuto
    staleTime: 30000, // Cache de 30 segundos
  });

  const formatQuotaText = (used: number, limit: number) => {
    if (limit === -1) return `${used}/∞`;
    return `${used}/${limit}`;
  };

  const calculatePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0; // Ilimitado = sem barra de progresso
    return limit > 0 ? (used / limit) * 100 : 0;
  };

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
    },
    planName: quotaQuery.data?.planName || 'Unknown',
    isUnlimited: quotaQuery.data?.isUnlimited || false,
    refetch: () => quotaQuery.refetch(),
  };
}
